import { Crown, ShieldAlert, Users } from 'lucide-react';

function Node({ bot, active, onSelect }) {
  return (
    <button type="button" aria-pressed={active} onClick={() => onSelect(bot)} className={`rounded-xl border px-3 py-2 text-left transition-all ${active ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/30'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">{bot.bot_code}</p>
        <span className={`rounded-full px-2 py-0.5 text-[9px] capitalize ${bot.status === 'active' ? 'bg-primary/10 text-primary' : bot.status === 'caution' ? 'bg-yellow-500/10 text-yellow-300' : 'bg-secondary text-muted-foreground'}`}>{bot.status}</span>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{bot.display_name}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{bot.specialty}</p>
    </button>
  );
}

function SquadColumn({ title, lead, nodes, selectedBot, onSelectBot }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3 space-y-3">
      <div className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" aria-hidden="true" /><p className="text-[11px] font-semibold text-foreground">{title}</p></div>
      {lead && <Node bot={lead} active={selectedBot?.bot_code === lead.bot_code} onSelect={onSelectBot} />}
      <div className="grid gap-2 sm:grid-cols-2">{nodes.map((bot) => <Node key={bot.bot_code} bot={bot} active={selectedBot?.bot_code === bot.bot_code} onSelect={onSelectBot} />)}</div>
    </div>
  );
}

export default function CommandCenterHierarchy({ bots, selectedBot, onSelectBot }) {
  const byCode = Object.fromEntries((bots || []).map((bot) => [bot.bot_code, bot]));
  const alpha = bots.filter((bot) => bot.squad_name === 'alpha' && bot.role_type === 'squad');
  const beta = bots.filter((bot) => bot.squad_name === 'beta' && bot.role_type === 'squad');
  const charlie = bots.filter((bot) => bot.squad_name === 'charlie' && bot.role_type === 'squad');
  const delta = bots.filter((bot) => bot.squad_name === 'delta' && bot.role_type === 'squad');
  const security = bots.filter((bot) => bot.role_type === 'security');

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-4" aria-labelledby="hierarchy-heading">
      <div>
        <h3 id="hierarchy-heading" className="text-sm font-semibold text-foreground">Hierarchy Visualization</h3>
        <p className="text-[11px] text-muted-foreground">Each node stays linked to missions, assignments, and routed communications.</p>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-primary"><Crown className="w-4 h-4" aria-hidden="true" /><p className="text-[11px] font-semibold">Leader Command</p></div>
          {byCode.L420 && <Node bot={byCode.L420} active={selectedBot?.bot_code === 'L420'} onSelect={onSelectBot} />}
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          <SquadColumn title="AC01 → Alpha + Charlie" lead={byCode.AC01} nodes={[...alpha, ...charlie]} selectedBot={selectedBot} onSelectBot={onSelectBot} />
          <SquadColumn title="AC02 → Beta + Delta" lead={byCode.AC02} nodes={[...beta, ...delta]} selectedBot={selectedBot} onSelectBot={onSelectBot} />
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-red-300"><ShieldAlert className="w-4 h-4" aria-hidden="true" /><p className="text-[11px] font-semibold">Security Intelligence</p></div>
          <div className="grid gap-2 sm:grid-cols-2">{security.map((bot) => <Node key={bot.bot_code} bot={bot} active={selectedBot?.bot_code === bot.bot_code} onSelect={onSelectBot} />)}</div>
        </div>
      </div>
    </section>
  );
}