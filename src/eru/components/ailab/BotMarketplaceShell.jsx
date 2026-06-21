import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Layers3 } from 'lucide-react';
import DiscoverMarketplace from './DiscoverMarketplace';

export default function BotMarketplaceShell({ onInstalled, embedded = false }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
              <Layers3 className="h-3.5 w-3.5" /> Bot Marketplace
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Discover, install, and share AI bot templates</h2>
              <p className="text-sm text-muted-foreground">Browse public bots by industry and functionality, install proven templates, use ratings and reviews, and spot trending bot packs faster.</p>
            </div>
          </div>
          {embedded && (
            <Link to="/bot-marketplace" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
              <Bot className="h-4 w-4" /> Open full marketplace <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      <DiscoverMarketplace onInstalled={onInstalled} embedded={embedded} />
    </div>
  );
}