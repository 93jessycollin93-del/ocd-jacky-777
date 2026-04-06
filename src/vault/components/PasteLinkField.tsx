import { useState } from 'react';
import { Link, AlertCircle, CheckCircle } from 'lucide-react';
import { policyService } from '../services';

interface PasteLinkFieldProps {
  onLinkSubmit: (url: string, sourceType: string, explanation: string) => void;
}

export function PasteLinkField({ onLinkSubmit }: PasteLinkFieldProps) {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<{ sourceType: string; explanation: string } | null>(null);

  const handleSubmit = () => {
    if (!url.trim()) return;
    const classification = policyService.classifyLink(url.trim());
    setResult(classification);
    onLinkSubmit(url.trim(), classification.sourceType, classification.explanation);
    setUrl('');
    setTimeout(() => setResult(null), 5000);
  };

  const isRef = result?.sourceType === 'external_reference_only';

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Paste a URL..."
            className="w-full pl-9 pr-3 py-3 text-sm font-mono bg-input border border-border rounded-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 min-h-[44px]"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!url.trim()}
          className="px-4 text-xs font-mono uppercase tracking-wider bg-secondary text-secondary-foreground rounded-sm hover:bg-secondary/80 transition-colors disabled:opacity-40 min-h-[44px]"
        >
          Add
        </button>
      </div>

      {result && (
        <div className={`flex items-start gap-2 p-3 rounded-sm text-xs font-mono ${
          isRef
            ? 'bg-accent/5 border border-accent/20 text-accent'
            : 'bg-primary/5 border border-primary/20 text-primary'
        }`}>
          {isRef ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{result.explanation}</span>
        </div>
      )}
    </div>
  );
}
