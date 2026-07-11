import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import BottomSheet from './BottomSheet';

/**
 * MobileSelect — drop-in replacement for native <select> that opens a
 * BottomSheet on mobile. API mirrors a basic select:
 *
 *   <MobileSelect
 *     value={value}
 *     onChange={setValue}
 *     options={[{value:'a', label:'A'}, ...]}
 *     placeholder="Pick one"
 *   />
 *
 * The component renders a touch-friendly trigger (44px min height) and a
 * radio-style picker list inside the bottom sheet. Use it where native
 * dropdowns feel cramped on Android — existing <select> elements keep working
 * and can be migrated incrementally.
 */
export default function MobileSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  title,
  disabled = false,
  className = '',
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => String(o.value) === String(value));

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label={ariaLabel || title || placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm text-foreground disabled:opacity-50 ${className}`}
      >
        <span className={`truncate ${current ? '' : 'text-muted-foreground'}`}>
          {current ? current.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={title || placeholder}>
        <ul role="listbox" className="space-y-1">
          {options.map((opt) => {
            const active = String(opt.value) === String(value);
            return (
              <li key={String(opt.value)}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => { onChange?.(opt.value); setOpen(false); }}
                  className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm text-left ${
                    active
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-background text-foreground hover:border-primary/40'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </>
  );
}