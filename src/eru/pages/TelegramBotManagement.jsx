import TelegramBotDashboard from '@/eru/components/telegram/TelegramBotDashboard';
import { Bot } from 'lucide-react';

export default function TelegramBotManagement() {
  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-24 space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Telegram Bot Management</h1>
            <p className="text-sm text-muted-foreground">Centralized control center for creating, configuring, and monitoring multiple Telegram bots.</p>
          </div>
        </div>
      </div>
      <TelegramBotDashboard />
    </div>
  );
}