import { Shield, Users, Crown } from 'lucide-react';

function BotPickButton({ bot, active, onClick }) {
  return (
    <button onClick={onClick} className={`rounded-xl border p-2 text-left ${active ? 'border-primary bg-primary/10' : 'border-border bg-background'}`}>
      <p className="text-xs font-semibold text-foreground truncate">{bot.name}</p>
      <p className="text-[10px] text-muted-foreground capitalize">{bot.role}</p>
    </button>
  );
}

export default function SquadFormationBuilder({ bots, form, setForm }) {
  const groupedBotIds = (form.task_groups || []).flatMap((group) => group.bot_ids || []);

  const toggleCommander = (botId) => {
    setForm((prev) => ({
      ...prev,
      commander_bot_ids: prev.commander_bot_ids.includes(botId)
        ? prev.commander_bot_ids.filter((id) => id !== botId)
        : prev.commander_bot_ids.length >= 2
          ? prev.commander_bot_ids
          : [...prev.commander_bot_ids, botId],
    }));
  };

  const toggleSecurity = (botId) => {
    setForm((prev) => ({
      ...prev,
      security_bot_ids: prev.security_bot_ids.includes(botId)
        ? prev.security_bot_ids.filter((id) => id !== botId)
        : prev.security_bot_ids.length >= 2
          ? prev.security_bot_ids
          : [...prev.security_bot_ids, botId],
    }));
  };

  const updateGroup = (groupId, next) => {
    setForm((prev) => ({
      ...prev,
      task_groups: prev.task_groups.map((group) => group.id === groupId ? { ...group, ...next } : group),
    }));
  };

  const toggleGroupBot = (groupId, botId) => {
    setForm((prev) => ({
      ...prev,
      task_groups: prev.task_groups.map((group) => {
        if (group.id !== groupId) return group;
        const exists = (group.bot_ids || []).includes(botId);
        if (exists) {
          return { ...group, bot_ids: group.bot_ids.filter((id) => id !== botId) };
        }
        if ((group.bot_ids || []).length >= 5) {
          return group;
        }
        return { ...group, bot_ids: [...(group.bot_ids || []), botId] };
      }),
    }));
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-background p-3">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Crown className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold text-foreground">Structured squad formation</p>
        </div>
        <p className="text-[10px] text-muted-foreground">Pick 1 leader, 2 commander bots, 2 security bots, and up to 20 task bots split into 4 groups of 5.</p>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Commander bots (2)</p>
        <div className="grid gap-2 md:grid-cols-2">
          {bots.map((bot) => (
            <BotPickButton key={bot.id} bot={bot} active={(form.commander_bot_ids || []).includes(bot.id)} onClick={() => toggleCommander(bot.id)} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Security bots (2)</p>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {bots.map((bot) => (
            <BotPickButton key={bot.id} bot={bot} active={(form.security_bot_ids || []).includes(bot.id)} onClick={() => toggleSecurity(bot.id)} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Task groups</p>
        </div>
        {(form.task_groups || []).map((group, index) => (
          <div key={group.id} className="rounded-xl border border-border bg-secondary/20 p-3 space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <input value={group.name} onChange={(e) => updateGroup(group.id, { name: e.target.value })} placeholder={`Group ${index + 1} name`} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none" />
              <input value={group.purpose} onChange={(e) => updateGroup(group.id, { purpose: e.target.value })} placeholder="Purpose" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none" />
            </div>
            <textarea value={group.task_instruction} onChange={(e) => updateGroup(group.id, { task_instruction: e.target.value })} placeholder="Task for this group - can match other groups or be completely different" className="min-h-[70px] w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none resize-none" />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-muted-foreground">{(group.bot_ids || []).length}/5 bots selected</p>
              <p className="text-[10px] text-muted-foreground">Total task bots: {groupedBotIds.length}/20</p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {bots.map((bot) => {
                const inThisGroup = (group.bot_ids || []).includes(bot.id);
                const inOtherGroup = groupedBotIds.includes(bot.id) && !inThisGroup;
                return (
                  <button
                    key={bot.id}
                    onClick={() => !inOtherGroup && toggleGroupBot(group.id, bot.id)}
                    disabled={inOtherGroup}
                    className={`rounded-xl border p-2 text-left ${inThisGroup ? 'border-primary bg-primary/10' : 'border-border bg-background'} ${inOtherGroup ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <p className="text-xs font-semibold text-foreground truncate">{bot.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{bot.role}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}