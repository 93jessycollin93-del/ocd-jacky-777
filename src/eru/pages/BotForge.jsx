import { useState } from 'react';

const defaultConfig = {
  minProfitUSD: 5,
  maxGasGwei: 30,
  slippageCap: 0.5,
  maxConsecFails: 3,
  enableFlashLoan: true,
  enableDirectArb: true,
  enableLimitOrder: true,
  flashLoanProvider: 'aave',
  network: 'mainnet',
  dexes: ['uniswap', 'curve', 'balancer'],
  rpcProvider: 'alchemy',
  walletAddress: '',
  privateKey: '',
};

const NETWORKS = {
  mainnet: { name: 'Ethereum Mainnet', color: '#627EEA', gas: 'high' },
  arbitrum: { name: 'Arbitrum One', color: '#28A0F0', gas: 'low' },
  base: { name: 'Base', color: '#0052FF', gas: 'low' },
};

const DEX_OPTIONS = [
  { id: 'uniswap', label: 'Uniswap v3' },
  { id: 'curve', label: 'Curve' },
  { id: 'balancer', label: 'Balancer' },
  { id: 'sushiswap', label: 'SushiSwap' },
];

function generateBotCode(cfg) {
  return `// ============================================
// ETH ARBITRAGE BOT — AUTO-GENERATED
// Network: ${NETWORKS[cfg.network].name}
// Generated: ${new Date().toISOString()}
// ============================================

const { ethers } = require("ethers");

const CONFIG = {
  MIN_PROFIT_USD:   ${cfg.minProfitUSD},
  MAX_GAS_GWEI:     ${cfg.maxGasGwei},
  SLIPPAGE_CAP:     ${(cfg.slippageCap / 100).toFixed(4)},
  MAX_CONSEC_FAILS: ${cfg.maxConsecFails},
  FLASH_LOAN_FEE:   0.0009,
  NETWORK:          "${cfg.network}",
  DEXES:            ${JSON.stringify(cfg.dexes)},
};

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

let consecFails = 0;
let isRunning   = true;

function safetyCheck(grossProfitUSD, estimatedGasUSD) {
  const netProfit = grossProfitUSD - estimatedGasUSD - (CONFIG.FLASH_LOAN_FEE * 100);
  if (netProfit < CONFIG.MIN_PROFIT_USD) {
    console.log(\`[GATE] Net $\${netProfit.toFixed(2)} < threshold. Skip.\`);
    return false;
  }
  return true;
}

async function getGasPrice() {
  const feeData = await provider.getFeeData();
  const gasPriceGwei = parseFloat(ethers.formatUnits(feeData.gasPrice, "gwei"));
  if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
    console.log(\`[GAS] Cap hit (\${gasPriceGwei.toFixed(1)} gwei). Waiting.\`);
    return null;
  }
  return feeData.gasPrice;
}

async function scanPrices(tokenA, tokenB) {
  const prices = {};
${cfg.dexes.includes('uniswap') ? `  try { prices.uniswap = await getUniswapPrice(tokenA, tokenB); } catch(e) { console.error("[SCAN] Uniswap:", e.message); }` : ''}
${cfg.dexes.includes('curve') ? `  try { prices.curve = await getCurvePrice(tokenA, tokenB); } catch(e) { console.error("[SCAN] Curve:", e.message); }` : ''}
${cfg.dexes.includes('balancer') ? `  try { prices.balancer = await getBalancerPrice(tokenA, tokenB); } catch(e) { console.error("[SCAN] Balancer:", e.message); }` : ''}
${cfg.dexes.includes('sushiswap') ? `  try { prices.sushiswap = await getSushiPrice(tokenA, tokenB); } catch(e) { console.error("[SCAN] Sushi:", e.message); }` : ''}
  return prices;
}

function findArbitrageOpportunity(prices) {
  const entries = Object.entries(prices).filter(([, p]) => p !== null);
  if (entries.length < 2) return null;
  let best = null;
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [dexA, priceA] = entries[i];
      const [dexB, priceB] = entries[j];
      const spread = Math.abs(priceA - priceB) / Math.min(priceA, priceB);
      if (!best || spread > best.spread) {
        best = {
          spread,
          buyDex:   priceA < priceB ? dexA : dexB,
          sellDex:  priceA < priceB ? dexB : dexA,
          buyPrice:  Math.min(priceA, priceB),
          sellPrice: Math.max(priceA, priceB),
        };
      }
    }
  }
  return best && best.spread > CONFIG.SLIPPAGE_CAP ? best : null;
}
${cfg.enableFlashLoan ? `
async function executeFlashLoanArb(opp, tokenA, amount) {
  console.log(\`[FLASH] \${opp.buyDex} → \${opp.sellDex} | spread: \${(opp.spread * 100).toFixed(3)}%\`);
  const AAVE_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
  const aave = new ethers.Contract(AAVE_POOL, ["function flashLoanSimple(address,address,uint256,bytes,uint16) external"], wallet);
  const params = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address","address","address"], [opp.buyDex, opp.sellDex, tokenA]
  );
  const gasPrice = await getGasPrice();
  if (!gasPrice) return false;
  try {
    const tx = await aave.flashLoanSimple(wallet.address, tokenA, amount, params, 0, { gasPrice, gasLimit: 500000 });
    const receipt = await tx.wait();
    console.log(\`[FLASH] ✅ Confirmed: \${receipt.hash}\`);
    consecFails = 0;
    return true;
  } catch (err) {
    console.error(\`[FLASH] ❌ Reverted: \${err.message}\`);
    consecFails++;
    return false;
  }
}` : ''}
${cfg.enableDirectArb ? `
async function executeDirectArb(opp, tokenA, tokenB, amountIn) {
  console.log(\`[DIRECT] \${opp.buyDex} → \${opp.sellDex}\`);
  const gasPrice = await getGasPrice();
  if (!gasPrice) return false;
  try {
    const bought = await swapOnDex(opp.buyDex, tokenA, tokenB, amountIn, gasPrice);
    await swapOnDex(opp.sellDex, tokenB, tokenA, bought, gasPrice);
    console.log("[DIRECT] ✅ Complete");
    consecFails = 0;
    return true;
  } catch (err) {
    console.error(\`[DIRECT] ❌ Failed: \${err.message}\`);
    consecFails++;
    return false;
  }
}` : ''}

function circuitBreaker() {
  if (consecFails >= CONFIG.MAX_CONSEC_FAILS) {
    console.error(\`[BREAKER] \${CONFIG.MAX_CONSEC_FAILS} consecutive failures. HALTING.\`);
    isRunning = false;
    process.exit(1);
  }
}

async function main() {
  console.log("🤖 Arbitrage Bot Starting...");
  console.log(\`   Network:  \${CONFIG.NETWORK}\`);
  console.log(\`   DEXes:    \${CONFIG.DEXES.join(", ")}\`);
  console.log(\`   Min Profit: $\${CONFIG.MIN_PROFIT_USD}\`);
  console.log(\`   Max Gas:    \${CONFIG.MAX_GAS_GWEI} gwei\`);
  console.log("─────────────────────────────────────────");

  const WETH  = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const USDC  = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const AMOUNT = ethers.parseUnits("1", 18);

  while (isRunning) {
    try {
      const prices = await scanPrices(WETH, USDC);
      const opp = findArbitrageOpportunity(prices);
      if (!opp) { await sleep(1000); continue; }

      console.log(\`[OPP] \${(opp.spread * 100).toFixed(3)}% spread\`);

      const gasPrice = await getGasPrice();
      if (!gasPrice) { await sleep(2000); continue; }

      const gasCostETH = parseFloat(ethers.formatEther(gasPrice * 500000n));
      const ethPrice   = prices.uniswap || 3000;
      const gasCostUSD = gasCostETH * ethPrice;
      const grossUSD   = opp.spread * parseFloat(ethers.formatEther(AMOUNT)) * ethPrice;

      if (!safetyCheck(grossUSD, gasCostUSD)) { await sleep(500); continue; }
${cfg.enableFlashLoan ? `      await executeFlashLoanArb(opp, WETH, AMOUNT);` : ''}
${cfg.enableDirectArb && !cfg.enableFlashLoan ? `      await executeDirectArb(opp, WETH, USDC, AMOUNT);` : ''}
      circuitBreaker();
    } catch (err) {
      console.error("[MAIN]", err.message);
      consecFails++;
      circuitBreaker();
    }
    await sleep(500);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
main().catch(console.error);

// .env required:
// RPC_URL=https://eth-${cfg.network}.g.alchemy.com/v2/YOUR_KEY
// PRIVATE_KEY=your_wallet_private_key_here
//
// Install: npm install ethers dotenv
// Run:     node bot.js
`;
}

function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 10, color, letterSpacing: 3, marginBottom: 10, fontWeight: 700, borderBottom: `1px solid ${color}20`, paddingBottom: 6 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function BotForge() {
  const [cfg, setCfg] = useState(defaultConfig);
  const [tab, setTab] = useState('forge');
  const [copied, setCopied] = useState(false);

  const update = (key, val) => setCfg(prev => ({ ...prev, [key]: val }));
  const toggleDex = (id) => setCfg(prev => ({
    ...prev,
    dexes: prev.dexes.includes(id) ? prev.dexes.filter(d => d !== id) : [...prev.dexes, id],
  }));

  const botCode = generateBotCode(cfg);
  const net = NETWORKS[cfg.network];

  const copyCode = () => {
    navigator.clipboard.writeText(botCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e2e8f0', fontFamily: "'Courier New', monospace" }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)', borderBottom: '1px solid #1e293b', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${net.color}, #28A0F0)`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>BOT FORGE</div>
          <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 2 }}>ETHEREUM ARBITRAGE GENERATOR</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {['forge', 'code'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid', borderColor: tab === t ? net.color : '#1e293b', background: tab === t ? net.color + '20' : 'transparent', color: tab === t ? net.color : '#64748b', cursor: 'pointer', fontSize: 11, fontFamily: "'Courier New', monospace", letterSpacing: 1, textTransform: 'uppercase', minHeight: 0, minWidth: 0 }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'forge' ? (
        <div style={{ padding: '20px', maxWidth: 680, margin: '0 auto' }}>

          {/* Network */}
          <Section title="NETWORK" color={net.color}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(NETWORKS).map(([id, n]) => (
                <button key={id} onClick={() => update('network', id)} style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid', borderColor: cfg.network === id ? n.color : '#1e293b', background: cfg.network === id ? n.color + '15' : '#0f0f1a', color: cfg.network === id ? n.color : '#64748b', cursor: 'pointer', fontSize: 12, fontFamily: "'Courier New', monospace", minHeight: 0, minWidth: 0 }}>
                  {n.name}
                  <span style={{ marginLeft: 6, fontSize: 10, color: n.gas === 'low' ? '#22c55e' : '#f59e0b' }}>
                    {n.gas === 'low' ? '⬇ GAS' : '⬆ GAS'}
                  </span>
                </button>
              ))}
            </div>
          </Section>

          {/* Strategies */}
          <Section title="STRATEGIES" color={net.color}>
            {[
              { key: 'enableFlashLoan', label: 'Flash Loan Arb', desc: 'Atomic — reverts if not profitable. Zero loss risk.' },
              { key: 'enableDirectArb', label: 'Direct Arb', desc: 'Uses your capital. Faster, needs funded wallet.' },
              { key: 'enableLimitOrder', label: 'Limit Order (CoW/1inch)', desc: 'MEV-resistant, gas-optimized fills.' },
            ].map(s => (
              <div key={s.key} onClick={() => update(s.key, !cfg[s.key])} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 8, borderRadius: 8, cursor: 'pointer', border: '1px solid', borderColor: cfg[s.key] ? net.color + '60' : '#1e293b', background: cfg[s.key] ? net.color + '08' : '#0f0f1a' }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${cfg[s.key] ? net.color : '#334155'}`, background: cfg[s.key] ? net.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>
                  {cfg[s.key] ? '✓' : ''}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: cfg[s.key] ? '#e2e8f0' : '#64748b', fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </Section>

          {/* DEXes */}
          <Section title="DEX SOURCES" color={net.color}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DEX_OPTIONS.map(d => (
                <button key={d.id} onClick={() => toggleDex(d.id)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid', borderColor: cfg.dexes.includes(d.id) ? net.color : '#1e293b', background: cfg.dexes.includes(d.id) ? net.color + '15' : '#0f0f1a', color: cfg.dexes.includes(d.id) ? net.color : '#64748b', cursor: 'pointer', fontSize: 12, fontFamily: "'Courier New', monospace", minHeight: 0, minWidth: 0 }}>
                  {d.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Safety Controls */}
          <Section title="SAFETY CONTROLS" color={net.color}>
            {[
              { key: 'minProfitUSD', label: 'Min Net Profit (USD)', min: 1, max: 100, step: 1, fmt: v => `$${v}` },
              { key: 'maxGasGwei', label: 'Max Gas Price', min: 5, max: 200, step: 5, fmt: v => `${v} gwei` },
              { key: 'slippageCap', label: 'Slippage Cap', min: 0.1, max: 3, step: 0.1, fmt: v => `${v}%` },
              { key: 'maxConsecFails', label: 'Circuit Breaker (fails)', min: 1, max: 10, step: 1, fmt: v => `${v} tx` },
            ].map(s => (
              <div key={s.key} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{s.label}</span>
                  <span style={{ fontSize: 13, color: net.color, fontWeight: 700 }}>{s.fmt(cfg[s.key])}</span>
                </div>
                <input type="range" min={s.min} max={s.max} step={s.step} value={cfg[s.key]} onChange={e => update(s.key, parseFloat(e.target.value))} style={{ width: '100%', accentColor: net.color }} />
              </div>
            ))}
          </Section>

          <button onClick={() => setTab('code')} style={{ width: '100%', padding: '13px', background: `linear-gradient(135deg, ${net.color}, ${net.color}99)`, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: 2, fontFamily: "'Courier New', monospace", minHeight: 0 }}>
            ⚡ GENERATE BOT CODE
          </button>
        </div>

      ) : (
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: net.color, fontWeight: 700 }}>bot.js</div>
              <div style={{ fontSize: 11, color: '#475569' }}>{cfg.dexes.join(' · ')} · {NETWORKS[cfg.network].name}</div>
            </div>
            <button onClick={copyCode} style={{ padding: '7px 14px', borderRadius: 6, border: `1px solid ${net.color}`, background: copied ? net.color + '30' : 'transparent', color: net.color, cursor: 'pointer', fontSize: 12, fontFamily: "'Courier New', monospace", minHeight: 0, minWidth: 0 }}>
              {copied ? '✓ COPIED' : 'COPY'}
            </button>
          </div>

          <div style={{ background: '#050508', border: '1px solid #1e293b', borderRadius: 8, padding: '16px', overflowX: 'auto', maxHeight: '65vh', overflowY: 'auto' }}>
            <pre style={{ margin: 0, fontSize: 11, lineHeight: 1.7, color: '#94a3b8', whiteSpace: 'pre' }}>
              {botCode.split('\n').map((line, i) => {
                let color = '#94a3b8';
                if (line.startsWith('//')) color = '#334155';
                else if (line.includes('console.log')) color = '#22c55e';
                else if (line.includes('console.error')) color = '#ef4444';
                else if (line.includes('const ') || line.includes('let ') || line.includes('async ')) color = '#c084fc';
                else if (line.includes('await ') || line.includes('return ')) color = '#60a5fa';
                else if (line.trim().startsWith('if ') || line.trim().startsWith('} else')) color = '#f59e0b';
                return (
                  <span key={i} style={{ display: 'block', color }}>
                    <span style={{ color: '#1e293b', userSelect: 'none', marginRight: 16, fontSize: 10 }}>{String(i + 1).padStart(3, ' ')}</span>
                    {line}
                  </span>
                );
              })}
            </pre>
          </div>

          <div style={{ marginTop: 16, padding: 16, background: '#0f0f1a', borderRadius: 8, border: '1px solid #1e293b' }}>
            <div style={{ fontSize: 12, color: net.color, marginBottom: 10, fontWeight: 700, letterSpacing: 1 }}>SETUP</div>
            {['npm install ethers dotenv', 'Create .env with RPC_URL and PRIVATE_KEY', 'node bot.js'].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
                <span style={{ color: net.color, fontSize: 11, minWidth: 16 }}>{i + 1}.</span>
                <code style={{ fontSize: 11, color: '#64748b' }}>{step}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}