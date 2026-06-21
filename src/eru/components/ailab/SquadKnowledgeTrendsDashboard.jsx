import { useMemo, useState } from 'react';
import { Network, Search, TrendingUp, Bot, FileText } from 'lucide-react';

const COLORS = [
  'bg-primary/15 text-primary border-primary/20',
  'bg-blue-400/15 text-blue-400 border-blue-400/20',
  'bg-purple-400/15 text-purple-400 border-purple-400/20',
  'bg-yellow-400/15 text-yellow-400 border-yellow-400/20',
  'bg-pink-400/15 text-pink-400 border-pink-400/20',
];

function StatCard({ icon: IconComponent, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-primary">
        <IconComponent className="w-4 h-4" />
        <p className="text-xs font-semibold text-foreground">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function SquadKnowledgeTrendsDashboard({ knowledgeItems = [], bots = [] }) {
  const [search, setSearch] = useState('');
  const botNameMap = useMemo(() => Object.fromEntries((bots || []).map((bot) => [bot.id, bot.name])), [bots]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return knowledgeItems;
    return knowledgeItems.filter((item) => {
      const text = [item.goal, item.result_summary, item.final_output, item.source_squad_name, ...(item.keywords || []), ...(item.ai_keywords || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(query);
    });
  }, [knowledgeItems, search]);

  const trendData = useMemo(() => {
    const keywordMap = new Map();
    const botMap = new Map();
    const outcomeLinks = [];

    filteredItems.forEach((item) => {
      const keywords = [...new Set([...(item.keywords || []), ...(item.ai_keywords || [])].map((word) => String(word).trim()).filter(Boolean))].slice(0, 8);
      const shortOutcome = String(item.result_summary || item.final_output || '').slice(0, 140);

      keywords.forEach((keyword) => {
        const lower = keyword.toLowerCase();
        if (!keywordMap.has(lower)) {
          keywordMap.set(lower, {
            keyword,
            count: 0,
            goals: new Set(),
            outcomes: new Set(),
            bots: new Set(),
          });
        }
        const entry = keywordMap.get(lower);
        entry.count += 1;
        entry.goals.add(item.goal || 'Untitled goal');
        if (shortOutcome) entry.outcomes.add(shortOutcome);
        (item.bot_ids || []).forEach((botId) => entry.bots.add(botId));
      });

      (item.bot_ids || []).forEach((botId) => {
        if (!botMap.has(botId)) {
          botMap.set(botId, {
            botId,
            count: 0,
            goals: new Set(),
            outcomes: new Set(),
          });
        }
        const botEntry = botMap.get(botId);
        botEntry.count += 1;
        botEntry.goals.add(item.goal || 'Untitled goal');
        if (shortOutcome) botEntry.outcomes.add(shortOutcome);
      });

      keywords.slice(0, 3).forEach((keyword) => {
        outcomeLinks.push({
          goal: item.goal || 'Untitled goal',
          keyword,
          outcome: shortOutcome || 'No outcome summary available',
          specialists: (item.bot_ids || []).map((botId) => botNameMap[botId] || 'Unknown bot').slice(0, 3),
        });
      });
    });

    return {
      topKeywords: [...keywordMap.values()].sort((a, b) => b.count - a.count).slice(0, 16),
      topBots: [...botMap.values()].sort((a, b) => b.count - a.count).slice(0, 12),
      outcomeLinks: outcomeLinks.slice(0, 24),
    };
  }, [filteredItems, botNameMap]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-semibold text-foreground">Squad Knowledge Trends</p>
        <p className="mt-1 text-xs text-muted-foreground">Map how successful goals connect to specialist bots and final outcomes to spot repeat winning patterns faster.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard icon={FileText} label="Knowledge records" value={filteredItems.length} hint="Successful runs available for pattern analysis" />
        <StatCard icon={Network} label="Goal-outcome links" value={trendData.outcomeLinks.length} hint="Visible mapped connections in the current view" />
        <StatCard icon={Bot} label="Specialists involved" value={trendData.topBots.length} hint="Bots contributing to the filtered successful runs" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search goals, keywords, outcomes, or squads..."
            className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Top recurring success themes</p>
        </div>
        {trendData.topKeywords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {trendData.topKeywords.map((item, index) => (
              <div key={`${item.keyword}-${index}`} className={`rounded-2xl border px-3 py-2 ${COLORS[index % COLORS.length]}`}>
                <p className="text-xs font-semibold capitalize">{item.keyword}</p>
                <p className="text-[10px] opacity-80">{item.count} successful runs · {item.bots.size} specialists</p>
                <p className="mt-1 max-w-[220px] text-[10px] opacity-80 line-clamp-2">{[...item.goals][0]}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No trends found for this search.</div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Goal → specialists → outcome map</p>
          </div>
          {trendData.outcomeLinks.length > 0 ? (
            <div className="space-y-2">
              {trendData.outcomeLinks.map((link, index) => (
                <div key={`${link.goal}-${link.keyword}-${index}`} className="rounded-xl border border-border bg-background p-3">
                  <p className="text-xs font-semibold text-foreground">{link.goal}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-primary">{link.keyword}</span>
                    <span>→</span>
                    <span>{link.specialists.join(', ') || 'No specialists listed'}</span>
                    <span>→</span>
                    <span className="line-clamp-1">{link.outcome}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No mapped connections yet.</div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Most used specialists</p>
          </div>
          {trendData.topBots.length > 0 ? (
            <div className="space-y-2">
              {trendData.topBots.map((item, index) => (
                <div key={item.botId || index} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{botNameMap[item.botId] || 'Unknown bot'}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{item.count} successful appearances</p>
                    </div>
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">#{index + 1}</span>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground line-clamp-2">Latest goal: {[...item.goals][0]}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No specialist trends yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}