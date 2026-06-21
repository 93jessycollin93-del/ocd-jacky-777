import { INTEGRATION_CATEGORIES } from '@/eru/lib/integrationRegistry';

/**
 * IntegrationFilters — horizontal scroll-row of category chips. Mobile-first.
 */
export default function IntegrationFilters({ value = 'all', onChange, query = '', onQueryChange }) {
  return (
    <div className="space-y-2">
      <input
        type="search"
        value={query}
        onChange={(e) => onQueryChange?.(e.target.value)}
        placeholder="Search integrations…"
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/40"
      />
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip active={value === 'all'} onClick={() => onChange?.('all')}>All</Chip>
        {INTEGRATION_CATEGORIES.map((c) => (
          <Chip key={c.key} active={value === c.key} onClick={() => onChange?.(c.key)}>
            {c.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-no-min-touch
      className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}