import { useFeatureTracking } from '../hooks/useFeatureTracking';
import {
  Users, Radio, Sparkles, MessagesSquare,
  BarChart2, Wallet, ArrowUpDown, Image,
  Bot, Workflow, Plug, Cpu,
  Scale, TrendingUp, Repeat,
} from 'lucide-react';
import HomeHero from '../components/home/HomeHero';
import HomeSection from '../components/home/HomeSection';
import AdvertisingTeaser from '../components/home/AdvertisingTeaser';
import HomeAuthButton from '../components/home/HomeAuthButton';

/**
 * Home — the app's main landing & tutorial page. A guided, elegant tour of
 * everything ERU can do, organized into three primary pathways, one half-sized
 * pathway, and a small advertising teaser. Pure presentation — no business
 * logic. Available destinations link out to real pages; not-yet-built areas
 * are clearly marked "Coming soon" but still shown so the layout is complete.
 */
export default function Home() {
  useFeatureTracking('Home');

  return (
    <div
      className="flex flex-col min-h-screen bg-background pb-28 md:pb-12"
      style={{
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <div className="mx-auto w-full max-w-3xl px-4 pt-4 space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-end gap-2">
          <HomeAuthButton />
        </div>

        <HomeHero />

        {/* SECTION 1 — Social / Live / Influencing (the first impression) */}
        <HomeSection
          eyebrow="Section 1 · Grow"
          title="Social, Live & Influencing"
          subtitle="Build your audience, go live, and grow your influence across the community."
          Icon={Users}
          accent="fuchsia"
          steps={[
            { icon: MessagesSquare, title: 'Connect', desc: 'Join the Community feed, chat, and share strategies with others.' },
            { icon: Radio, title: 'Broadcast', desc: 'Reach people through Telegram bots and live channels.' },
            { icon: Sparkles, title: 'Influence', desc: 'Build reputation, earn badges, and lead the conversation.' },
          ]}
          cta={{ label: 'Open Community', to: '/community' }}
        />

        {/* SECTION 2 — Markets / Assets / Trading (mid section) */}
        <HomeSection
          eyebrow="Section 2 · Trade"
          title="Markets, Assets & Trading"
          subtitle="Track live markets, manage your portfolio, and trade assets, NFTs, and cards."
          Icon={BarChart2}
          accent="emerald"
          steps={[
            { icon: BarChart2, title: 'Watch Markets', desc: 'Live prices, charts, and insights to spot opportunities.' },
            { icon: ArrowUpDown, title: 'Trade', desc: 'Buy, sell, and swap assets with a fast, clear flow.' },
            { icon: Wallet, title: 'Portfolio', desc: 'See balances, performance, and rebalancing suggestions.' },
            { icon: Image, title: 'Collect', desc: 'Explore NFTs and collectables in your storefront.' },
          ]}
          cta={{ label: 'Open Markets', to: '/markets' }}
        />

        {/* SECTION 3 — BotForge / Automation / Integration */}
        <HomeSection
          eyebrow="Section 3 · Automate"
          title="BotForge, Automation & Integration"
          subtitle="Build AI bots, automate your workflows, and connect your favorite tools."
          Icon={Bot}
          accent="cyan"
          steps={[
            { icon: Cpu, title: 'BotForge', desc: 'Design, train, and deploy AI bots in the AI Lab.' },
            { icon: Workflow, title: 'Automate', desc: 'Schedule tasks and let bots run your routines.' },
            { icon: Plug, title: 'Integrate', desc: 'Connect Slack, Notion, Sheets, and many more services.' },
          ]}
          cta={{ label: 'Open AI Lab', to: '/ailab' }}
        />

        {/* HALF SECTION — Balance / Scaling / Adapting */}
        <HomeSection
          eyebrow="Refine"
          title="Balance, Scaling & Adapting"
          subtitle="Keep everything healthy as you grow — tune performance and adapt over time."
          Icon={Scale}
          accent="cyan"
          half
          steps={[
            { icon: Scale, title: 'Balance', desc: 'Keep risk and resources in check.' },
            { icon: TrendingUp, title: 'Scale', desc: 'Grow bots and activity smoothly.' },
            { icon: Repeat, title: 'Adapt', desc: 'Adjust strategies as conditions change.' },
          ]}
          cta={{ label: 'Open Performance', to: '/performance' }}
        />

        {/* ADVERTISING TEASER — small "coming soon" slogan strip at the bottom */}
        <AdvertisingTeaser />
      </div>
    </div>
  );
}