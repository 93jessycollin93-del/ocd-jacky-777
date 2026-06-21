// App Store module registry — lightweight catalog of optional dashboard modules
// users can browse and install. Each module is a self-contained widget that
// already exists in the codebase. Installation only toggles visibility on the
// Dashboard via localStorage — no business logic changes.
//
// To add a new module: register it here with a stable id, metadata, and a
// lazy-loaded component path. Keep modules side-effect free.

import { lazy } from 'react';

export const APP_STORE_MODULES = [
  {
    id: 'news-feed',
    name: 'News Feed',
    tagline: 'Curated crypto & market headlines',
    description: 'Live market news streamed from your connected feeds. Filter by source, save articles, and stay ahead of macro shifts without leaving the dashboard.',
    category: 'Markets',
    icon: '📰',
    accent: 'from-blue-500/20 to-cyan-500/10',
    preview: ['Top headlines refreshed continuously', 'Tap to open full source', 'Quiet, scannable layout'],
    component: lazy(() => import('@/eru/components/dashboard/NewsFeedWidget')),
  },
  {
    id: 'ai-insights',
    name: 'AI Insights',
    tagline: 'Smart suggestions for your portfolio',
    description: 'AI-generated daily insights tailored to your holdings, watchlist, and recent activity. Spot opportunities and risks with one glance.',
    category: 'Intelligence',
    icon: '🧠',
    accent: 'from-purple-500/20 to-pink-500/10',
    preview: ['Personalized daily summary', 'Risk + opportunity highlights', 'Source-aware reasoning'],
    component: lazy(() => import('@/eru/components/dashboard/AIInsightsWidget')),
  },
  {
    id: 'gas-fee',
    name: 'Gas Tracker',
    tagline: 'Live network fee monitor',
    description: 'Real-time gas prices across major chains so you know the best time to transact. Tiny footprint, always-on.',
    category: 'Web3',
    icon: '⛽',
    accent: 'from-yellow-500/20 to-orange-500/10',
    preview: ['Multi-chain fees', 'Auto-refresh', 'Compact mobile-friendly view'],
    component: lazy(() => import('@/eru/components/dashboard/GasFeeWidget')),
  },
  {
    id: 'portfolio-health',
    name: 'Portfolio Health',
    tagline: 'Diversification & risk score',
    description: 'A single score that summarizes how diversified, balanced, and resilient your portfolio is — with quick suggestions to improve it.',
    category: 'Portfolio',
    icon: '💚',
    accent: 'from-green-500/20 to-emerald-500/10',
    preview: ['Diversification score', 'Concentration warnings', 'Improvement tips'],
    component: lazy(() => import('@/eru/components/dashboard/PortfolioHealthScore')),
  },
  {
    id: 'risk-assessment',
    name: 'Risk Assessment',
    tagline: 'Portfolio risk breakdown',
    description: 'See volatility exposure, drawdown risk, and concentration in one panel. Updated as your holdings change.',
    category: 'Portfolio',
    icon: '🛡️',
    accent: 'from-red-500/20 to-rose-500/10',
    preview: ['Volatility metrics', 'Drawdown estimates', 'Asset-level risk'],
    component: lazy(() => import('@/eru/components/dashboard/RiskAssessment')),
  },
  {
    id: 'predictive-analytics',
    name: 'Predictive Analytics',
    tagline: 'Trend forecasting',
    description: 'Short-horizon forecasts for the assets you care about, surfaced with confidence bands and key drivers.',
    category: 'Intelligence',
    icon: '📈',
    accent: 'from-indigo-500/20 to-blue-500/10',
    preview: ['Forecast bands', 'Confidence levels', 'Driver explanations'],
    component: lazy(() => import('@/eru/components/dashboard/PredictiveAnalytics')),
  },
  {
    id: 'yield-performance',
    name: 'Yield Performance',
    tagline: 'Track staking & yield returns',
    description: 'Aggregate APY across your staking positions, vaults, and yield strategies — see what is working and what is not.',
    category: 'Portfolio',
    icon: '🌾',
    accent: 'from-amber-500/20 to-yellow-500/10',
    preview: ['Aggregate APY', 'Per-position breakdown', 'Historical trend'],
    component: lazy(() => import('@/eru/components/dashboard/YieldPerformance')),
  },
  {
    id: 'strategy-recommendations',
    name: 'Strategy Recs',
    tagline: 'AI-driven portfolio moves',
    description: 'Suggested allocation tweaks and tactical moves based on your goals, risk profile, and current market regime.',
    category: 'Intelligence',
    icon: '🎯',
    accent: 'from-teal-500/20 to-cyan-500/10',
    preview: ['Allocation suggestions', 'Tactical rebalances', 'Goal-aware'],
    component: lazy(() => import('@/eru/components/dashboard/StrategyRecommendations')),
  },
  {
    id: 'motherboard-map',
    name: 'Motherboard Map',
    tagline: 'Visualize your bot mesh',
    description: 'A live circuit-style map of your active bots, signal flows, and node status. Great for ops and command-center vibes.',
    category: 'Operations',
    icon: '🔌',
    accent: 'from-violet-500/20 to-fuchsia-500/10',
    preview: ['Live node graph', 'Signal pulses', 'Status-aware coloring'],
    component: lazy(() => import('@/eru/components/dashboard/MotherboardMap')),
  },
];

export const APP_STORE_CATEGORIES = ['All', ...Array.from(new Set(APP_STORE_MODULES.map((m) => m.category)))];

export function getModuleById(id) {
  return APP_STORE_MODULES.find((m) => m.id === id) || null;
}