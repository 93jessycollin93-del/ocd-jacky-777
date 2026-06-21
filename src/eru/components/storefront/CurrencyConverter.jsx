import { RefreshCw } from 'lucide-react';

const RATES = {
  USD: { TON: 0.19, ETH: 0.00011, BTC: 0.000015 },
  CAD: { TON: 0.14, ETH: 0.00008, BTC: 0.000011 },
  EUR: { TON: 0.21, ETH: 0.00012, BTC: 0.000016 },
};

export default function CurrencyConverter({ fiatAmount, fiatCurrency, cryptoCurrency, onConverted }) {
  const rate = RATES[fiatCurrency]?.[cryptoCurrency] || 0;
  const converted = fiatAmount ? Number(fiatAmount) * rate : 0;

  return (
    <div className="bg-secondary border border-border rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="w-3.5 h-3.5" />
        Estimated conversion
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>{fiatAmount || 0} {fiatCurrency}</span>
        <span className="font-semibold text-primary">≈ {converted.toFixed(4)} {cryptoCurrency}</span>
      </div>
      <button onClick={() => onConverted(converted)} className="text-xs text-primary">Use this crypto value</button>
    </div>
  );
}