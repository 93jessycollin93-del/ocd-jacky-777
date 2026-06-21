import { Shield, Send, Smartphone } from 'lucide-react';

export default function TelegramFirstBanner() {
  return (
    <div className="bg-gradient-to-r from-[#0088cc]/15 to-primary/10 border border-[#0088cc]/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Send className="w-4 h-4 text-[#0088cc]" />
        <h3 className="text-sm font-semibold">Telegram-first app shell</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
        <div className="bg-background/60 rounded-lg p-3 border border-border flex items-center gap-2">
          <Smartphone className="w-3.5 h-3.5 text-primary" /> Optimized for mobile webviews
        </div>
        <div className="bg-background/60 rounded-lg p-3 border border-border flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-primary" /> Safer session and notification flows
        </div>
        <div className="bg-background/60 rounded-lg p-3 border border-border flex items-center gap-2">
          <Send className="w-3.5 h-3.5 text-primary" /> Ready for Telegram distribution
        </div>
      </div>
    </div>
  );
}