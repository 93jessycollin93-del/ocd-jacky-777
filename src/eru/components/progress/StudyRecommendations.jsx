import { useEffect, useState } from 'react';
import { BookOpen, TrendingUp, AlertCircle, ChevronRight, Loader2, Star } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

/**
 * StudyRecommendations
 * Reads the user's UserProgress records and all StudyModules, then
 * computes which modules to tackle next:
 *  - Struggling: in_progress but low completion (< 50%)
 *  - Up next: not_started prereqs are satisfied by completed modules
 *  - Review: completed long ago (> 7 days)
 */

const DIFFICULTY_COLOR = {
  beginner:     'text-emerald-400 bg-emerald-400/10',
  intermediate: 'text-yellow-400 bg-yellow-400/10',
  advanced:     'text-orange-400 bg-orange-400/10',
  expert:       'text-red-400 bg-red-400/10',
};

const CATEGORY_LABEL = {
  foundations:      'Foundations',
  static_analysis:  'Static Analysis',
  dynamic_analysis: 'Dynamic Analysis',
  advanced:         'Advanced',
  practical:        'Practical',
};

function ModuleCard({ module, reason, reasonColor, onClick }) {
  return (
    <button
      onClick={() => onClick?.(module)}
      className="w-full flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3 text-left hover:bg-secondary/60 transition-colors"
    >
      <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
        <BookOpen className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{module.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${DIFFICULTY_COLOR[module.difficulty] || 'text-muted-foreground bg-muted/30'}`}>
            {module.difficulty}
          </span>
          {module.category && (
            <span className="text-[10px] text-muted-foreground">
              {CATEGORY_LABEL[module.category] || module.category}
            </span>
          )}
          {module.estimated_time_minutes > 0 && (
            <span className="text-[10px] text-muted-foreground">
              ~{module.estimated_time_minutes}m
            </span>
          )}
        </div>
        <p className={`text-[11px] mt-1 font-medium ${reasonColor}`}>{reason}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
    </button>
  );
}

function Section({ title, icon: Icon, iconClass, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export default function StudyRecommendations({ onModuleClick }) {
  const [loading, setLoading] = useState(true);
  const [struggling, setStruggling] = useState([]);
  const [upNext, setUpNext] = useState([]);
  const [reviewDue, setReviewDue] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const [allModules, allProgress] = await Promise.all([
        base44.entities.StudyModule.list('-chapter_number', 200).catch(() => []),
        base44.entities.UserProgress.list('-updated_date', 500).catch(() => []),
      ]);
      if (!mounted) return;

      const progressByModule = {};
      for (const p of allProgress) progressByModule[p.module_id] = p;

      const completedIds = new Set(
        allProgress.filter((p) => p.status === 'completed').map((p) => p.module_id)
      );

      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      const _struggling = [];
      const _upNext = [];
      const _review = [];

      for (const mod of allModules) {
        const prog = progressByModule[mod.id];

        if (!prog || prog.status === 'not_started') {
          // Up next: all prerequisites completed (or no prereqs)
          const prereqs = mod.prerequisites || [];
          const prereqsMet = prereqs.every((pid) => completedIds.has(pid));
          if (prereqsMet && _upNext.length < 3) _upNext.push(mod);

        } else if (prog.status === 'in_progress') {
          const pct = prog.completion_percentage || 0;
          if (pct < 50) _struggling.push({ mod, pct });

        } else if (prog.status === 'completed' && prog.completed_date) {
          const completedAt = new Date(prog.completed_date).getTime();
          if (now - completedAt > sevenDays && _review.length < 2) _review.push(mod);
        }
      }

      // Sort struggling by lowest completion first
      _struggling.sort((a, b) => a.pct - b.pct);

      if (!mounted) return;
      setStruggling(_struggling.slice(0, 3).map((s) => s.mod));
      setUpNext(_upNext);
      setReviewDue(_review);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const hasAny = struggling.length > 0 || upNext.length > 0 || reviewDue.length > 0;

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading recommendations…</span>
      </div>
    );
  }

  if (!hasAny) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        No study modules found. Add some modules to get recommendations.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Study Recommendations</h2>
      </div>

      {struggling.length > 0 && (
        <Section title="Needs attention" icon={AlertCircle} iconClass="text-orange-400">
          {struggling.map((mod) => (
            <ModuleCard
              key={mod.id}
              module={mod}
              reason="You started this but got stuck — pick it back up"
              reasonColor="text-orange-400"
              onClick={onModuleClick}
            />
          ))}
        </Section>
      )}

      {upNext.length > 0 && (
        <Section title="Up next" icon={TrendingUp} iconClass="text-primary">
          {upNext.map((mod) => (
            <ModuleCard
              key={mod.id}
              module={mod}
              reason="Prerequisites met — ready to start"
              reasonColor="text-primary"
              onClick={onModuleClick}
            />
          ))}
        </Section>
      )}

      {reviewDue.length > 0 && (
        <Section title="Due for review" icon={BookOpen} iconClass="text-blue-400">
          {reviewDue.map((mod) => (
            <ModuleCard
              key={mod.id}
              module={mod}
              reason="Completed 7+ days ago — worth revisiting"
              reasonColor="text-blue-400"
              onClick={onModuleClick}
            />
          ))}
        </Section>
      )}
    </div>
  );
}