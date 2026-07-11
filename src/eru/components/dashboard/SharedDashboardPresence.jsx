import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Users } from 'lucide-react';
import { maskEmail } from '@/eru/lib/privacy';

const DASHBOARD_KEY = 'main-dashboard';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
}

export default function SharedDashboardPresence() {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    let mounted = true;
    let unsubscribe = null;
    let heartbeat = null;
    let localSessionId = null;

    const applySessions = (data) => {
      if (!mounted) return;
      const now = Date.now();
      setSessions((data || []).filter((item) => now - new Date(item.last_seen_at || item.updated_date).getTime() < 120000));
    };

    const mergeSessionEvent = (currentSessions, event) => {
      if (event.type === 'create') {
        return [event.data, ...currentSessions.filter((item) => item.id !== event.id)].slice(0, 20);
      }
      if (event.type === 'update') {
        return currentSessions.map((item) => item.id === event.id ? event.data : item);
      }
      if (event.type === 'delete') {
        return currentSessions.filter((item) => item.id !== event.id);
      }
      return currentSessions;
    };

    const safeListSessions = async () => {
      const data = await base44.entities.SharedDashboardSession.filter({ dashboard_key: DASHBOARD_KEY }, undefined, 20);
      applySessions(data);
    };

    const boot = async () => {
      const me = await base44.auth.me();
      if (!me || !mounted) return;
      setUser(me);

      const existing = await base44.entities.SharedDashboardSession.filter({
        dashboard_key: DASHBOARD_KEY,
        user_email: me.email,
      }, undefined, 1);

      const payload = {
        dashboard_key: DASHBOARD_KEY,
        dashboard_name: 'Dashboard',
        user_email: me.email,
        user_name: me.full_name || me.email,
        status: 'active',
        current_widget: 'overview',
        last_seen_at: new Date().toISOString(),
      };

      let record = existing?.[0];
      record = record
        ? await base44.entities.SharedDashboardSession.update(record.id, payload)
        : await base44.entities.SharedDashboardSession.create(payload);

      if (!mounted) return;
      localSessionId = record.id;

      await safeListSessions();
      unsubscribe = base44.entities.SharedDashboardSession.subscribe((event) => {
        setSessions((current) => {
          const now = Date.now();
          return mergeSessionEvent(current, event).filter((item) => now - new Date(item.last_seen_at || item.updated_date).getTime() < 120000);
        });
      });

      heartbeat = window.setInterval(() => {
        base44.entities.SharedDashboardSession.update(record.id, {
          status: 'active',
          current_widget: 'overview',
          last_seen_at: new Date().toISOString(),
        }).catch(() => {});
      }, 120000);
    };

    boot().catch(() => {});

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
      if (heartbeat) window.clearInterval(heartbeat);
      if (localSessionId) {
        base44.entities.SharedDashboardSession.update(localSessionId, {
          status: 'idle',
          last_seen_at: new Date().toISOString(),
        }).catch(() => {});
      }
    };
  }, []);

  const activeSessions = useMemo(() => sessions.filter((item) => item.status === 'active'), [sessions]);

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Live presence</p>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">See who is active on this shared dashboard right now.</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-primary">{activeSessions.length}</p>
          <p className="text-[10px] text-muted-foreground">active now</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {activeSessions.length === 0 ? (
          <span className="text-xs text-muted-foreground">No active collaborators yet.</span>
        ) : activeSessions.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
              {initials(item.user_name || item.user_email)}
            </div>
            <div className="min-w-0">
              <p className="max-w-[120px] truncate text-xs font-medium">
                {item.user_email === user?.email
                  ? (item.user_name || 'You')
                  : (item.user_name || maskEmail(item.user_email))}
              </p>
              <p className="text-[10px] text-muted-foreground">{item.user_email === user?.email ? 'You' : 'Active now'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}