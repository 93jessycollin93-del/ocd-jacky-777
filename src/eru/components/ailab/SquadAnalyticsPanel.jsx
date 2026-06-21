import { BarChart3, Trophy } from 'lucide-react';

const ROLE_EMOJI = { assistant: '🤖', trader: '📈', game_helper: '🎮', social: '💬', security: '🛡️', custom: '⚙️' };

function getCategoryLabel(keyword) {
  return keyword.charAt(0).toUpperCase() + keyword.slice(1);
}

export default function SquadAnalyticsPanel({ analytics }) {
  if (!analytics || analytics.botRows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No squad analytics yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold text-foreground">Squad analytics</p>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">Track which specialists succeed most often and which keywords they perform best on.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-[1.2fr,1fr]">
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Bot success rates</p>
          </div>
          <div className="space-y-2">
            {analytics.botRows.map((row) => (
              <div key={row.bot.id} className="rounded-xl border border-border bg-secondary/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{ROLE_EMOJI[row.bot.role] || '🤖'}</span>
                      <p className="text-xs font-semibold text-foreground">{row.bot.name}</p>
                    </div>
                    <p className="mt-1 text-[10px] capitalize text-muted-foreground">{row.bot.role} · {row.successes} successful runs</p>
                  </div>
                  <p className="text-sm font-bold text-primary">{row.successRate}%</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${row.successRate}%` }} />
                </div>
                {row.topKeywords.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {row.topKeywords.map((keyword) => (
                      <span key={keyword} className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] text-primary">
                        {getCategoryLabel(keyword)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-3">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Keyword leaders</p>
          <div className="space-y-2">
            {analytics.keywordRows.map((row) => (
              <div key={row.keyword} className="rounded-xl border border-border bg-secondary/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground">{getCategoryLabel(row.keyword)}</p>
                  <p className="text-[10px] text-primary">{row.count} hits</p>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Top bot: {row.topBotName}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}