export function buildCombinedPortfolioData({ walletHoldings = [], jadeAssets = [], cards = [], transactions = [] }) {
  const combined = [];

  walletHoldings.forEach((item) => {
    combined.push({
      symbol: item.token_symbol,
      value_usd: Number(item.value_usd || 0),
      source: 'wallet',
    });
  });

  jadeAssets.forEach((item) => {
    combined.push({
      symbol: 'JADE',
      value_usd: Number(item.valuation || 0),
      source: 'jade',
    });
  });

  cards.forEach(() => {
    combined.push({
      symbol: 'CARD',
      value_usd: 100,
      source: 'card',
    });
  });

  transactions.forEach((item) => {
    if (item.status === 'verified') {
      combined.push({
        symbol: (item.currency || 'CASH').toUpperCase(),
        value_usd: Number(item.amount || 0),
        source: 'transaction',
      });
    }
  });

  return combined.filter((item) => item.symbol && item.value_usd > 0);
}