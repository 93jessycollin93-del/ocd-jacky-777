import { base44 } from '@/eru/api/base44Client';
import { BellRing, Slack, NotebookPen } from 'lucide-react';

const SLACK_CONNECTOR_ID = '69db73abc7ef44b228d18b2b';
const NOTION_CONNECTOR_ID = '69db736f69df0c20be35bfae';

export default function SquadDeliveryPanel({ squad, onRefresh }) {
  const deliveryTargets = squad.delivery_targets || [];

  const updateTargets = async (target) => {
    const nextTargets = deliveryTargets.includes(target)
      ? deliveryTargets.filter((item) => item !== target)
      : [...deliveryTargets, target];

    await base44.entities.BotSquad.update(squad.id, {
      delivery_enabled: nextTargets.length > 0,
      delivery_targets: nextTargets,
      delivery_condition: 'manual_toggle',
    });
    onRefresh?.();
  };

  const connectTarget = async (connectorId) => {
    const authed = await base44.auth.isAuthenticated();
    if (!authed) {
      base44.auth.redirectToLogin();
      return;
    }
    const url = await base44.connectors.connectAppUser(connectorId);
    const popup = window.open(url, '_blank');
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        onRefresh?.();
      }
    }, 500);
  };

  return (
    <div className="rounded-xl border border-border bg-background p-3 space-y-3">
      <div className="flex items-center gap-2">
        <BellRing className="w-4 h-4 text-primary" />
        <div>
          <p className="text-xs font-semibold text-foreground">Delivery automation</p>
          <p className="text-[10px] text-muted-foreground">Automatically sync completed run summaries and detected chart points.</p>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <button onClick={() => updateTargets('slack')} className={`rounded-xl border p-3 text-left ${deliveryTargets.includes('slack') ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
          <div className="flex items-center gap-2"><Slack className="w-4 h-4 text-primary" /><p className="text-xs font-semibold text-foreground">Slack sync</p></div>
          <p className="mt-1 text-[10px] text-muted-foreground">Push run summaries and chart data to Slack when a run completes.</p>
        </button>
        <button onClick={() => updateTargets('notion')} className={`rounded-xl border p-3 text-left ${deliveryTargets.includes('notion') ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
          <div className="flex items-center gap-2"><NotebookPen className="w-4 h-4 text-primary" /><p className="text-xs font-semibold text-foreground">Notion sync</p></div>
          <p className="mt-1 text-[10px] text-muted-foreground">Create a Notion page with the summary and chart points after each run.</p>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => connectTarget(SLACK_CONNECTOR_ID)} className="rounded-xl border border-border px-3 py-2 text-[11px] text-muted-foreground">Connect Slack</button>
        <button onClick={() => connectTarget(NOTION_CONNECTOR_ID)} className="rounded-xl border border-border px-3 py-2 text-[11px] text-muted-foreground">Connect Notion</button>
      </div>
    </div>
  );
}