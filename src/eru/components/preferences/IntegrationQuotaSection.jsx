import { useEffect, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Gauge, AlertTriangle, Star, Loader2, ExternalLink } from 'lucide-react';

export default function IntegrationQuotaSection() {
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState('');

  const loadQuota = async () => {
    setLoading(true);
    const response = await base44.functions.invoke('getIntegrationQuotaStatus', {});
    setQuota(response.data?.quota || null);
    setLoading(false);
  };

  useEffect(() => { loadQuota(); }, []);

  const createStarsOrder = async () => {
    setCreatingOrder(true);
    setInvoiceUrl('');
    const me = await base44.auth.me();
    const order = await base44.entities.IntegrationTopupOrder.create({
      user_email: me.email,
      pack_name: '100 extra uses',
      extra_uses: 100,
      price_usd: 4.99,
      payment_provider: 'telegram_stars',
      payment_status: 'draft'
    });

    const telegramAccount = await base44.entities.TelegramAccount.filter({ user_email: me.email }, '-created_date', 1);
    const chatId = telegramAccount?.[0]?.telegram_user_id;
    if (!chatId) {
      setCreatingOrder(false);
      return;
    }

    const response = await base44.functions.invoke('createTelegramStarsInvoice', {
      orderId: order.id,
      chatId
    });
    setInvoiceUrl(response.data?.invoice_url || '');
    setCreatingOrder(false);
  };

  const ratio = quota ? quota.used_today / Math.max(1, quota.daily_limit) : 0;
  const warn = ratio >= 0.8;
  const blocked = quota ? quota.remaining_today <= 0 : false;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
          <Gauge className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Integration usage</p>
          <p className="text-xs text-muted-foreground">50 daily uses per user. We warn near the limit, then block at the cap unless you buy extra uses.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
      ) : quota && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Used today</span>
              <span className="text-foreground font-medium">{quota.used_today} / {quota.daily_limit}</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div className={`h-full ${blocked ? 'bg-red-400' : warn ? 'bg-yellow-400' : 'bg-primary'}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Remaining today</span>
              <span className="text-foreground font-medium">{quota.remaining_today}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Extra uses balance</span>
              <span className="text-foreground font-medium">{quota.extra_uses_balance}</span>
            </div>
          </div>

          {(warn || blocked) && (
            <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${blocked ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'}`}>
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{blocked ? 'You reached your daily integration limit.' : 'You are getting close to your daily integration limit.'}</span>
            </div>
          )}

          <button
            onClick={createStarsOrder}
            disabled={creatingOrder}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {creatingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
            Buy 100 extra uses · $4.99 · Stars
          </button>

          {!creatingOrder && invoiceUrl && (
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full h-11 rounded-xl border border-primary/20 bg-primary/10 text-primary text-sm font-medium inline-flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" /> Open Telegram Stars checkout
            </a>
          )}

          {!creatingOrder && !invoiceUrl && (
            <p className="text-[11px] text-muted-foreground text-center">Stars checkout opens after we detect your linked Telegram account.</p>
          )}
        </>
      )}
    </section>
  );
}