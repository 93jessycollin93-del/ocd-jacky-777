import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { PencilLine, UsersRound } from 'lucide-react';

const DASHBOARD_KEY = 'main-dashboard';
const STORAGE_KEY = 'dashboard_panel_manager_v1';
const DEFAULT_PANELS = [
  { id: 'collector-rewards', visible: true },
  { id: 'active-bots', visible: true },
  { id: 'quick-stats', visible: true },
];

function loadPanels() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!Array.isArray(stored)) return DEFAULT_PANELS;
    return stored;
  } catch {
    return DEFAULT_PANELS;
  }
}

export default function SharedDashboardCollabBar() {
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef(null);

  const applyStateToStorage = (state) => {
    if (!state?.panel_order?.length) return;
    const next = state.panel_order.map((id) => ({ id, visible: !state.hidden_panel_ids?.includes(id) }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const syncLayout = async () => {
    const me = await base44.auth.me();
    if (!me) return;
    const panels = loadPanels();
    const payload = {
      dashboard_key: DASHBOARD_KEY,
      layout_name: 'Dashboard Panels',
      panel_order: panels.map((item) => item.id),
      hidden_panel_ids: panels.filter((item) => item.visible === false).map((item) => item.id),
      active_editor_email: me.email,
      last_edited_at: new Date().toISOString(),
    };

    const existing = await base44.entities.SharedDashboardState.filter({ dashboard_key: DASHBOARD_KEY }, '-updated_date', 1);
    if (existing?.[0]) {
      await base44.entities.SharedDashboardState.update(existing[0].id, payload);
    } else {
      await base44.entities.SharedDashboardState.create(payload);
    }
    setSaved(true);
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => setSaved(false), 1600);
  };

  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;

    const start = async () => {
      try {
        const existing = await base44.entities.SharedDashboardState.filter({ dashboard_key: DASHBOARD_KEY }, '-updated_date', 1);
        if (!isMounted) return;
        applyStateToStorage(existing?.[0]);
      } catch (error) {
        if (error?.status !== 429) {
          throw error;
        }
      }

      unsubscribe = base44.entities.SharedDashboardState.subscribe((event) => {
        if (event?.data?.dashboard_key !== DASHBOARD_KEY) return;
        if (event.type === 'delete') return;
        applyStateToStorage(event.data);
      });
    };

    start().catch(() => {});
    return () => {
      isMounted = false;
      window.clearTimeout(saveTimerRef.current);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UsersRound className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Shared dashboard collaboration</p>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Sync panel layout edits live and collaborate with comments and presence.</p>
        </div>
        <button onClick={syncLayout} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <PencilLine className="w-4 h-4" /> {saved ? 'Synced' : 'Sync my layout'}
        </button>
      </div>
    </div>
  );
}