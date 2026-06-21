import { useState, useEffect, useMemo } from 'react';
import { Bell, Plus, Trash2, Check, Loader2, Smartphone, Send, Link as LinkIcon } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { toast } from 'sonner';
import { useDashboardEvents } from '@/eru/context/DashboardEventsContext';
import { getTelegramAccount } from '@/eru/lib/telegramConnector';
import MobileSelect from '@/eru/components/mobile/MobileSelect';

export default function AlertManager() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ asset_symbol: '', alert_type: 'above', threshold_price: '', trigger_basis: 'price', percent_change: '', note: '', push_notification_enabled: true });
  const [creating, setCreating] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [holdings, setHoldings] = useState([]);
  const [telegramAccount, setTelegramAccount] = useState(null);
  const { subscribe, emit, rules } = useDashboardEvents();
  const activeRules = useMemo(() => rules.filter((rule) => rule.enabled && rule.target === 'alerts'), [rules]);

  useEffect(() => {
    fetchAlerts();
    const unsubscribe = base44.entities.PriceAlert.subscribe((event) => {
      if (event.type === 'create') {
        setAlerts((prev) => [event.data, ...prev]);
      } else if (event.type === 'update') {
        setAlerts((prev) => prev.map((item) => item.id === event.id ? event.data : item));
      } else if (event.type === 'delete') {
        setAlerts((prev) => prev.filter((item) => item.id !== event.id));
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const syncTimeout = window.setTimeout(() => {
      fetchAlerts();
    }, 1200);

    return () => window.clearTimeout(syncTimeout);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe('alert-manager', async (dashboardEvent) => {
      const matched = activeRules.some((rule) => rule.source === dashboardEvent.source && rule.event === dashboardEvent.event);
      if (!matched) return;
      setPulse(true);
      window.setTimeout(() => setPulse(false), 1200);

      if (dashboardEvent.source === 'market' && dashboardEvent.event === 'priceChange') {
        const matchedAlerts = alerts.filter((alert) => {
          const marketItem = (dashboardEvent.payload?.prices || []).find((price) => price.symbol === alert.asset_symbol);
          if (!marketItem || alert.is_active === false || alert.notification_sent) return false;
          if (alert.trigger_basis === 'percent_change') {
            return alert.alert_type === 'above'
              ? marketItem.change >= alert.percent_change
              : marketItem.change <= alert.percent_change;
          }
          return alert.alert_type === 'above'
            ? marketItem.price >= alert.threshold_price
            : marketItem.price <= alert.threshold_price;
        });

        if (matchedAlerts.length > 0) {
          await Promise.all(matchedAlerts.map((alert) =>
            base44.entities.PriceAlert.update(alert.id, {
              triggered_at: new Date().toISOString(),
              notification_sent: true,
              push_notification_status: alert.push_notification_enabled ? 'sent' : 'disabled'
            })
          ));
          emit('alerts', 'thresholdTriggered', { matchedAlerts });
          toast.success(`${matchedAlerts.length} alert rule${matchedAlerts.length > 1 ? 's' : ''} matched live market data`);
          await base44.functions.invoke('checkPriceAlerts', {});
        }
      }
    });
    return unsubscribe;
  }, [subscribe, activeRules, alerts, emit]);

  const fetchAlerts = async () => {
    try {
      const user = await base44.auth.me();
      if (!user) {
        setLoading(false);
        return;
      }
      const [data, walletHoldings, tgAccount] = await Promise.all([
        base44.entities.PriceAlert.filter({ created_by: user.email }),
        base44.entities.WalletHolding.filter({ created_by: user.email }, '-value_usd', 100),
        getTelegramAccount(user.email),
      ]);
      setAlerts(data || []);
      setHoldings(walletHoldings || []);
      setTelegramAccount(tgAccount || null);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!formData.asset_symbol || !formData.threshold_price) {
      toast.error('Please fill all fields');
      return;
    }

    setCreating(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.PriceAlert.create({
        asset_symbol: formData.asset_symbol.toUpperCase(),
        alert_type: formData.alert_type,
        threshold_price: formData.threshold_price ? parseFloat(formData.threshold_price) : 0,
        trigger_basis: formData.trigger_basis,
        percent_change: formData.percent_change ? parseFloat(formData.percent_change) : null,
        note: formData.note,
        is_active: true,
        push_notification_enabled: formData.push_notification_enabled,
        push_notification_status: formData.push_notification_enabled ? 'ready' : 'disabled',
        telegram_notification_enabled: !!telegramAccount?.is_verified && !!telegramAccount?.notifications_enabled,
        user_email: user.email,
      });
      setFormData({ asset_symbol: '', alert_type: 'above', threshold_price: '', trigger_basis: 'price', percent_change: '', note: '', push_notification_enabled: true });
      setShowForm(false);
      toast.success('Price alert created');
    } catch (error) {
      toast.error('Failed to create alert');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAlert = async (id) => {
    try {
      await base44.entities.PriceAlert.delete(id);
      toast.success('Alert deleted');
      setAlerts((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      toast.error('Failed to delete alert');
    }
  };

  const handleToggleAlert = async (id, isActive) => {
    try {
      await base44.entities.PriceAlert.update(id, { is_active: !isActive });
      setAlerts((prev) => prev.map((item) => item.id === id ? { ...item, is_active: !isActive } : item));
    } catch (error) {
      toast.error('Failed to update alert');
    }
  };

  const handleTogglePush = async (alert) => {
    try {
      const nextPushEnabled = !alert.push_notification_enabled;
      await base44.entities.PriceAlert.update(alert.id, {
        push_notification_enabled: nextPushEnabled,
        push_notification_status: nextPushEnabled ? 'ready' : 'pending'
      });
      setAlerts((prev) => prev.map((item) => item.id === alert.id ? { ...item, push_notification_enabled: nextPushEnabled, push_notification_status: nextPushEnabled ? 'ready' : 'pending' } : item));
    } catch (error) {
      toast.error('Failed to update push status');
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-card border border-border rounded-xl flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`bg-card border rounded-xl p-4 transition-all ${pulse ? 'border-primary shadow-[0_0_0_1px_hsl(var(--primary))]' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Custom Alerts</h3>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{alerts.filter(a => a.is_active).length}</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20"
        >
          <Plus className="w-3 h-3" /> New Alert
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-3 bg-secondary rounded-lg border border-border/50 space-y-2">
          {!telegramAccount?.is_verified && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground">
              <LinkIcon className="w-3.5 h-3.5 text-primary" />
              Link Telegram in your account settings to receive price alerts away from the dashboard.
            </div>
          )}
          <MobileSelect
            value={formData.asset_symbol}
            onChange={(v) => setFormData({ ...formData, asset_symbol: v })}
            placeholder="Select a holding"
            title="Choose holding"
            options={[...new Set(holdings.map((h) => h.token_symbol).filter(Boolean))].map((s) => ({ value: s, label: s }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <MobileSelect
              value={formData.trigger_basis}
              onChange={(v) => setFormData({ ...formData, trigger_basis: v })}
              title="Trigger basis"
              options={[
                { value: 'price', label: 'Price level' },
                { value: 'percent_change', label: '24h % change' },
              ]}
            />
            <MobileSelect
              value={formData.alert_type}
              onChange={(v) => setFormData({ ...formData, alert_type: v })}
              title="Alert direction"
              options={[
                { value: 'above', label: 'Above' },
                { value: 'below', label: 'Below' },
              ]}
            />
            {formData.trigger_basis === 'price' ? (
              <input
                type="number"
                placeholder="Threshold ($)"
                value={formData.threshold_price}
                onChange={e => setFormData({ ...formData, threshold_price: e.target.value })}
                className="px-3 py-2 bg-card border border-border rounded text-xs text-foreground placeholder-muted-foreground sm:col-span-2"
              />
            ) : (
              <input
                type="number"
                placeholder="24h change (%)"
                value={formData.percent_change}
                onChange={e => setFormData({ ...formData, percent_change: e.target.value })}
                className="px-3 py-2 bg-card border border-border rounded text-xs text-foreground placeholder-muted-foreground sm:col-span-2"
              />
            )}
            <input
              type="text"
              placeholder="Optional note"
              value={formData.note}
              onChange={e => setFormData({ ...formData, note: e.target.value })}
              className="px-3 py-2 bg-card border border-border rounded text-xs text-foreground placeholder-muted-foreground sm:col-span-2"
            />
            <label className="sm:col-span-2 flex items-center gap-2 px-3 py-2 bg-card border border-border rounded text-xs text-foreground">
              <input
                type="checkbox"
                checked={formData.push_notification_enabled}
                onChange={e => setFormData({ ...formData, push_notification_enabled: e.target.checked })}
                className="accent-primary"
              />
              Enable in-app notification
            </label>
            <div className="sm:col-span-2 flex items-center justify-between gap-3 px-3 py-2 bg-card border border-border rounded text-xs text-foreground">
              <div className="flex items-center gap-2 min-w-0">
                <Send className="w-3.5 h-3.5 text-primary" />
                <span className="truncate">Telegram delivery {telegramAccount?.is_verified ? 'available' : 'not linked'}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{telegramAccount?.notifications_enabled ? 'enabled' : 'off'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateAlert}
              disabled={creating}
              className="flex-1 py-2 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2 bg-secondary border border-border rounded text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {alerts.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No alerts yet. Create one to monitor asset thresholds.</p>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-secondary rounded-lg border border-border px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Active alerts</p>
              <p className="text-sm font-semibold">{alerts.filter(a => a.is_active).length}</p>
            </div>
            <div className="bg-secondary rounded-lg border border-border px-3 py-2">
              <p className="text-[10px] text-muted-foreground">In-app on</p>
              <p className="text-sm font-semibold">{alerts.filter(a => a.push_notification_enabled).length}</p>
            </div>
            <div className="bg-secondary rounded-lg border border-border px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Telegram on</p>
              <p className="text-sm font-semibold">{alerts.filter(a => a.telegram_notification_enabled).length}</p>
            </div>
            <div className="bg-secondary rounded-lg border border-border px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Triggered</p>
              <p className="text-sm font-semibold">{alerts.filter(a => a.triggered_at).length}</p>
            </div>
          </div>
          <div className="space-y-2">
          {alerts.map(alert => (
            <div key={alert.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${alert.is_active ? 'bg-green-500/5 border-green-500/20' : 'bg-secondary/50 border-border/50'}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-medium text-foreground">
                    {alert.asset_symbol} <span className="text-muted-foreground text-[9px]">{alert.alert_type === 'above' ? '↑' : '↓'}</span>
                  </p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{alert.push_notification_status || 'ready'}</span>
                  {alert.telegram_notification_enabled && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400">telegram</span>}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {alert.trigger_basis === 'percent_change'
                    ? `${alert.percent_change}% 24h change`
                    : `$${Number(alert.threshold_price || 0).toFixed(2)}`}
                </p>
                {typeof alert.last_price_usd === 'number' && (
                  <p className="text-[10px] text-muted-foreground/80">Last seen: ${Number(alert.last_price_usd).toLocaleString()} · 24h {Number(alert.last_percent_change || 0).toFixed(2)}%</p>
                )}
                {alert.note && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{alert.note}</p>}
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  In-app: {alert.push_notification_enabled ? 'On' : 'Off'} · Telegram: {alert.telegram_notification_enabled ? 'On' : 'Off'}{alert.triggered_at ? ` · Last trigger ${new Date(alert.triggered_at).toLocaleString()}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {alert.notification_sent && <Check className="w-3.5 h-3.5 text-green-400" />}
                <button
                  onClick={() => handleTogglePush(alert)}
                  className={`p-1.5 rounded transition-colors ${alert.push_notification_enabled ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}
                >
                  <Smartphone className="w-3 h-3" />
                </button>
                <button
                  onClick={async () => {
                    if (!telegramAccount?.is_verified || !telegramAccount?.notifications_enabled) {
                      toast.error('Link Telegram and enable alerts first');
                      return;
                    }
                    const nextValue = !alert.telegram_notification_enabled;
                    await base44.entities.PriceAlert.update(alert.id, { telegram_notification_enabled: nextValue });
                    setAlerts((prev) => prev.map((item) => item.id === alert.id ? { ...item, telegram_notification_enabled: nextValue } : item));
                  }}
                  className={`p-1.5 rounded transition-colors ${alert.telegram_notification_enabled ? 'bg-blue-500/10 text-blue-400' : 'bg-secondary text-muted-foreground'}`}
                  title="Toggle Telegram delivery"
                >
                  <Send className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleToggleAlert(alert.id, alert.is_active)}
                  className={`w-8 h-6 rounded transition-colors ${alert.is_active ? 'bg-green-500/20' : 'bg-secondary'}`}
                />
                <button
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="p-1.5 hover:bg-red-500/10 rounded transition-colors"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </div>
            </div>
          ))}
          </div>
        </>
      )}
    </div>
  );
}