import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

function NotificationItem({ notification, onRead }) {
  return (
    <button
      onClick={() => !notification.is_read && onRead(notification.id)}
      className={`w-full text-left rounded-xl border p-3 transition-colors ${notification.is_read ? 'bg-card border-border opacity-70' : 'bg-primary/5 border-primary/20'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{notification.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
        </div>
        {!notification.is_read && <span className="mt-1 w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />}
      </div>
    </button>
  );
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadNotifications().catch(() => {});
    const unsubscribe = base44.entities.AppNotification.subscribe((event) => {
      if (event.type === 'create') {
        setNotifications((prev) => [event.data, ...prev.filter((item) => item.id !== event.id)].slice(0, 50));
      } else if (event.type === 'update') {
        setNotifications((prev) => prev.map((item) => item.id === event.id ? event.data : item));
      } else if (event.type === 'delete') {
        setNotifications((prev) => prev.filter((item) => item.id !== event.id));
      }
    });
    return unsubscribe;
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await base44.entities.AppNotification.list('-created_date', 50);
      setNotifications(data || []);
    } catch (error) {
      if (error?.status !== 429) {
        throw error;
      }
    }
  };

  const markAsRead = async (id) => {
    setNotifications((prev) => prev.map((item) => item.id === id ? { ...item, is_read: true } : item));
    await base44.entities.AppNotification.update(id, { is_read: true }).catch(() => {});
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((item) => unreadIds.includes(item.id) ? { ...item, is_read: true } : item));
    await Promise.allSettled(unreadIds.map((id) => base44.entities.AppNotification.update(id, { is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="text-xs text-primary flex items-center gap-1">
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">No notifications yet</div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} onRead={markAsRead} />
          ))
        )}
      </div>
    </div>
  );
}