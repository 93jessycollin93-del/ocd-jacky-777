import { Newspaper, ExternalLink } from 'lucide-react';

const NEWS_ITEMS = [
  {
    title: 'Inflation cools more than expected as markets price in rate cuts',
    source: 'Market Watch',
    impact: 'Rates-sensitive assets may gain if easing expectations continue.',
    href: 'https://www.reuters.com/'
  },
  {
    title: 'Bitcoin ETF flows remain strong amid broader crypto rebound',
    source: 'Crypto Markets',
    impact: 'Positive sentiment may support large-cap digital assets.',
    href: 'https://www.coindesk.com/'
  },
  {
    title: 'Tech earnings beat forecasts, lifting growth benchmarks',
    source: 'Equity News',
    impact: 'Growth-heavy portfolios could outperform broad indices short term.',
    href: 'https://www.bloomberg.com/'
  }
];

export default function NewsFeedWidget() {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-start gap-2 mb-3">
        <Newspaper className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Financial News Feed</h3>
      </div>
      <div className="space-y-2">
        {NEWS_ITEMS.map((item) => (
          <a
            key={item.title}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl bg-secondary/50 border border-border px-3 py-3 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-relaxed">{item.title}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{item.source}</p>
                <p className="text-[10px] text-primary mt-2 leading-relaxed">{item.impact}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}