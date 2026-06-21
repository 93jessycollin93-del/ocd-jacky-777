export type IncidentStatus =
  | "Suspected"
  | "Confirmed Scam"
  | "Exploit"
  | "Exit Scam"
  | "Under Investigation";

export type IncidentType =
  | "Rug Pull"
  | "Exit Scam"
  | "Smart Contract Exploit"
  | "Honeypot"
  | "Phishing Drainer"
  | "Bridge Exploit"
  | "Oracle Manipulation";

export type Chain =
  | "Ethereum"
  | "BSC"
  | "Solana"
  | "Arbitrum"
  | "Base"
  | "Polygon"
  | "Avalanche"
  | "Tron";

export type EvidenceKind = "on-chain" | "social" | "contract" | "external";

export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  label: string;
  url: string;
  confidence: number; // 0-100
  description: string;
  source: string;
}

export interface CausalStep {
  step: number;
  date: string;
  cause: string;
  effect: string;
  confidence: number;
  evidenceIds: string[];
}

export interface RiskSignal {
  key: keyof RiskFactors;
  label: string;
  weight: number; // 0-1
  factorScore: number; // 0-100 (higher = healthier)
  riskContribution: number; // points contributed to total risk
  rationale: string;
}

export interface RiskFactors {
  team: number;
  liquidity: number;
  walletConcentration: number;
  ownership: number;
  audit: number;
  community: number;
}

export interface FinancialImpact {
  tokensDrained: number;
  lpRemoved: number;
  victims: number;
  recoveredPct: number;
  avgLossPerVictim: number;
  bridgedOut: number;
}

export interface Influencer {
  handle: string;
  followers: number;
  platform: "X" | "Telegram" | "YouTube" | "TikTok";
  involvement: "Promoter" | "Endorser" | "Insider" | "Victim Reporter";
  confidence: number;
}

export interface Incident {
  id: string;
  project: string;
  symbol: string;
  chain: Chain;
  incidentType: IncidentType;
  clusterId: string;
  launchDate: string;
  rugDate: string;
  loss: number;
  status: IncidentStatus;
  description: string;
  executiveSummary: string;
  summary: string;
  evidence: { label: string; url: string }[]; // legacy
  evidenceItems: EvidenceItem[];
  causalChain: CausalStep[];
  wallets: string[];
  website?: string;
  socials: { platform: string; url: string }[];
  influencers: Influencer[];
  riskScore: number;
  riskFactors: RiskFactors;
  riskSignals: RiskSignal[];
  overallConfidence: number;
  credibility: { upvotes: number; downvotes: number };
  financialImpact: FinancialImpact;
  timeline: {
    date: string;
    event: string;
    tag: "launch" | "warning" | "drain" | "report" | "update";
  }[];
  notes: { author: string; date: string; text: string; votes: number }[];
}

export interface BehavioralFingerprint {
  gasPattern: number;
  bridgingFreq: number;
  mixerUse: number;
  deploymentCadence: number;
  victimDiversity: number;
  laundering: number;
}

export interface Wallet {
  address: string;
  label?: string;
  reputation: number;
  firstSeen: string;
  lastSeen: string;
  totalDrained: number;
  incidents: string[];
  connected: string[];
  clusterId: string;
  tags: string[];
  fingerprint: BehavioralFingerprint;
  activity: {
    date: string;
    type: "in" | "out" | "swap" | "bridge";
    amount: number;
    chain: Chain;
  }[];
}

/* ============== Risk Engine (explainable) ============== */

export const RISK_WEIGHTS: Record<keyof RiskFactors, number> = {
  liquidity: 0.22,
  team: 0.18,
  walletConcentration: 0.18,
  ownership: 0.14,
  audit: 0.14,
  community: 0.14,
};

const RISK_LABELS: Record<keyof RiskFactors, string> = {
  liquidity: "Liquidity Health",
  team: "Team Transparency",
  walletConcentration: "Wallet Concentration",
  ownership: "Contract Ownership",
  audit: "Audit Coverage",
  community: "Community Signals",
};

const RISK_RATIONALES: Record<keyof RiskFactors, (v: number) => string> = {
  liquidity: (v) =>
    v < 35 ? "LP unlocked or shallow; trivial to drain." : v < 65 ? "Partial lock, modest depth." : "Locked & deep liquidity.",
  team: (v) =>
    v < 35 ? "Anonymous team, no verified identities." : v < 65 ? "Partial doxx, limited proofs." : "Doxxed founders with track record.",
  walletConcentration: (v) =>
    v < 35 ? "Top 10 wallets hold >70% of supply." : v < 65 ? "Moderate concentration in insider wallets." : "Healthy distribution across holders.",
  ownership: (v) =>
    v < 35 ? "Owner retains mint/blacklist powers." : v < 65 ? "Multisig, but not renounced." : "Ownership renounced & timelock enforced.",
  audit: (v) =>
    v < 35 ? "Unaudited contract or self-published audit." : v < 65 ? "Limited audit by unknown firm." : "Multiple tier-1 audits with public findings.",
  community: (v) =>
    v < 35 ? "Bot-heavy chats, paid shills detected." : v < 65 ? "Active but inorganic growth pattern." : "Organic discussion across long history.",
};

export function computeRiskBreakdown(factors: RiskFactors): RiskSignal[] {
  return (Object.keys(RISK_WEIGHTS) as (keyof RiskFactors)[]).map((k) => {
    const w = RISK_WEIGHTS[k];
    const fs = factors[k];
    const risk = 100 - fs;
    return {
      key: k,
      label: RISK_LABELS[k],
      weight: w,
      factorScore: fs,
      riskContribution: Math.round(risk * w),
      rationale: RISK_RATIONALES[k](fs),
    };
  });
}

export function computeRiskScore(factors: RiskFactors): number {
  return Math.min(100, computeRiskBreakdown(factors).reduce((a, b) => a + b.riskContribution, 0));
}

/* ============== Generators ============== */

const CHAINS: Chain[] = ["Ethereum", "BSC", "Solana", "Arbitrum", "Base", "Polygon", "Avalanche", "Tron"];

const INC_TYPES: IncidentType[] = [
  "Rug Pull", "Exit Scam", "Smart Contract Exploit", "Honeypot",
  "Phishing Drainer", "Bridge Exploit", "Oracle Manipulation",
];

function rnd(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function makeAddr(prefix: string, n: number) {
  const hex = "0123456789abcdef";
  const r = rnd(n * 17 + 3);
  let a = prefix;
  for (let i = 0; i < 38; i++) a += hex[Math.floor(r() * 16)];
  return a;
}

const PROJECTS: { name: string; symbol: string }[] = [
  { name: "MoonVault Finance", symbol: "MVF" },
  { name: "ApeRocket Protocol", symbol: "APR" },
  { name: "ShibaNova", symbol: "SHIBN" },
  { name: "PixelPepe DAO", symbol: "PXPE" },
  { name: "SolarYield", symbol: "SYLD" },
  { name: "DegenBank", symbol: "DBNK" },
  { name: "HyperLoop Swap", symbol: "HLP" },
  { name: "TitanForge", symbol: "TFG" },
  { name: "NeonChain", symbol: "NEON" },
  { name: "VortexFi", symbol: "VRTX" },
  { name: "RaccoonRun", symbol: "RACC" },
  { name: "ZeroGravity Labs", symbol: "ZGL" },
  { name: "PhantomBridge", symbol: "PHBR" },
  { name: "OmegaStake", symbol: "OMS" },
  { name: "QuantumApes", symbol: "QAPE" },
  { name: "BlackHole DAO", symbol: "BHD" },
  { name: "Starfall Token", symbol: "STAR" },
  { name: "InfernoSwap", symbol: "INF" },
  { name: "CryoVault", symbol: "CRYO" },
  { name: "AstralYield", symbol: "ASTR" },
  { name: "GhostCity Finance", symbol: "GHST" },
  { name: "MagmaProtocol", symbol: "MGMA" },
  { name: "NebulaPay", symbol: "NBL" },
  { name: "PolarPunks", symbol: "PLR" },
];

const STATUSES: IncidentStatus[] = [
  "Confirmed Scam", "Exit Scam", "Exploit", "Under Investigation", "Suspected",
  "Confirmed Scam", "Exit Scam", "Exploit", "Confirmed Scam", "Suspected",
];

const INFLUENCER_HANDLES = [
  "CryptoBaron", "ApeKing", "MoonshotMia", "DegenWhisperer", "ChainLordX",
  "AlphaScout", "RugSniper", "GemHunter99", "WhaleWatch", "SignalLab",
];

export const INCIDENTS: Incident[] = PROJECTS.map((p, i) => {
  const r = rnd(i + 1);
  const chain = CHAINS[Math.floor(r() * CHAINS.length)];
  const status = STATUSES[i % STATUSES.length];
  const incidentType = INC_TYPES[Math.floor(r() * INC_TYPES.length)];
  const loss = Math.floor(50_000 + r() * 28_000_000);
  const launch = new Date(2024, Math.floor(r() * 12), Math.floor(1 + r() * 27));
  const rug = new Date(launch.getTime() + (3 + Math.floor(r() * 200)) * 86400000);
  const factors: RiskFactors = {
    team: Math.floor(10 + r() * 80),
    liquidity: Math.floor(10 + r() * 80),
    walletConcentration: Math.floor(10 + r() * 80),
    ownership: Math.floor(10 + r() * 80),
    audit: Math.floor(10 + r() * 80),
    community: Math.floor(10 + r() * 80),
  };
  const signals = computeRiskBreakdown(factors);
  const risk = computeRiskScore(factors);
  const wallets = Array.from({ length: 2 + Math.floor(r() * 3) }, (_, k) =>
    chain === "Solana" ? makeAddr("", i * 10 + k) : makeAddr("0x", i * 10 + k),
  );
  const clusterId = `CL-${String(Math.floor(i / 4) + 1).padStart(2, "0")}`;

  const evidenceItems: EvidenceItem[] = [
    {
      id: `ev-${i}-1`, kind: "on-chain",
      label: "Deployer trace via Etherscan",
      url: "https://example.com/trace",
      confidence: 92,
      source: "Etherscan",
      description: "Deployer wallet shows direct funding from Tornado Cash 14 days before launch.",
    },
    {
      id: `ev-${i}-2`, kind: "contract",
      label: "Source mintable, owner not renounced",
      url: "https://example.com/contract",
      confidence: 88,
      source: "Sourcify",
      description: "Token contract retains `mint()` callable by owner; no timelock present.",
    },
    {
      id: `ev-${i}-3`, kind: "social",
      label: "Telegram archive — admin handoff",
      url: "https://example.com/tg",
      confidence: 71,
      source: "TGStat",
      description: "Channel ownership transferred to throwaway 2 days before LP removal.",
    },
    {
      id: `ev-${i}-4`, kind: "external",
      label: "DefiLlama TVL collapse",
      url: "https://example.com/llama",
      confidence: 84,
      source: "DefiLlama",
      description: "TVL fell from $4.2M to $112k in a 6-minute window matching the drain tx.",
    },
  ];

  const causalChain: CausalStep[] = [
    {
      step: 1, date: launch.toISOString().slice(0, 10),
      cause: `${p.symbol} contract deployed by anonymous wallet`,
      effect: "Token enters circulation with retained owner privileges",
      confidence: 95, evidenceIds: [`ev-${i}-1`, `ev-${i}-2`],
    },
    {
      step: 2, date: new Date(launch.getTime() + 7 * 86400000).toISOString().slice(0, 10),
      cause: "Aggressive influencer marketing campaign begins",
      effect: "Retail FOMO drives liquidity to ~$" + Math.floor(loss * 1.4 / 1000) + "k",
      confidence: 78, evidenceIds: [`ev-${i}-3`],
    },
    {
      step: 3, date: new Date(rug.getTime() - 3 * 86400000).toISOString().slice(0, 10),
      cause: "Insider wallets accumulate via private routes",
      effect: "Top-10 holder concentration exceeds 71%",
      confidence: 86, evidenceIds: [`ev-${i}-1`],
    },
    {
      step: 4, date: rug.toISOString().slice(0, 10),
      cause: incidentType === "Smart Contract Exploit"
        ? "Flashloan triggers reentrancy in vault contract"
        : "Owner calls removeLiquidity() and transfers proceeds",
      effect: `~$${(loss / 1000).toFixed(0)}k drained in single block`,
      confidence: 97, evidenceIds: [`ev-${i}-2`, `ev-${i}-4`],
    },
    {
      step: 5, date: new Date(rug.getTime() + 1 * 86400000).toISOString().slice(0, 10),
      cause: "Funds routed through bridge + mixer chain",
      effect: "Trail fragmented across 3 chains, partial recovery unlikely",
      confidence: 73, evidenceIds: [`ev-${i}-1`, `ev-${i}-4`],
    },
  ];

  const overallConfidence = Math.round(
    causalChain.reduce((a, b) => a + b.confidence, 0) / causalChain.length,
  );

  const financialImpact: FinancialImpact = {
    tokensDrained: Math.floor(loss * 0.92),
    lpRemoved: Math.floor(loss * 0.7),
    victims: Math.floor(loss / 8500) + 12,
    recoveredPct: Math.floor(r() * 8),
    avgLossPerVictim: Math.floor(loss / (Math.floor(loss / 8500) + 12)),
    bridgedOut: Math.floor(loss * 0.61),
  };

  const influencers: Influencer[] = Array.from({ length: 1 + Math.floor(r() * 3) }, (_, k) => ({
    handle: INFLUENCER_HANDLES[(i * 3 + k) % INFLUENCER_HANDLES.length],
    followers: 5000 + Math.floor(r() * 480000),
    platform: (["X", "Telegram", "YouTube", "TikTok"] as const)[k % 4],
    involvement: (["Promoter", "Endorser", "Insider", "Victim Reporter"] as const)[k % 4],
    confidence: 50 + Math.floor(r() * 45),
  }));

  return {
    id: p.symbol.toLowerCase() + "-" + (i + 1),
    project: p.name,
    symbol: p.symbol,
    chain,
    incidentType,
    clusterId,
    launchDate: launch.toISOString().slice(0, 10),
    rugDate: rug.toISOString().slice(0, 10),
    loss,
    status,
    description: `${p.name} was a ${chain}-based project classified as a ${incidentType.toLowerCase()}. RugDNA analysts catalogued on-chain evidence, social vectors, and wallet clustering with cross-incident correlation against cluster ${clusterId}.`,
    executiveSummary: `${p.name} (${p.symbol}) on ${chain} ended in a ${incidentType.toLowerCase()} on ${rug.toISOString().slice(0, 10)}, draining approximately $${loss.toLocaleString()} from ${financialImpact.victims}+ wallets. Forensic linkage places the deployer in cluster ${clusterId} alongside ${Math.max(1, Math.floor(r() * 3) + 1)} prior incidents sharing infrastructure and bridging patterns. Overall investigative confidence: ${overallConfidence}%.`,
    summary: `Investigation into ${p.name} (${p.symbol}) on ${chain}. Loss $${loss.toLocaleString()}. Status: ${status}.`,
    evidence: [
      { label: "On-chain trace", url: "https://example.com/trace" },
      { label: "Archived website", url: "https://example.com/archive" },
      { label: "Telegram dump", url: "https://example.com/tg" },
    ],
    evidenceItems,
    causalChain,
    wallets,
    website: `https://${p.symbol.toLowerCase()}.finance`,
    socials: [
      { platform: "X", url: `https://x.com/${p.symbol.toLowerCase()}` },
      { platform: "Telegram", url: `https://t.me/${p.symbol.toLowerCase()}` },
    ],
    influencers,
    riskScore: risk,
    riskFactors: factors,
    riskSignals: signals,
    overallConfidence,
    credibility: { upvotes: 40 + Math.floor(r() * 320), downvotes: Math.floor(r() * 30) },
    financialImpact,
    timeline: [
      { date: launch.toISOString().slice(0, 10), event: `${p.symbol} token deployed on ${chain}`, tag: "launch" },
      { date: new Date(launch.getTime() + 14 * 86400000).toISOString().slice(0, 10),
        event: "Anonymous team adds liquidity, no audit published", tag: "warning" },
      { date: new Date(rug.getTime() - 2 * 86400000).toISOString().slice(0, 10),
        event: "Community members report withdrawal failures", tag: "report" },
      { date: rug.toISOString().slice(0, 10),
        event: `Liquidity removed, ~$${loss.toLocaleString()} drained`, tag: "drain" },
      { date: new Date(rug.getTime() + 1 * 86400000).toISOString().slice(0, 10),
        event: "Funds bridged across chains via known mixer", tag: "update" },
    ],
    notes: [
      { author: "0xWatcher", date: rug.toISOString().slice(0, 10),
        text: "Deployer wallet matches cluster from 3 prior rug pulls. High confidence repeat offender.",
        votes: 42 + Math.floor(r() * 200) },
      { author: "ChainSleuth", date: rug.toISOString().slice(0, 10),
        text: "Telegram admin handle reused from a 2023 exit scam. Linking profiles now.",
        votes: 18 + Math.floor(r() * 80) },
    ],
  };
});

/* ====== Cluster wallet sharing (cross-incident links) ====== */
{
  const byCluster = new Map<string, Incident[]>();
  INCIDENTS.forEach((i) => {
    const arr = byCluster.get(i.clusterId) ?? [];
    arr.push(i);
    byCluster.set(i.clusterId, arr);
  });
  byCluster.forEach((group) => {
    if (group.length < 2) return;
    const shared = group[0].wallets[0];
    group.slice(1).forEach((inc) => {
      if (!inc.wallets.includes(shared)) inc.wallets.unshift(shared);
    });
  });
}

/* ====== Wallets ====== */

const BEHAVIOR_POOL = [
  "Serial Deployer", "Bridge Hopper", "Mixer User", "Flash Loan Operator",
  "MEV Sandwich", "Drainer Cluster", "Multisig Insider", "Wash Trader",
];

const walletMap = new Map<string, Wallet>();
INCIDENTS.forEach((inc, i) => {
  inc.wallets.forEach((addr, k) => {
    if (!walletMap.has(addr)) {
      const r = rnd(addr.length + i + k + 7);
      walletMap.set(addr, {
        address: addr,
        label: k === 0 ? `${inc.symbol} Deployer` : undefined,
        reputation: Math.max(2, Math.round(20 - r() * 18)),
        firstSeen: inc.launchDate,
        lastSeen: inc.rugDate,
        totalDrained: Math.floor(inc.loss / inc.wallets.length),
        incidents: [inc.id],
        connected: [],
        clusterId: inc.clusterId,
        tags: Array.from({ length: 2 + Math.floor(r() * 2) }, () =>
          BEHAVIOR_POOL[Math.floor(r() * BEHAVIOR_POOL.length)],
        ).filter((v, idx, a) => a.indexOf(v) === idx),
        fingerprint: {
          gasPattern: Math.floor(40 + r() * 55),
          bridgingFreq: Math.floor(30 + r() * 65),
          mixerUse: Math.floor(50 + r() * 50),
          deploymentCadence: Math.floor(30 + r() * 60),
          victimDiversity: Math.floor(40 + r() * 55),
          laundering: Math.floor(55 + r() * 45),
        },
        activity: Array.from({ length: 6 }, (_, j) => ({
          date: new Date(new Date(inc.launchDate).getTime() + j * 12 * 86400000).toISOString().slice(0, 10),
          type: (["in", "out", "swap", "bridge"] as const)[j % 4],
          amount: Math.floor(10_000 + r() * 500_000),
          chain: inc.chain,
        })),
      });
    } else {
      const w = walletMap.get(addr)!;
      if (!w.incidents.includes(inc.id)) w.incidents.push(inc.id);
      w.totalDrained += Math.floor(inc.loss / inc.wallets.length);
    }
  });
});

INCIDENTS.forEach((inc) => {
  inc.wallets.forEach((a) => {
    inc.wallets.forEach((b) => {
      if (a !== b) {
        const w = walletMap.get(a)!;
        if (!w.connected.includes(b)) w.connected.push(b);
      }
    });
  });
});

export const WALLETS: Wallet[] = Array.from(walletMap.values());

/* ====== Selectors / Stats ====== */

export function getIncident(id: string) {
  return INCIDENTS.find((i) => i.id === id);
}
export function getWallet(addr: string) {
  return WALLETS.find((w) => w.address.toLowerCase() === addr.toLowerCase());
}
export function getCluster(id: string) {
  return {
    id,
    incidents: INCIDENTS.filter((i) => i.clusterId === id),
    wallets: WALLETS.filter((w) => w.clusterId === id),
  };
}
export const CLUSTERS = Array.from(new Set(INCIDENTS.map((i) => i.clusterId)))
  .sort()
  .map(getCluster);

export const STATS = {
  totalIncidents: INCIDENTS.length,
  totalLoss: INCIDENTS.reduce((a, b) => a + b.loss, 0),
  confirmedScams: INCIDENTS.filter((i) => i.status === "Confirmed Scam" || i.status === "Exit Scam").length,
  underInvestigation: INCIDENTS.filter((i) => i.status === "Under Investigation" || i.status === "Suspected").length,
  trackedWallets: WALLETS.length,
  clusters: CLUSTERS.length,
  avgRisk: Math.round(INCIDENTS.reduce((a, b) => a + b.riskScore, 0) / INCIDENTS.length),
};

export function chainBreakdown() {
  const m = new Map<Chain, { count: number; loss: number }>();
  INCIDENTS.forEach((i) => {
    const cur = m.get(i.chain) ?? { count: 0, loss: 0 };
    cur.count++; cur.loss += i.loss;
    m.set(i.chain, cur);
  });
  return Array.from(m.entries()).map(([chain, v]) => ({ chain, ...v })).sort((a, b) => b.loss - a.loss);
}

export function lossOverTime() {
  const m = new Map<string, number>();
  INCIDENTS.forEach((i) => {
    const k = i.rugDate.slice(0, 7);
    m.set(k, (m.get(k) ?? 0) + i.loss);
  });
  return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, loss]) => ({ month, loss }));
}

export function anomalySignals() {
  // Synthesized anomaly stream — recent suspicious events
  const pool = [
    { sev: "critical", msg: "Cluster CL-03 deployer funded a new contract on Base 14m ago" },
    { sev: "high", msg: "Drainer wallet 0x4ae…7c2 bridged $1.2M ETH→ARB via Across" },
    { sev: "medium", msg: "Telegram channel admin handle reused across 4 cluster incidents" },
    { sev: "high", msg: "New deploy mirrors ApeRocket bytecode (98.4% similarity)" },
    { sev: "medium", msg: "Honeypot pattern detected on Solana mint 9Pq…3rT" },
    { sev: "critical", msg: "Mixer outflow spike: +312% vs 7d average on Tornado relay" },
  ];
  return pool.map((p, i) => ({ ...p, t: `${(i + 1) * 7}m ago` }));
}

export function trendingInvestigations() {
  return [...INCIDENTS]
    .sort((a, b) => (b.credibility.upvotes - b.credibility.downvotes) - (a.credibility.upvotes - a.credibility.downvotes))
    .slice(0, 5);
}

export function statusColor(s: IncidentStatus): string {
  switch (s) {
    case "Confirmed Scam": return "danger";
    case "Exit Scam": return "danger";
    case "Exploit": return "warning";
    case "Under Investigation": return "info";
    case "Suspected": return "warning";
  }
}

export function shortAddr(a: string, head = 6, tail = 4) {
  if (a.length <= head + tail + 2) return a;
  return a.slice(0, head) + "…" + a.slice(-tail);
}

/* ====== Path tracing (BFS over wallet/incident graph) ====== */
export function tracePath(fromId: string, toId: string, maxDepth = 6): string[] | null {
  // ids: "w:<addr>" or "i:<id>"
  const adj = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a)!.add(b);
  };
  INCIDENTS.forEach((inc) => {
    const iid = "i:" + inc.id;
    inc.wallets.forEach((w) => { add(iid, "w:" + w); add("w:" + w, iid); });
  });
  WALLETS.forEach((w) => {
    w.connected.forEach((c) => add("w:" + w.address, "w:" + c));
  });
  if (!adj.has(fromId) || !adj.has(toId)) return null;
  const q: { id: string; path: string[] }[] = [{ id: fromId, path: [fromId] }];
  const seen = new Set([fromId]);
  while (q.length) {
    const { id, path } = q.shift()!;
    if (id === toId) return path;
    if (path.length > maxDepth) continue;
    for (const n of adj.get(id) ?? []) {
      if (seen.has(n)) continue;
      seen.add(n);
      q.push({ id: n, path: [...path, n] });
    }
  }
  return null;
}
