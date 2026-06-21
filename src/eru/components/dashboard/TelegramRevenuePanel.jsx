import { useMemo } from 'react';
import { Bot, Coins, Star, TrendingUp } from 'lucide-react';

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function TelegramRevenuePanel({ bots = [], orders = [], logs = [] }) {
  const metrics = useMemo(() => {
    const paidOrders = (orders || []).filter((order) => order.payment_status === 'paid');
    const starsOrders = paidOrders.filter((order) => order.payment_provider === 'telegram_stars');
    const tonOrders = paidOrders.filter((order) => order.payment_provider === 'ton');

    const botMap = new Map((bots || []).map((bot) => [bot.id, bot]));
    const perBot = new Map();

    for (const log of logs || []) {
      const meta = log.metadata || {};
      const botId = meta.responder_bot_id || meta.bot_id || log.bot_id;
      if (!botId) continue;
      if (!perBot.has(botId)) {
        perBot.set(botId, {
          botId,
          name: botMap.get(botId)?.name || meta.responder_bot_name || 'Unknown bot',
          routedRequests: 0,
          starsRevenue: 0,
          tonRevenue: 0,
          starsEngagement: 0,
          conversions: 0,
        });
      }
      const row = perBot.get(botId);
      if (meta.routing_summary) row.routedRequests += 1;
      if (meta.stars_engagement) row.starsEngagement += Number(meta.stars_engagement || 0);
      if (meta.conversion === true) row.conversions += 1;
    }

    for (const order of paidOrders) {
      const botId = order.bot_id || order.metadata?.bot_id || '';
      if (!botId) continue;
      if (!perBot.has(botId)) {
        perBot.set(botId, {
          botId,
          name: botMap.get(botId)?.name || 'Unknown bot',
          routedRequests: 0,
          starsRevenue: 0,
          tonRevenue: 0,
          starsEngagement: 0,
          conversions: 0,
        });
      }
      const row = perBot.get(botId);
      if (order.payment_provider === 'telegram_stars') row.starsRevenue += Number(order.price_usd || 0);
      if (order.payment_provider === 'ton') row.tonRevenue += Number(order.price_usd || 0);
      row.conversions += 1;
    }

    const leaders = Array.from(perBot.values())
      .map((row) => ({ ...row, totalRevenue: row.starsRevenue + row.tonRevenue }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      totalStarsRevenue: starsOrders.reduce((sum, order) => sum + Number(order.price_usd || 0), 0),
      totalTonRevenue: tonOrders.reduce((sum, order) => sum + Number(order.price_usd || 0), 0),
      totalConversions: paidOrders.length,
      totalStarsEngagement: Array.from(perBot.values()).reduce((sum, row) => sum + row.starsEngagement, 0),
      leaders,
    };
  }, [bots, orders, logs]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Telegram bot revenue</p>
          <p className="mt-1 text-xs text-muted-foreground">Track Stars and TON revenue by bot to see which agent drives the strongest monetization.</p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><Star className="w-3.5 h-3.5 text-primary" /> Stars revenue</div>
          <p className="mt-2 text-lg font-semibold text-foreground">{formatMoney(metrics.totalStarsRevenue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><Coins className="w-3.5 h-3.5 text-primary" /> TON revenue</div>
          <p className="mt-2 text-lg font-semibold text-foreground">{formatMoney(metrics.totalTonRevenue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><Bot className="w-3.5 h-3.5 text-primary" /> Paid conversions</div>
          <p className="mt-2 text-lg font-semibold text-foreground">{metrics.totalConversions}</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><Star className="w-3.5 h-3.5 text-primary" /> Stars engagement</div>
          <p className="mt-2 text-lg font-semibold text-foreground">{metrics.totalStarsEngagement}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Top performing bots</p>
          <p className="text-[11px] text-muted-foreground">Revenue + conversions</p>
        </div>
        <div className="space-y-2">
          {metrics.leaders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-3 py-4 text-xs text-muted-foreground">No paid Telegram revenue yet.</div>
          ) : metrics.leaders.slice(0, 6).map((bot, index) => (
            <div key={bot.botId} className="rounded-xl border border-border bg-secondary/20 px-3 py-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">#{index + 1}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{bot.name}</p>
                <p className="text-[11px] text-muted-foreground">{bot.conversions} conversions · {bot.routedRequests} routed requests · {bot.starsEngagement} Stars engagements</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{formatMoney(bot.totalRevenue)}</p>
                <p className="text-[11px] text-muted-foreground">{formatMoney(bot.starsRevenue)} Stars · {formatMoney(bot.tonRevenue)} TON</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}