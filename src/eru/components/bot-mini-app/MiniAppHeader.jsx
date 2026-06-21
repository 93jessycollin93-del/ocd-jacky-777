import { Bot, ExternalLink } from 'lucide-react';

export default function MiniAppHeader({ bot }) {
  return (
    <div className="rounded-2xl border border-border bg-card/95 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-foreground truncate">{bot.name}</h1>
          <p className="text-xs text-muted-foreground line-clamp-2">{bot.description || 'Telegram mini-app bot workspace'}</p>
        </div>
        <a href="/ailab" className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary px-3 py-2 text-[11px] font-medium text-foreground">
          <ExternalLink className="w-3.5 h-3.5" /> Lab
        </a>
      </div>
    </div>
  );
}