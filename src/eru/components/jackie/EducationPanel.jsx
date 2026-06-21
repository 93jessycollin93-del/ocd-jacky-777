import { BookOpen, ExternalLink, Video, GraduationCap } from 'lucide-react';

const RESOURCES = [
  {
    title: 'Investment Basics',
    type: 'Article',
    icon: BookOpen,
    href: 'https://www.investor.gov/introduction-investing/investing-basics'
  },
  {
    title: 'Portfolio Diversification',
    type: 'Article',
    icon: GraduationCap,
    href: 'https://www.investor.gov/introduction-investing/investing-basics/diversification'
  },
  {
    title: 'Market Risk Explained',
    type: 'Video',
    icon: Video,
    href: 'https://www.youtube.com/watch?v=WEDIj9JBTC8'
  },
  {
    title: 'ETF & Asset Allocation Webinar',
    type: 'Webinar',
    icon: ExternalLink,
    href: 'https://www.investopedia.com/'
  }
];

export default function EducationPanel({ onResourceOpen }) {
  return (
    <div className="space-y-3">
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-1">Educational Content</h3>
        <p className="text-xs text-muted-foreground">Helpful resources for learning core investing concepts and financial decision-making.</p>
      </div>
      <div className="grid gap-2">
        {RESOURCES.map((resource) => {
          const Icon = resource.icon;
          return (
            <a
              key={resource.title}
              href={resource.href}
              target="_blank"
              rel="noreferrer"
              onClick={onResourceOpen}
              className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 hover:border-primary/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{resource.title}</p>
                <p className="text-[10px] text-muted-foreground">{resource.type}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </a>
          );
        })}
      </div>
    </div>
  );
}