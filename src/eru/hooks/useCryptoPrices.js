// DEPRECATED: All price data now comes from real CoinGecko API via useRealPrices.js
// This file is kept as a compatibility shim. Do not use for new code.
export { useRealPrices as useCryptoPrices } from './useRealPrices';
export function usePriceMap() {
  // Shim — use useRealPriceMap from useRealPrices.js instead
  return {};
}