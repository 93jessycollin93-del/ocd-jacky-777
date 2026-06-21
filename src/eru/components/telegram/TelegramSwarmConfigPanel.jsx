import { Copy, Network } from 'lucide-react';

const FRONT_DOOR_ROLES = [
  { value: 'general', label: 'General entry' },
  { value: 'sales', label: 'Sales entry' },
  { value: 'support', label: 'Support entry' },
  { value: 'ops', label: 'Ops entry' },
  { value: 'custom', label: 'Custom entry' },
];

const EXECUTION_MODES = [
  { value: 'targeted', label: 'Targeted routing' },
  { value: 'tiered', label: 'Tiered routing' },
  { value: 'wide', label: 'Wide routing' },
];

export default function TelegramSwarmConfigPanel({ bots, form, setForm, onCloneSpecialist }) {
  const routerBotId = form.router_bot_id || '';
  const specialistBotIds = form.specialist_bot_ids || [];

  const toggleSpecialist = (botId) => {
    setForm((prev) => ({
      ...prev,
      specialist_bot_ids: (prev.specialist_bot_ids || []).includes(botId)
        ? prev.specialist_bot_ids.filter((id) => id !== botId)
        : [...(prev.specialist_bot_ids || []), botId]
    }));
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Network className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Internal agent swarm</p>
      </div>
      <p className="text-[11px] text-muted-foreground">One Telegram bot acts as the front door while routing work to internal specialist bots.</p>

      <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground">
        <input
          type="checkbox"
          checked={!!form.swarm_enabled}
          onChange={(e) => setForm((prev) => ({ ...prev, swarm_enabled: e.target.checked }))}
          className="accent-primary"
        />
        Enable swarm routing for this Telegram bot
      </label>

      {form.swarm_enabled && (
        <>
          <select
            value={routerBotId}
            onChange={(e) => setForm((prev) => ({ ...prev, router_bot_id: e.target.value }))}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
          >
            <option value="">Choose router bot</option>
            {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
          </select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={form.front_door_role || 'general'}
              onChange={(e) => setForm((prev) => ({ ...prev, front_door_role: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
            >
              {FRONT_DOOR_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
            <select
              value={form.swarm_execution_mode || 'targeted'}
              onChange={(e) => setForm((prev) => ({ ...prev, swarm_execution_mode: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
            >
              {EXECUTION_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="number"
              min="1"
              max="1000"
              value={form.backend_swarm_size || 25}
              onChange={(e) => setForm((prev) => ({ ...prev, backend_swarm_size: Number(e.target.value || 25) }))}
              placeholder="Backend swarm size"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
            />
            <input
              type="number"
              min="1"
              max="24"
              value={form.max_specialists_per_request || 6}
              onChange={(e) => setForm((prev) => ({ ...prev, max_specialists_per_request: Number(e.target.value || 6) }))}
              placeholder="Max specialists per request"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
            />
          </div>

          <textarea
            value={form.swarm_goal_template || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, swarm_goal_template: e.target.value }))}
            placeholder="Optional router instructions for Telegram requests"
            className="w-full min-h-[80px] rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none resize-none"
          />

          <div className="rounded-xl border border-border bg-background px-3 py-2.5 text-[11px] text-muted-foreground">
            Front-door bots can represent very large backend swarms while only activating a capped subset per request.
          </div>

          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">Specialist bots</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {bots.filter((bot) => bot.id !== routerBotId).map((bot) => {
                const active = specialistBotIds.includes(bot.id);
                return (
                  <div
                    key={bot.id}
                    className={`w-full rounded-xl border px-3 py-2.5 text-xs transition-all ${active ? 'border-primary bg-primary/10' : 'border-border bg-background'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => toggleSpecialist(bot.id)}
                        className={`flex-1 min-w-0 text-left ${active ? 'text-primary' : 'text-foreground'}`}
                      >
                        <p className="font-semibold truncate">{bot.name}</p>
                        <p className={`mt-1 text-[11px] ${active ? 'text-primary/80' : 'text-muted-foreground'}`}>{bot.role}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => onCloneSpecialist?.(bot)}
                        className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground"
                        title="Clone specialist"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}