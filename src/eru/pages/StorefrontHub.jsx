import { useState, useEffect } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';
import {
  Store, Plus, Plug, AlertCircle, CheckCircle2,
  Clock, XCircle, Search, Gem, Image, Bot, Sword, Package,
  Globe, ChevronRight, WifiOff, Loader2,
  ToggleLeft, ToggleRight, Edit2, Trash2, Shield, Activity,
  Square, CheckSquare, Send, BarChart2, SlidersHorizontal, Zap,
  Pause, Play
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ListingEditor from '../components/storefront/ListingEditor';
import ConditionBadge from '../components/storefront/ConditionBadge';
import { Flame, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { canManageMarketplaceConfig } from '@/eru/lib/permissions';
import { validateListingDraft, validateListingEdit } from '@/eru/lib/marketplaceValidation';
import { logAuditEvent } from '@/eru/lib/auditEvents';
import PermissionGate from '@/eru/components/PermissionGate';

// ─── CONNECTOR PRESETS (templates for adding new connectors) ──────────────────
const CONNECTOR_TEMPLATES = [
  { name: 'OpenSea-style NFT Market', connector_type: 'nft_marketplace', icon: '🖼️', desc: 'ERC-721/1155 NFT marketplace adapter' },
  { name: 'Crypto Asset Exchange', connector_type: 'crypto_exchange', icon: '₿', desc: 'Token & crypto asset trading layer' },
  { name: 'Game Item Marketplace', connector_type: 'game_items', icon: '⚔️', desc: 'In-game items & cards trading platform' },
  { name: 'Digital Goods Market', connector_type: 'digital_goods', icon: '📦', desc: 'Generic digital product marketplace' },
  { name: 'Custom API Connector', connector_type: 'custom_api', icon: '🔌', desc: 'Build a custom marketplace integration' },
];

const ASSET_ICONS = { jade: Gem, nft: Image, bot: Bot, card: Sword, item: Package, collectible: Package };
const ASSET_COLORS = { jade: 'text-green-400', nft: 'text-purple-400', bot: 'text-blue-400', card: 'text-orange-400', item: 'text-yellow-400', collectible: 'text-pink-400' };

const STATUS_CONFIG = {
  active:       { icon: CheckCircle2, color: 'text-green-400',  bg: 'bg-green-500/10',  label: 'Active' },
  inactive:     { icon: XCircle,      color: 'text-muted-foreground', bg: 'bg-secondary', label: 'Inactive' },
  error:        { icon: AlertCircle,  color: 'text-red-400',    bg: 'bg-red-500/10',    label: 'Error' },
  pending_auth: { icon: Clock,        color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Auth Needed' },
};

const SYNC_CONFIG = {
  synced:        { icon: CheckCircle2, color: 'text-green-400',  label: 'Synced' },
  pending:       { icon: Clock,        color: 'text-yellow-400', label: 'Pending' },
  failed:        { icon: AlertCircle,  color: 'text-red-400',    label: 'Failed' },
  not_connected: { icon: WifiOff,      color: 'text-muted-foreground', label: 'Not Connected' },
};

// ─── SUBCOMPONENTS ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-2.5 h-2.5" /> {cfg.label}
    </span>
  );
}

function SyncBadge({ status }) {
  const cfg = SYNC_CONFIG[status] || SYNC_CONFIG.not_connected;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${cfg.color}`}>
      <Icon className="w-2.5 h-2.5" /> {cfg.label}
    </span>
  );
}

function ConnectorCard({ connector, onToggle, onEdit, onDelete, isAdmin }) {
  const sc = STATUS_CONFIG[connector.status] || STATUS_CONFIG.inactive;
  const Icon = sc.icon;
  return (
    <div className={`rounded-xl border p-4 transition-all ${connector.is_enabled ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <Plug className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{connector.name}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{connector.connector_type?.replace('_', ' ')}</p>
          </div>
        </div>
        <StatusBadge status={connector.status} />
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {(connector.supported_asset_types || []).map(t => {
          const AIcon = ASSET_ICONS[t] || Package;
          return (
            <span key={t} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-secondary text-[9px] ${ASSET_COLORS[t]}`}>
              <AIcon className="w-2.5 h-2.5" /> {t}
            </span>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-3">
        <span>Last sync: {connector.last_sync_at ? new Date(connector.last_sync_at).toLocaleDateString() : 'Never'}</span>
        <span>{connector.total_listings_synced || 0} listings synced</span>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <button onClick={() => onToggle(connector)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-1 justify-center ${connector.is_enabled ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
            {connector.is_enabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
            {connector.is_enabled ? 'Enabled' : 'Disabled'}
          </button>
          <button onClick={() => onEdit(connector)} className="p-1.5 rounded-lg bg-secondary hover:bg-border transition-colors">
            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => onDelete(connector)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      )}
    </div>
  );
}

function ListingCard({ listing, connectors, onEdit, onSyndicationEdit, selected, onSelect, onRunSync, onTogglePause, onDelete }) {
  const AssetIcon = ASSET_ICONS[listing.asset_type] || Package;
  const syncs = listing.external_syndications || [];
  const syncedCount = syncs.filter(s => s.sync_status === 'synced').length;
  const failedCount = syncs.filter(s => s.sync_status === 'failed').length;

  return (
    <div
      className={`rounded-xl border bg-card p-4 space-y-3 transition-colors ${selected ? 'border-primary bg-primary/5' : 'border-border'}`}
      onClick={() => onSelect && onSelect(listing.id)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {onSelect && (
          <div className="mr-1 flex-shrink-0">
            {selected
              ? <CheckSquare className="w-4 h-4 text-primary" />
              : <Square className="w-4 h-4 text-muted-foreground" />}
          </div>
        )}
        <AssetIcon className={`w-4 h-4 ${ASSET_COLORS[listing.asset_type]}`} />
          <div>
            <p className="text-sm font-medium">{listing.title}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{listing.asset_type}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono text-primary">{listing.base_price} {listing.currency}</p>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
            listing.status === 'active' ? 'bg-green-500/10 text-green-400' :
            listing.status === 'error' ? 'bg-red-500/10 text-red-400' :
            'bg-secondary text-muted-foreground'
          }`}>{listing.status}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[10px]">
        {listing.sale_mode && <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{listing.sale_mode.replaceAll('_', ' ')}</span>}
        {!!listing.condition_score && <ConditionBadge score={listing.condition_score} />}
        {!!listing.ask_price_fiat && <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{listing.ask_price_fiat} {listing.fiat_currency || 'USD'}</span>}
        {!!listing.crypto_value && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{listing.crypto_value} {listing.crypto_currency || listing.currency}</span>}
      </div>

      {/* Syndication status row */}
      <div className="flex items-center gap-2 text-[10px]">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Globe className="w-3 h-3" />
          <span>Internal</span>
          {listing.internal_listed
            ? <CheckCircle2 className="w-3 h-3 text-green-400" />
            : <XCircle className="w-3 h-3 text-muted-foreground" />}
        </div>
        {syncs.length > 0 && (
          <div className="flex items-center gap-1 ml-auto">
            {syncedCount > 0 && <span className="text-green-400">{syncedCount} synced</span>}
            {failedCount > 0 && <span className="text-red-400">{failedCount} failed</span>}
            {syncs.length - syncedCount - failedCount > 0 && (
              <span className="text-muted-foreground">{syncs.length - syncedCount - failedCount} pending</span>
            )}
          </div>
        )}
      </div>

      {syncs.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-border">
          {syncs.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-[10px]">
              <div>
                <span className="text-muted-foreground">{s.connector_name}</span>
                {typeof s.effective_price === 'number' && <p className="text-[9px] text-muted-foreground">Effective price: {s.effective_price}</p>}
              </div>
              <div className="flex items-center gap-2">
                {s.custom_price && <span className="text-foreground font-mono">{s.custom_price}</span>}
                <SyncBadge status={s.sync_status} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-5 gap-2 pt-2 border-t border-border">
        <button onClick={(e) => { e.stopPropagation(); onRunSync(listing.id); }} className="rounded-lg bg-primary/10 px-2 py-2 text-[10px] font-medium text-primary flex items-center justify-center gap-1">
          <Zap className="w-3 h-3" /> Sync
        </button>
        <button onClick={(e) => { e.stopPropagation(); onSyndicationEdit(listing); }} className="rounded-lg bg-secondary px-2 py-2 text-[10px] font-medium text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
          <SlidersHorizontal className="w-3 h-3" /> Syndicate
        </button>
        <button onClick={(e) => { e.stopPropagation(); onEdit(listing); }} className="rounded-lg bg-secondary px-2 py-2 text-[10px] font-medium text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
          <Edit2 className="w-3 h-3" /> Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePause && onTogglePause(listing); }}
          className="rounded-lg bg-secondary px-2 py-2 text-[10px] font-medium text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
          title={listing.status === 'active' ? 'Pause (unpublish)' : 'Activate (publish)'}
        >
          {listing.status === 'active'
            ? <><Pause className="w-3 h-3" /> Pause</>
            : <><Play className="w-3 h-3" /> Publish</>}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete && onDelete(listing); }}
          className="rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-2 text-[10px] font-medium flex items-center justify-center gap-1"
          title="Delete listing"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>
    </div>
  );
}

// ─── ADD CONNECTOR MODAL ──────────────────────────────────────────────────────
function AddConnectorModal({ onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', connector_type: '', api_endpoint: '', api_key_ref: '',
    auth_type: 'api_key', supported_asset_types: [], is_enabled: false,
    read_only_fallback: true, sync_frequency_minutes: 60,
    capabilities: ['read'], status: 'inactive'
  });
  const [saving, setSaving] = useState(false);

  const toggleAsset = (t) => setForm(f => ({
    ...f,
    supported_asset_types: f.supported_asset_types.includes(t)
      ? f.supported_asset_types.filter(x => x !== t)
      : [...f.supported_asset_types, t]
  }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-md bg-card rounded-t-2xl border-t border-border p-5 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Add Marketplace Connector</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XCircle className="w-5 h-5" /></button>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Choose a connector template:</p>
            {CONNECTOR_TEMPLATES.map(t => (
              <button key={t.connector_type}
                onClick={() => { setForm(f => ({ ...f, name: t.name, connector_type: t.connector_type })); setStep(2); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary hover:border-primary/30 transition-all text-left">
                <span className="text-xl">{t.icon}</span>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Connector Name</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">API Endpoint (optional)</label>
              <input value={form.api_endpoint} onChange={e => setForm(f => ({...f, api_endpoint: e.target.value}))}
                placeholder="https://api.marketplace.com/v1"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50 font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">API Key Label (reference only — never stored raw)</label>
              <input value={form.api_key_ref} onChange={e => setForm(f => ({...f, api_key_ref: e.target.value}))}
                placeholder="e.g. OPENSEA_API_KEY"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50 font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Default price rule</label>
                <select value={form.price_adjustment_type || 'none'} onChange={e => setForm(f => ({...f, price_adjustment_type: e.target.value}))}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50">
                  <option value="none">No adjustment</option>
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Default amount</label>
                <input type="number" value={form.price_adjustment_value || 0} onChange={e => setForm(f => ({...f, price_adjustment_value: Number(e.target.value || 0)}))}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary rounded-xl border border-border">
              <div>
                <p className="text-xs font-medium">Auto publish</p>
                <p className="text-[10px] text-muted-foreground">Automatically add active listings to this connector</p>
              </div>
              <button onClick={() => setForm(f => ({...f, auto_publish: !f.auto_publish}))}
                className={`w-9 h-5 rounded-full relative transition-colors ${form.auto_publish ? 'bg-primary' : 'bg-border'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.auto_publish ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary rounded-xl border border-border">
              <div>
                <p className="text-xs font-medium">Simulation mode</p>
                <p className="text-[10px] text-muted-foreground">Use safe simulated syncs until live API wiring is ready</p>
              </div>
              <button onClick={() => setForm(f => ({...f, simulation_mode: !f.simulation_mode}))}
                className={`w-9 h-5 rounded-full relative transition-colors ${form.simulation_mode ? 'bg-primary' : 'bg-border'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.simulation_mode ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Supported Asset Types</label>
              <div className="flex flex-wrap gap-2">
                {['jade','nft','bot','card','item','collectible'].map(t => {
                  const AIcon = ASSET_ICONS[t];
                  const selected = form.supported_asset_types.includes(t);
                  return (
                    <button key={t} onClick={() => toggleAsset(t)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors ${selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                      <AIcon className="w-3 h-3" /> {t}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary rounded-xl border border-border">
              <div>
                <p className="text-xs font-medium">Read-Only Fallback</p>
                <p className="text-[10px] text-muted-foreground">Use read-only mode if write access fails</p>
              </div>
              <button onClick={() => setForm(f => ({...f, read_only_fallback: !f.read_only_fallback}))}
                className={`w-9 h-5 rounded-full relative transition-colors ${form.read_only_fallback ? 'bg-primary' : 'bg-border'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.read_only_fallback ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setStep(1)} className="flex-1 py-2.5 text-sm bg-secondary rounded-xl">Back</button>
              <button onClick={handleSave} disabled={!form.name || saving}
                className="flex-1 py-2.5 text-sm bg-primary text-primary-foreground rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Connector
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CREATE LISTING MODAL ─────────────────────────────────────────────────────
function SyndicationModal({ listing, connectors, onClose, onSave }) {
  const [items, setItems] = useState(() => {
    const existing = Array.isArray(listing?.external_syndications) ? listing.external_syndications : [];
    return connectors.map((connector) => {
      const match = existing.find((item) => item.connector_id === connector.id);
      return match || {
        connector_id: connector.id,
        connector_name: connector.name,
        enabled: false,
        custom_price: '',
        external_listing_id: '',
        sync_status: connector.is_enabled ? 'pending' : 'not_connected',
        last_synced_at: '',
        error_message: '',
        price_adjustment_type: connector.price_adjustment_type || 'none',
        price_adjustment_value: Number(connector.price_adjustment_value || 0),
        effective_price: Number(listing?.base_price || 0),
        last_sync_note: '',
      };
    });
  });

  const updateItem = (connectorId, key, value) => {
    setItems((prev) => prev.map((item) => item.connector_id === connectorId ? { ...item, [key]: value } : item));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-md bg-card rounded-t-2xl border-t border-border p-5 space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Syndication Settings</h3>
          <button onClick={onClose}><XCircle className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <p className="text-xs text-muted-foreground">Choose where this listing publishes and how each marketplace price should be adjusted.</p>
        <div className="space-y-3">
          {connectors.map((connector) => {
            const item = items.find((entry) => entry.connector_id === connector.id);
            if (!item) return null;
            return (
              <div key={connector.id} className="rounded-xl border border-border bg-secondary/30 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{connector.name}</p>
                    <p className="text-[10px] text-muted-foreground">{connector.is_enabled ? 'Ready to sync' : 'Connector disabled'}</p>
                  </div>
                  <button onClick={() => updateItem(connector.id, 'enabled', !item.enabled)} className={`w-10 h-6 rounded-full relative transition-colors ${item.enabled ? 'bg-primary' : 'bg-border'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${item.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={item.price_adjustment_type || 'none'} onChange={(e) => updateItem(connector.id, 'price_adjustment_type', e.target.value)} className="bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none">
                    <option value="none">No adjustment</option>
                    <option value="percent">Percent</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                  <input type="number" value={item.price_adjustment_value ?? 0} onChange={(e) => updateItem(connector.id, 'price_adjustment_value', Number(e.target.value || 0))} placeholder="Adjustment" className="bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none" />
                </div>
                <input type="number" value={item.custom_price ?? ''} onChange={(e) => updateItem(connector.id, 'custom_price', e.target.value === '' ? '' : Number(e.target.value))} placeholder="Optional custom base price" className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none" />
              </div>
            );
          })}
        </div>
        <button onClick={() => onSave(items)} className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold">Save syndication</button>
      </div>
    </div>
  );
}

function CreateListingModal({ connectors, onClose, onSave }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-md bg-card rounded-t-2xl border-t border-border p-5 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Create Storefront Listing</h3>
          <button onClick={onClose}><XCircle className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <ListingEditor initialValue={{ asset_type: 'collectible', sale_mode: 'sell_or_trade' }} onSave={async (data) => {
          await onSave({
            ...data,
            asset_id: 'manual',
            internal_listed: true,
            status: 'draft',
            region_availability: ['global'],
            currency: data.crypto_currency,
            asset_snapshot: {
              title: data.title,
              type: data.asset_type,
              image_url: data.media_urls?.[0] || '',
            },
          });
        }} submitLabel="Publish Listing" />
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'storefront', label: 'Storefront', Icon: Store },
  { id: 'connectors', label: 'Connectors', Icon: Plug },
  { id: 'admin',      label: 'Admin',      Icon: Shield },
];

export default function StorefrontHub() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [tab, setTab] = useState('storefront');
  const [listings, setListings] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMarket, setFilterMarket] = useState('all');
  const [showAddConnector, setShowAddConnector] = useState(false);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkPushing, setBulkPushing] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [editingListing, setEditingListing] = useState(null);
  const [syndicationListing, setSyndicationListing] = useState(null);
  const [syncingListingId, setSyncingListingId] = useState(null);

  const load = async () => {
    setLoading(true);
    const [l, c] = await Promise.all([
      base44.entities.StorefrontListing.list('-created_date', 50),
      base44.entities.MarketConnector.list('-created_date', 50).catch(() => []),
    ]);
    setListings(l);
    setConnectors(c);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredListings = listings.filter(l => {
    const matchSearch = !search || l.title?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || l.asset_type === filterType;
    const matchMarket = filterMarket === 'all'
      || (filterMarket === 'internal' && l.internal_listed)
      || (filterMarket !== 'internal' && (l.external_syndications || []).some(s => s.connector_id === filterMarket));
    return matchSearch && matchType && matchMarket;
  });

  const handleSaveConnector = async (data) => {
    if (!canManageMarketplaceConfig(currentUser)) {
      logAuditEvent(currentUser, {
        action: 'connector.create',
        target_type: 'MarketConnector',
        status: 'denied',
        reason: 'missing_admin_permission',
      });
      return;
    }
    const created = await base44.entities.MarketConnector.create({
      ...data,
      price_adjustment_type: 'none',
      price_adjustment_value: 0,
      auto_publish: false,
      simulation_mode: true,
      external_market_slug: data.name?.toLowerCase().includes('opensea') ? 'opensea' : '',
    });
    logAuditEvent(currentUser, {
      action: 'connector.create',
      target_type: 'MarketConnector',
      target_id: created?.id,
      after: { name: data.name, connector_type: data.connector_type },
    });
    setShowAddConnector(false);
    load();
  };

  const handleToggleConnector = async (c) => {
    if (!canManageMarketplaceConfig(currentUser)) {
      logAuditEvent(currentUser, { action: 'connector.toggle', target_type: 'MarketConnector', target_id: c.id, status: 'denied', reason: 'missing_admin_permission' });
      return;
    }
    await base44.entities.MarketConnector.update(c.id, { is_enabled: !c.is_enabled, status: !c.is_enabled ? 'pending_auth' : 'inactive' });
    logAuditEvent(currentUser, { action: 'connector.toggle', target_type: 'MarketConnector', target_id: c.id, before: { is_enabled: c.is_enabled }, after: { is_enabled: !c.is_enabled } });
    load();
  };

  const handleDeleteConnector = async (c) => {
    if (!canManageMarketplaceConfig(currentUser)) {
      logAuditEvent(currentUser, { action: 'connector.delete', target_type: 'MarketConnector', target_id: c.id, status: 'denied', reason: 'missing_admin_permission' });
      return;
    }
    await base44.entities.MarketConnector.delete(c.id);
    logAuditEvent(currentUser, { action: 'connector.delete', target_type: 'MarketConnector', target_id: c.id });
    load();
  };

  const handleCreateListing = async (data) => {
    const draftCheck = validateListingDraft(data);
    if (!draftCheck.ok) {
      logAuditEvent(currentUser, { action: 'listing.create', target_type: 'StorefrontListing', status: 'failure', reason: draftCheck.reason });
      return;
    }
    const created = await base44.entities.StorefrontListing.create(data);
    logAuditEvent(currentUser, { action: 'listing.create', target_type: 'StorefrontListing', target_id: created?.id, after: { title: data.title, base_price: data.base_price, currency: data.currency } });
    setShowCreateListing(false);
    load();
  };

  const handleUpdateListing = async (data) => {
    const editCheck = validateListingEdit({ user: currentUser, listing: editingListing });
    if (!editCheck.ok) {
      logAuditEvent(currentUser, { action: 'listing.update', target_type: 'StorefrontListing', target_id: editingListing?.id, status: 'denied', reason: editCheck.reason });
      return;
    }
    const draftCheck = validateListingDraft(data);
    if (!draftCheck.ok) {
      logAuditEvent(currentUser, { action: 'listing.update', target_type: 'StorefrontListing', target_id: editingListing?.id, status: 'failure', reason: draftCheck.reason });
      return;
    }
    await base44.entities.StorefrontListing.update(editingListing.id, {
      ...data,
      currency: data.crypto_currency,
    });
    logAuditEvent(currentUser, { action: 'listing.update', target_type: 'StorefrontListing', target_id: editingListing.id, before: { base_price: editingListing.base_price, currency: editingListing.currency }, after: { base_price: data.base_price, currency: data.crypto_currency } });
    setEditingListing(null);
    load();
  };

  // Pause / publish toggle: edit gate guards ownership + admin role.
  const handleTogglePause = async (listing) => {
    const editCheck = validateListingEdit({ user: currentUser, listing });
    if (!editCheck.ok) {
      logAuditEvent(currentUser, { action: 'listing.toggle_pause', target_type: 'StorefrontListing', target_id: listing.id, status: 'denied', reason: editCheck.reason });
      return;
    }
    const nextStatus = listing.status === 'active' ? 'paused' : 'active';
    await base44.entities.StorefrontListing.update(listing.id, { status: nextStatus });
    logAuditEvent(currentUser, { action: 'listing.toggle_pause', target_type: 'StorefrontListing', target_id: listing.id, before: { status: listing.status }, after: { status: nextStatus } });
    load();
  };

  // Delete: same edit gate, plus a confirm() guard since this is destructive.
  const handleDeleteListing = async (listing) => {
    const editCheck = validateListingEdit({ user: currentUser, listing });
    if (!editCheck.ok) {
      logAuditEvent(currentUser, { action: 'listing.delete', target_type: 'StorefrontListing', target_id: listing.id, status: 'denied', reason: editCheck.reason });
      return;
    }
    if (!confirm(`Delete "${listing.title}"? This cannot be undone.`)) return;
    await base44.entities.StorefrontListing.delete(listing.id);
    logAuditEvent(currentUser, { action: 'listing.delete', target_type: 'StorefrontListing', target_id: listing.id, before: { title: listing.title, status: listing.status } });
    load();
  };

  const handleSaveSyndication = async (items) => {
    await base44.entities.StorefrontListing.update(syndicationListing.id, {
      external_syndications: items.map((item) => ({
        ...item,
        sync_status: item.enabled ? (connectors.find((connector) => connector.id === item.connector_id)?.is_enabled ? 'pending' : 'not_connected') : 'not_connected',
      })),
    });
    setSyndicationListing(null);
    load();
  };

  const handleRunSync = async (listingId) => {
    setSyncingListingId(listingId);
    await base44.functions.invoke('runMarketplaceSyndication', { listingId });
    setSyncingListingId(null);
    load();
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredListings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredListings.map(l => l.id)));
    }
  };

  const handleBulkPush = async () => {
    if (!activeConnectors.length || !selectedIds.size) return;
    setBulkPushing(true);
    setBulkResult(null);
    let pushed = 0;
    let failed = 0;
    for (const id of selectedIds) {
      const listing = listings.find(l => l.id === id);
      if (!listing) continue;
      const existing = listing.external_syndications || [];
      const updated = [...existing];
      for (const c of activeConnectors) {
        if (!updated.find(s => s.connector_id === c.id)) {
          updated.push({ connector_id: c.id, connector_name: c.name, enabled: true, sync_status: 'pending', custom_price: null, external_listing_id: null });
        }
      }
      try {
        await base44.entities.StorefrontListing.update(id, { external_syndications: updated });
        pushed++;
      } catch {
        failed++;
      }
    }
    setBulkResult({ pushed, failed });
    setBulkPushing(false);
    setSelectedIds(new Set());
    load();
  };

  const activeConnectors = connectors.filter(c => c.is_enabled);
  const totalSynced = listings.reduce((sum, l) => sum + (l.external_syndications || []).filter(s => s.sync_status === 'synced').length, 0);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card/90 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Storefront Network</h2>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/seller-dashboard" className="p-1.5 rounded-lg bg-secondary hover:bg-border transition-colors">
              <Store className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>
            <Link to="/storefront-analytics" className="p-1.5 rounded-lg bg-secondary hover:bg-border transition-colors">
              <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Unified listing hub with external marketplace connectors</p>
      </div>

      {/* Stats bar */}
      <div className="flex border-b border-border bg-card/50 flex-shrink-0">
        {[
          { label: 'Listings', value: listings.length, color: 'text-foreground' },
          { label: 'Active', value: listings.filter(l => l.status === 'active').length, color: 'text-green-400' },
          { label: 'Connectors', value: activeConnectors.length, color: 'text-primary' },
          { label: 'Ext. Synced', value: totalSynced, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="flex-1 text-center py-2">
            <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex-shrink-0 flex border-b border-border bg-card/50">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${tab === id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
        {/* Bulk result toast */}
        {bulkResult && (
          <div className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 text-xs font-medium ${bulkResult.failed > 0 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Bulk push: {bulkResult.pushed} queued{bulkResult.failed > 0 ? `, ${bulkResult.failed} failed` : ''}
            <button onClick={() => setBulkResult(null)} className="ml-auto"><XCircle className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* STOREFRONT TAB */}
            {tab === 'storefront' && (
              <div className="space-y-4">
                {/* External portal cards — Lovable-powered modules */}
                <Link
                  to="/storefront/phoenix-investor"
                  className="block rounded-2xl border border-primary/30 bg-gradient-to-br from-orange-500/10 via-primary/5 to-transparent hover:border-primary/60 transition-colors p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500/30 to-primary/30 border border-primary/40 flex items-center justify-center flex-shrink-0">
                      <Flame className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">Phoenix Investor</p>
                      <p className="text-[11px] text-muted-foreground truncate">External Lovable storefront/app portal</p>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </Link>

                {/* Search + filters */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search listings..."
                    className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-primary/50" />
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {['all','jade','nft','bot','card','item'].map(t => (
                    <button key={t} onClick={() => setFilterType(t)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-colors ${filterType === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                      {t === 'all' ? 'All Types' : t}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  <button onClick={() => setFilterMarket('all')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap ${filterMarket === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                    All Markets
                  </button>
                  <button onClick={() => setFilterMarket('internal')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap ${filterMarket === 'internal' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                    Internal
                  </button>
                  {connectors.map(c => (
                    <button key={c.id} onClick={() => setFilterMarket(c.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap ${filterMarket === c.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                      {c.name}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setShowCreateListing(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border hover:border-primary/30 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Plus className="w-4 h-4" /> New Listing
                  </button>
                  {filteredListings.length > 0 && (
                    <button onClick={selectAll}
                      className="px-3 py-2.5 rounded-xl border border-border bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {selectedIds.size === filteredListings.length ? 'None' : 'All'}
                    </button>
                  )}
                </div>

                {/* Bulk action bar */}
                {selectedIds.size > 0 && (
                  <div className="sticky top-0 z-20 flex items-center gap-3 px-3 py-2.5 bg-primary/10 border border-primary/30 rounded-xl">
                    <span className="text-xs font-medium text-primary">{selectedIds.size} selected</span>
                    <button onClick={handleBulkPush}
                      disabled={bulkPushing || !activeConnectors.length}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-50">
                      {bulkPushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Push to {activeConnectors.length} connector{activeConnectors.length !== 1 ? 's' : ''}
                    </button>
                    <button onClick={() => setSelectedIds(new Set())} className="text-muted-foreground hover:text-foreground">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {filteredListings.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <Store className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">No listings yet</p>
                    <p className="text-xs text-muted-foreground/60">Create your first listing to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editingListing && <ListingEditor initialValue={editingListing} onSave={handleUpdateListing} submitLabel="Update Storefront Listing" />}
                    {filteredListings.map(l => (
                      <div key={l.id} className="space-y-2">
                        <ListingCard listing={l} connectors={connectors}
                          selected={selectedIds.has(l.id)}
                          onSelect={toggleSelect}
                          onEdit={setEditingListing}
                          onSyndicationEdit={setSyndicationListing}
                          onRunSync={handleRunSync}
                          onTogglePause={handleTogglePause}
                          onDelete={handleDeleteListing} />
                        {syncingListingId === l.id && <p className="text-[10px] text-primary">Running sync...</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CONNECTORS TAB */}
            {tab === 'connectors' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{connectors.length} connector{connectors.length !== 1 ? 's' : ''} configured</p>
                  {isAdmin && (
                    <button onClick={() => setShowAddConnector(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium">
                      <Plus className="w-3.5 h-3.5" /> Add Connector
                    </button>
                  )}
                </div>

                {/* Architecture note */}
                <div className="flex items-start gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                  <Activity className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p className="font-medium text-blue-400">Connector Architecture</p>
                    <p>Internal marketplace is the source of truth. External connectors are adapters — listings sync outward, conflicts always resolve to internal state.</p>
                  </div>
                </div>

                {connectors.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <Plug className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">No connectors configured</p>
                    {isAdmin && (
                      <button onClick={() => setShowAddConnector(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm">
                        <Plus className="w-4 h-4" /> Add First Connector
                      </button>
                    )}
                    {!isAdmin && <p className="text-xs text-muted-foreground/60">Contact an admin to configure marketplace connectors</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {connectors.map(c => (
                      <ConnectorCard key={c.id} connector={c} isAdmin={isAdmin}
                        onToggle={handleToggleConnector}
                        onEdit={() => {}}
                        onDelete={handleDeleteConnector} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ADMIN TAB */}
            {tab === 'admin' && (
              <div className="space-y-4">
                <PermissionGate
                  allow={canManageMarketplaceConfig}
                  deniedTitle="Admin access required"
                  deniedMessage="Only admins can view the Storefront admin panel."
                >
                  <>
                    <div className="p-4 bg-card rounded-xl border border-border space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-primary" />
                        <p className="text-sm font-semibold">System Overview</p>
                      </div>
                      {[
                        { label: 'Total Listings', value: listings.length },
                        { label: 'Active Listings', value: listings.filter(l => l.status === 'active').length },
                        { label: 'Draft Listings', value: listings.filter(l => l.status === 'draft').length },
                        { label: 'Error Listings', value: listings.filter(l => l.status === 'error').length },
                        { label: 'Connectors Enabled', value: activeConnectors.length },
                        { label: 'External Syncs', value: totalSynced },
                      ].map(s => (
                        <div key={s.label} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{s.label}</span>
                          <span className="font-mono font-medium">{s.value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 bg-card rounded-xl border border-border space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Plug className="w-4 h-4 text-primary" />
                        <p className="text-sm font-semibold">Connector Health</p>
                      </div>
                      {connectors.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No connectors configured</p>
                      ) : connectors.map(c => (
                        <div key={c.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground">Sync every {c.sync_frequency_minutes}m · {c.read_only_fallback ? 'RO fallback on' : 'RO fallback off'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={c.status} />
                            <button onClick={() => handleToggleConnector(c)}
                              className="text-[10px] px-2 py-1 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                              {c.is_enabled ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                        <p className="text-sm font-semibold text-yellow-400">Safety Rules</p>
                      </div>
                      {[
                        'Internal marketplace is always the source of truth',
                        'No fake external confirmations are ever generated',
                        'Failed syncs are marked pending — never silently dropped',
                        'External connector unavailability shows "not connected" state',
                        'All external actions require verified API response',
                      ].map((rule, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                          {rule}
                        </div>
                      ))}
                    </div>
                  </>
                </PermissionGate>
              </div>
            )}
          </>
        )}
      </div>

      {showAddConnector && <AddConnectorModal onClose={() => setShowAddConnector(false)} onSave={handleSaveConnector} />}
      {showCreateListing && <CreateListingModal connectors={connectors} onClose={() => setShowCreateListing(false)} onSave={handleCreateListing} />}
      {syndicationListing && <SyndicationModal listing={syndicationListing} connectors={connectors} onClose={() => setSyndicationListing(null)} onSave={handleSaveSyndication} />}
    </div>
  );
}