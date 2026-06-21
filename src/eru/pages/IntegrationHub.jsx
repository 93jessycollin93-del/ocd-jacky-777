import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plug, ArrowLeft, MessageCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/eru/lib/AuthContext';
import { base44 } from '@/eru/api/base44Client';
import { useRealtimeEntityList } from '@/eru/hooks/useLiveSync';

import {
  INTEGRATION_REGISTRY,
  computeStatus,
  STATUS,
  getCategoryLabel,
} from '@/eru/lib/integrationRegistry';
import { getKnownSecretNames, getAuthorizedConnectors } from '@/eru/lib/integrationEnv';

import IntegrationSummary from '@/eru/components/integrations/IntegrationSummary';
import IntegrationFilters from '@/eru/components/integrations/IntegrationFilters';
import IntegrationCard from '@/eru/components/integrations/IntegrationCard';
import IntegrationDetailDrawer from '@/eru/components/integrations/IntegrationDetailDrawer';
import WhatsAppPanel from '@/eru/components/integrations/WhatsAppPanel';
import ZeroFakeDataPolicyCard from '@/eru/components/pricing/ZeroFakeDataPolicyCard';
import { getZeroFakeDataMode } from '@/eru/lib/zeroFakeData';

/**
 * IntegrationHub — Connections Hub / Integration Command Center.
 *
 * Honest by construction: status is computed every render from
 *   • known server-side secret names
 *   • authorized OAuth connectors
 *   • admin-saved IntegrationProvider overrides
 *
 * Nothing here ever fakes a "connected" pill.
 */
export default function IntegrationHub() {
  const { user, currentUser } = useAuth();
  const me = user || currentUser;
  const isAdmin = me?.role === 'admin';

  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [openEntry, setOpenEntry] = useState(null);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [appBaseUrl, setAppBaseUrl] = useState('');

  // Live admin-saved overrides (status, lastVerifiedAt, lastError).
  const { data: providerRows } = useRealtimeEntityList('IntegrationProvider', {
    sort: '-updated_date', limit: 100, enabled: !!me,
  });
  const overridesByKey = useMemo(() => {
    const map = {};
    (providerRows || []).forEach((row) => { if (row?.providerKey) map[row.providerKey] = row; });
    return map;
  }, [providerRows]);

  // Try to read the public APP_BASE_URL once for webhook URL hints. We never
  // surface secret values — APP_BASE_URL is non-sensitive.
  useEffect(() => {
    base44.functions.invoke('checkEditorPackageUpdates', {}).catch(() => null); // warm
    // The platform doesn't expose secrets to the browser. The admin can set
    // a public base URL hint in localStorage for nicer copy/paste. Otherwise
    // we show a clear placeholder.
    try { setAppBaseUrl(localStorage.getItem('eru_app_base_url') || ''); } catch { /* ignore */ }
  }, []);

  // Compute the live, honest list of integrations.
  const items = useMemo(() => {
    const secrets = getKnownSecretNames();
    const connectors = getAuthorizedConnectors();
    return INTEGRATION_REGISTRY.map((entry) => {
      const override = overridesByKey[entry.providerKey];
      const status = computeStatus(entry, {
        availableSecrets: secrets,
        authorizedConnectors: connectors,
        override,
      });
      return {
        ...entry,
        status,
        lastVerifiedAt: override?.lastVerifiedAt || null,
        lastError: override?.lastError || null,
      };
    });
  }, [overridesByKey]);

  // Filter by category + search.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (category !== 'all' && it.category !== category) return false;
      if (!q) return true;
      return (
        it.name.toLowerCase().includes(q) ||
        it.providerKey.toLowerCase().includes(q) ||
        getCategoryLabel(it.category).toLowerCase().includes(q)
      );
    });
  }, [items, category, query]);

  // Pull WhatsApp entries for the flagship panel.
  const metaEntry = items.find((i) => i.providerKey === 'whatsapp_meta');
  const twilioEntry = items.find((i) => i.providerKey === 'whatsapp_twilio');
  const whatsappStatus =
    metaEntry?.status === STATUS.CONNECTED || twilioEntry?.status === STATUS.CONNECTED
      ? STATUS.CONNECTED
      : metaEntry?.status === STATUS.NEEDS_CREDENTIALS && twilioEntry?.status === STATUS.NEEDS_CREDENTIALS
        ? STATUS.NEEDS_CREDENTIALS
        : STATUS.NOT_CONNECTED;

  // Production readiness checklist — all rules below must be true to pass.
  const productionReady = useMemo(() => {
    const checks = [
      { key: 'zeroFake', label: 'Zero Fake Data Mode is ON', ok: getZeroFakeDataMode() === 'on' },
      { key: 'whatsapp', label: 'WhatsApp flagship integration verified', ok: whatsappStatus === STATUS.CONNECTED },
      { key: 'aiKey',    label: 'At least one AI provider verified',      ok: items.some((i) => i.category === 'ai' && i.status === STATUS.CONNECTED) },
      { key: 'pricing',  label: 'At least one card pricing source verified', ok: items.some((i) => i.category === 'cards_pricing' && i.status === STATUS.CONNECTED) },
    ];
    return checks;
  }, [items, whatsappStatus]);

  const openWhatsApp = () => setWhatsappOpen(true);

  return (
    <div
      className="flex min-h-screen flex-col bg-background pb-24"
      style={{
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Header */}
      <header className="border-b border-border bg-card/80 px-4 py-3">
        <Link to="/" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Home
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <Plug className="h-5 w-5 text-primary" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Connections</p>
            <h1 className="text-lg font-semibold text-foreground leading-tight">Integration Command Center</h1>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Every integration shows its real, verified status. Never fake-connected.
        </p>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4 max-w-3xl mx-auto w-full">
        {/* No fake connections + Zero Fake Data policy */}
        <ZeroFakeDataPolicyCard mode={getZeroFakeDataMode()} />

        {/* Summary tiles */}
        <IntegrationSummary items={items} />

        {/* WhatsApp flagship card — pinned above the grid */}
        <button
          onClick={openWhatsApp}
          className="w-full text-left rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-4 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Flagship</p>
              <p className="mt-0.5 text-sm font-bold text-foreground">WhatsApp Business setup</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Meta Cloud API or Twilio. Status: <span className="font-mono uppercase">{whatsappStatus.replace('_', ' ')}</span>.
              </p>
            </div>
          </div>
        </button>

        {/* Production readiness */}
        <section className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-semibold text-foreground">Production readiness</p>
          </div>
          <ul className="mt-2 space-y-1">
            {productionReady.map((c) => (
              <li key={c.key} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-foreground">{c.label}</span>
                <span className={`font-mono uppercase tracking-wide ${c.ok ? 'text-primary' : 'text-yellow-300'}`}>
                  {c.ok ? 'pass' : 'todo'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Filters */}
        <IntegrationFilters value={category} onChange={setCategory} query={query} onQueryChange={setQuery} />

        {/* Grid */}
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">
            No integrations match this filter.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filtered.map((entry) => (
              <IntegrationCard
                key={entry.providerKey}
                entry={entry}
                onOpen={(e) => {
                  if (e.providerKey === 'whatsapp_meta' || e.providerKey === 'whatsapp_twilio') {
                    openWhatsApp();
                  } else {
                    setOpenEntry(e);
                  }
                }}
              />
            ))}
          </div>
        )}

        {!isAdmin && (
          <p className="rounded-xl border border-dashed border-border bg-secondary/20 p-3 text-center text-[11px] text-muted-foreground">
            You're viewing read-only status. Only admins can configure credentials, rotate secrets, or run verification.
          </p>
        )}
      </div>

      {whatsappOpen && (
        <WhatsAppPanel
          metaEntry={metaEntry}
          twilioEntry={twilioEntry}
          isAdmin={isAdmin}
          appBaseUrl={appBaseUrl}
          onClose={() => setWhatsappOpen(false)}
        />
      )}
      {openEntry && (
        <IntegrationDetailDrawer
          entry={openEntry}
          isAdmin={isAdmin}
          onClose={() => setOpenEntry(null)}
        />
      )}
    </div>
  );
}