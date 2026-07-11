import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, GripVertical } from 'lucide-react';

const STORAGE_KEY = 'dashboard_panel_manager_v1';

const DEFAULT_PANELS = [
  { id: 'collector-rewards', label: 'Collector Reward Status', visible: true },
  { id: 'active-bots', label: 'Active Bots', visible: true },
  { id: 'quick-stats', label: 'Quick Stats', visible: true },
  { id: 'telegram-revenue', label: 'Telegram Revenue', visible: true },
  { id: 'knowledge-gaps', label: 'Knowledge Gaps', visible: true },
];

function loadPanels() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!Array.isArray(stored)) return DEFAULT_PANELS;
    return DEFAULT_PANELS.map((panel) => stored.find((item) => item.id === panel.id) || panel);
  } catch {
    return DEFAULT_PANELS;
  }
}

function PanelCard({ panel, children, editing, onToggle, onDragStart, onDragOver, onDrop }) {
  if (!panel.visible && !editing) return null;

  return (
    <div
      draggable={editing}
      onDragStart={() => onDragStart(panel.id)}
      onDragOver={onDragOver}
      onDrop={() => onDrop(panel.id)}
      className={editing ? 'relative' : ''}
    >
      {editing && (
        <div className="mb-2 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{panel.label}</span>
          </div>
          <button
            onClick={() => onToggle(panel.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground"
          >
            {panel.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {panel.visible ? 'Visible' : 'Hidden'}
          </button>
        </div>
      )}
      <div className={!panel.visible ? 'opacity-45' : ''}>{children}</div>
    </div>
  );
}

export default function DashboardPanelManager({ collectorRewards, activeBots, quickStats, telegramRevenue, knowledgeGaps }) {
  const [editing, setEditing] = useState(false);
  const [panels, setPanels] = useState(DEFAULT_PANELS);
  const [dragId, setDragId] = useState(null);

  useEffect(() => {
    setPanels(loadPanels());
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(panels));
  }, [panels]);

  const panelMap = useMemo(() => ({
    'collector-rewards': collectorRewards,
    'active-bots': activeBots,
    'quick-stats': quickStats,
    'telegram-revenue': telegramRevenue,
    'knowledge-gaps': knowledgeGaps,
  }), [collectorRewards, activeBots, quickStats, telegramRevenue, knowledgeGaps]);

  const toggleVisibility = (id) => {
    setPanels((prev) => prev.map((panel) => panel.id === id ? { ...panel, visible: !panel.visible } : panel));
  };

  const handleDrop = (targetId) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }

    setPanels((prev) => {
      const next = [...prev];
      const fromIndex = next.findIndex((panel) => panel.id === dragId);
      const toIndex = next.findIndex((panel) => panel.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDragId(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Dashboard Panels</p>
          <p className="text-[11px] text-muted-foreground">Drag to reorder or hide panels for your workflow.</p>
        </div>
        <button
          onClick={() => setEditing((prev) => !prev)}
          className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground"
        >
          {editing ? 'Done' : 'Customize'}
        </button>
      </div>

      {panels.map((panel) => (
        <PanelCard
          key={panel.id}
          panel={panel}
          editing={editing}
          onToggle={toggleVisibility}
          onDragStart={setDragId}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {panelMap[panel.id]}
        </PanelCard>
      ))}
    </div>
  );
}