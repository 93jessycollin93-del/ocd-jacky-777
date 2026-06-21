import { useState, useEffect } from 'react';
import { Send, Copy, CheckCircle2, AlertCircle, Loader2, LinkIcon, Trash2 } from 'lucide-react';
import { useAuth } from '@/eru/lib/AuthContext';
import {
  getTelegramAccount,
  initiateTelegramLinking,
  updateTelegramNotifications,
  revokeTelegramAccount,
} from '@/eru/lib/telegramConnector';
import { toast } from 'sonner';

const NOTIFICATION_TYPES = [
  { id: 'trades', label: 'Trade Alerts' },
  { id: 'purchases', label: 'Purchase Confirmations' },
  { id: 'rewards', label: 'Reward Notifications' },
  { id: 'messages', label: 'Direct Messages' },
  { id: 'alerts', label: 'System Alerts' },
];

export default function TelegramSettings() {
  const { currentUser } = useAuth();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [linkingCode, setLinkingCode] = useState(null);
  const [selectedNotifications, setSelectedNotifications] = useState([]);

  useEffect(() => {
    const loadAccount = async () => {
      if (!currentUser?.email) return;
      const tgAccount = await getTelegramAccount(currentUser.email);
      setAccount(tgAccount);
      if (tgAccount?.notification_types) {
        setSelectedNotifications(tgAccount.notification_types);
      }
      setLoading(false);
    };
    loadAccount();
  }, [currentUser]);

  const handleInitiateLinking = async () => {
    setLinking(true);
    const result = await initiateTelegramLinking(currentUser.email);
    setLinking(false);

    if (result.success) {
      setLinkingCode(result.linking_code);
      toast.success('Linking code generated. Send to bot to verify.');
    } else {
      toast.error(result.error || 'Failed to initiate linking');
    }
  };

  const handleToggleNotification = async (notifType) => {
    const updated = selectedNotifications.includes(notifType)
      ? selectedNotifications.filter((t) => t !== notifType)
      : [...selectedNotifications, notifType];

    setSelectedNotifications(updated);

    if (account?.id) {
      const result = await updateTelegramNotifications(
        account.id,
        account.notifications_enabled,
        updated
      );
      if (!result.success) {
        toast.error('Failed to update preferences');
      }
    }
  };

  const handleToggleNotifications = async (enabled) => {
    if (account?.id) {
      const result = await updateTelegramNotifications(account.id, enabled, selectedNotifications);
      if (result.success) {
        setAccount({ ...account, notifications_enabled: enabled });
        toast.success(enabled ? 'Notifications enabled' : 'Notifications disabled');
      } else {
        toast.error('Failed to update notifications');
      }
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm('Unlink Telegram account? You can re-link anytime.')) return;

    if (account?.id) {
      const result = await revokeTelegramAccount(account.id);
      if (result.success) {
        setAccount(null);
        setLinkingCode(null);
        toast.success('Telegram account unlinked');
      } else {
        toast.error('Failed to unlink account');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Send className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Telegram Integration</h3>
      </div>

      {!account || account.status === 'revoked' ? (
        // Not linked
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div>
            <p className="text-sm text-foreground mb-2">Telegram not linked</p>
            <p className="text-xs text-muted-foreground">
              Link your Telegram account to receive notifications and use bot commands for real-time updates.
            </p>
          </div>

          {!linkingCode ? (
            <button
              onClick={handleInitiateLinking}
              disabled={linking}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
              Generate Linking Code
            </button>
          ) : (
            <div className="space-y-3 bg-secondary/50 border border-border rounded-lg p-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Your Linking Code</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono bg-background rounded px-2 py-1.5">
                    {linkingCode}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(linkingCode);
                      toast.success('Code copied');
                    }}
                    className="p-1.5 hover:bg-background rounded transition-colors"
                  >
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5">
                <p className="text-[10px] text-blue-300">
                  <strong>Next:</strong> Send this code to our bot: <code>/link {linkingCode}</code>
                </p>
              </div>

              <p className="text-[10px] text-muted-foreground text-center">
                Bot link: <a href="https://t.me/your_bot_username" className="text-primary underline">@YourBot</a>
              </p>
            </div>
          )}
        </div>
      ) : (
        // Linked
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm font-medium text-foreground">Telegram Linked</p>
                <p className="text-xs text-muted-foreground">
                  {account.telegram_username ? `@${account.telegram_username}` : account.telegram_user_id}
                </p>
              </div>
            </div>
            <button
              onClick={handleRevoke}
              className="p-1.5 hover:bg-red-500/10 rounded transition-colors text-red-400"
              title="Unlink Telegram"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Notifications</p>
              <button
                onClick={() => handleToggleNotifications(!account.notifications_enabled)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  account.notifications_enabled ? 'bg-primary' : 'bg-secondary border border-border'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    account.notifications_enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {account.notifications_enabled && (
              <div className="space-y-2">
                {NOTIFICATION_TYPES.map(({ id, label }) => (
                  <label key={id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(id)}
                      onChange={() => handleToggleNotification(id)}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="text-sm text-foreground">{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {account.last_notified_at && (
            <p className="text-[10px] text-muted-foreground text-center border-t border-border pt-3">
              Last notification: {new Date(account.last_notified_at).toLocaleString()}
            </p>
          )}
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-blue-300 leading-relaxed">
            <strong>Bot Commands:</strong> Once linked, use /balance, /inventory, /market, /orders in Telegram to interact with your account.
          </p>
        </div>
      </div>
    </div>
  );
}