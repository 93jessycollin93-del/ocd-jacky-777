// Trading-bot SIMULATION engine — no real money, no live trading.
//
// Everything here is deterministic given a seed: we generate a synthetic price
// path (geometric Brownian motion) from per-asset drift/volatility assumptions,
// then run a chosen strategy over it and record an equity curve + trade log.
// This lets you compare strategies risk-free and build a dataset. It is NOT a
// predictor of real returns — real markets are messier and you can lose money.

// --- Deterministic RNG (mulberry32) so a given seed reproduces the same run ---
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Standard normal via Box–Muller.
function gauss(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Synthetic-but-plausible assumptions per asset (annualized). Clearly synthetic.
export const ASSET_PRESETS = {
  BTC: { label: 'Bitcoin', start: 60000, drift: 0.35, vol: 0.60 },
  ETH: { label: 'Ethereum', start: 3000, drift: 0.30, vol: 0.70 },
  SOL: { label: 'Solana', start: 150, drift: 0.45, vol: 0.95 },
  TON: { label: 'Toncoin', start: 5, drift: 0.25, vol: 0.80 },
};

export const STRATEGIES = {
  hodl: { label: 'Buy & Hold', blurb: 'Buy everything on day 1 and hold.' },
  dca: { label: 'Dollar-Cost Average', blurb: 'Invest an equal slice on a fixed cadence.' },
  sma_momentum: { label: 'Momentum (SMA)', blurb: 'Go all-in above the moving average, exit below it.' },
  mean_reversion: { label: 'Mean Reversion', blurb: 'Buy dips below the average, sell spikes above it.' },
  rebalance: { label: 'Rebalance', blurb: 'Hold a target asset/cash split, rebalance periodically.' },
};

// Generate a daily price series.
export function simulatePrices({ start, drift, vol, days, seed }) {
  const rng = makeRng(seed);
  const dt = 1 / 365;
  const prices = [start];
  for (let i = 1; i < days; i++) {
    const prev = prices[i - 1];
    const next = prev * Math.exp((drift - 0.5 * vol * vol) * dt + vol * Math.sqrt(dt) * gauss(rng));
    prices.push(Math.max(0.0001, next));
  }
  return prices;
}

const sma = (arr, end, window) => {
  const from = Math.max(0, end - window + 1);
  let sum = 0;
  for (let i = from; i <= end; i++) sum += arr[i];
  return sum / (end - from + 1);
};

// Run a strategy over a price series. Returns equity curve, trades, metrics.
export function runBacktest({ strategy, startBalance, prices, config = {} }) {
  let cash = startBalance;
  let units = 0;
  const equity = [];
  const trades = [];
  const window = config.windowDays || 20;
  const threshold = (config.thresholdPct || 5) / 100;
  const targetAlloc = config.targetAllocation != null ? config.targetAllocation : 0.6;
  const cadence = config.cadenceDays || 7;

  // DCA pre-computes equal slices across the horizon.
  const dcaBuys = Math.max(1, Math.floor(prices.length / cadence));
  const dcaSlice = startBalance / dcaBuys;

  const buyAll = (price, day, note) => {
    if (cash <= 0) return;
    const bought = cash / price;
    units += bought;
    trades.push({ day, action: 'buy', price, units: bought, note });
    cash = 0;
  };
  const sellAll = (price, day, note) => {
    if (units <= 0) return;
    cash += units * price;
    trades.push({ day, action: 'sell', price, units, note });
    units = 0;
  };
  const buyAmount = (amount, price, day, note) => {
    const spend = Math.min(amount, cash);
    if (spend <= 0) return;
    const bought = spend / price;
    units += bought; cash -= spend;
    trades.push({ day, action: 'buy', price, units: bought, note });
  };

  for (let day = 0; day < prices.length; day++) {
    const price = prices[day];

    if (strategy === 'hodl') {
      if (day === 0) buyAll(price, day, 'initial');
    } else if (strategy === 'dca') {
      if (day % cadence === 0) buyAmount(dcaSlice, price, day, 'dca slice');
    } else if (strategy === 'sma_momentum') {
      if (day >= window) {
        const avg = sma(prices, day, window);
        if (price > avg && cash > 0) buyAll(price, day, 'above SMA');
        else if (price < avg && units > 0) sellAll(price, day, 'below SMA');
      }
    } else if (strategy === 'mean_reversion') {
      if (day >= window) {
        const avg = sma(prices, day, window);
        if (price < avg * (1 - threshold) && cash > 0) buyAll(price, day, 'dip');
        else if (price > avg * (1 + threshold) && units > 0) sellAll(price, day, 'spike');
      }
    } else if (strategy === 'rebalance') {
      if (day === 0) buyAmount(startBalance * targetAlloc, price, day, 'initial target');
      else if (day % cadence === 0) {
        const value = cash + units * price;
        const targetInAsset = value * targetAlloc;
        const currentInAsset = units * price;
        const drift = targetInAsset - currentInAsset;
        if (drift > 0) buyAmount(drift, price, day, 'rebalance buy');
        else if (drift < 0) {
          const sellUnits = Math.min(units, -drift / price);
          units -= sellUnits; cash += sellUnits * price;
          trades.push({ day, action: 'sell', price, units: sellUnits, note: 'rebalance sell' });
        }
      }
    }

    equity.push(round2(cash + units * price));
  }

  const finalValue = equity[equity.length - 1] || startBalance;
  const returnPct = round2(((finalValue - startBalance) / startBalance) * 100);

  // Max drawdown across the equity curve.
  let peak = -Infinity, maxDd = 0;
  for (const v of equity) {
    if (v > peak) peak = v;
    if (peak > 0) maxDd = Math.max(maxDd, (peak - v) / peak);
  }

  return {
    equity,
    trades,
    finalValue,
    returnPct,
    maxDrawdownPct: round2(maxDd * 100),
    tradeCount: trades.length,
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

// Convenience: full run from a bot config.
export function simulateBot({ strategy, asset, startBalance, horizonDays, seed, config }) {
  const preset = ASSET_PRESETS[asset] || ASSET_PRESETS.BTC;
  const prices = simulatePrices({
    start: preset.start, drift: preset.drift, vol: preset.vol,
    days: horizonDays, seed,
  });
  const result = runBacktest({ strategy, startBalance, prices, config });
  return { prices, ...result };
}
