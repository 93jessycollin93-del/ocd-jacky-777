import { Lock } from 'lucide-react';

/**
 * ActionButton
 * ----------------------------------------------------------------------------
 * Permission-aware button. If `allowed` is false, the button is rendered
 * disabled with a lock icon and a tooltip explaining why — instead of being
 * hidden. Hidden buttons hide intent; visible-but-disabled buttons make the
 * permission boundary obvious.
 *
 *   <ActionButton
 *     allowed={canDeleteListing(user, listing)}
 *     deniedReason="Only the seller or an admin can delete this listing"
 *     tone="danger"
 *     onClick={handleDelete}
 *   >Delete</ActionButton>
 * --------------------------------------------------------------------------*/
const TONE = {
  default: 'bg-primary text-primary-foreground',
  danger:  'bg-destructive text-destructive-foreground',
  ghost:   'bg-secondary text-foreground border border-border',
};

export default function ActionButton({
  allowed = true,
  deniedReason = 'You don’t have permission for this action',
  tone = 'default',
  onClick,
  children,
  className = '',
  type = 'button',
  ...rest
}) {
  const cls = `${TONE[tone] || TONE.default} inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${className}`;

  if (!allowed) {
    return (
      <button
        type="button"
        disabled
        title={deniedReason}
        aria-label={deniedReason}
        className={cls}
        {...rest}
      >
        <Lock className="w-3.5 h-3.5" /> {children}
      </button>
    );
  }

  return (
    <button type={type} onClick={onClick} className={cls} {...rest}>
      {children}
    </button>
  );
}