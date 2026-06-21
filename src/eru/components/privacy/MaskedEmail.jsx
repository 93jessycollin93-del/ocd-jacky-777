import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { maskEmail } from '@/eru/lib/privacy';

/**
 * MaskedEmail
 * ----------------------------------------------------------------------------
 * Renders an email masked by default, with an optional click-to-reveal toggle.
 * Reveal is local to this render — never persisted, never broadcast.
 *
 * Props:
 *  - email           string         The email to display.
 *  - allowReveal     boolean        Show a tiny eye toggle. Default: true.
 *  - className       string         Extra classes for the text element.
 *  - placeholder     string         What to render when email is missing.
 *  - tooltip         string         Optional title attribute hint.
 */
export default function MaskedEmail({
  email,
  allowReveal = true,
  className = '',
  placeholder = 'Hidden',
  tooltip,
}) {
  const [revealed, setRevealed] = useState(false);

  if (!email) {
    return <span className={className}>{placeholder}</span>;
  }

  const display = revealed ? email : maskEmail(email);

  if (!allowReveal) {
    return (
      <span className={className} title={tooltip || 'Email hidden for privacy'}>
        {display}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="truncate" title={tooltip || (revealed ? email : 'Click to reveal')}>
        {display}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setRevealed((v) => !v);
        }}
        aria-label={revealed ? 'Hide email' : 'Reveal email'}
        className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </button>
    </span>
  );
}