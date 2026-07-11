export default function ThemeScopePreview() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold">Live layer preview</p>
      <p className="mt-1 text-[11px] text-muted-foreground">Preview app, section, panel, input, badge, and button surfaces together.</p>
      <div className="mt-4 rounded-[var(--layer-radius,1rem)] border border-[var(--page-border)] bg-[var(--section-bg,transparent)] p-4" style={{ boxShadow: 'var(--layer-shadow)', backdropFilter: 'blur(10px)' }}>
        <div className="rounded-[var(--layer-radius,1rem)] border border-[var(--page-border)] bg-[var(--panel-bg,var(--surface-bg))] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--surface-foreground,hsl(var(--card-foreground)))]">Control panel preview</p>
              <p className="text-[11px] text-muted-foreground">Surface contrast and readability update live.</p>
            </div>
            <span className="rounded-full border border-border bg-[var(--widget-bg,var(--surface-bg))] px-2.5 py-1 text-[10px]">Badge</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input placeholder="Input field preview" className="min-h-11 rounded-[var(--layer-radius,1rem)] border px-3 py-2 text-sm outline-none" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }} />
            <div className="rounded-[var(--layer-radius,1rem)] border border-border bg-[var(--card-bg,var(--surface-bg))] px-3 py-3 text-sm">Card / tile preview</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-[var(--layer-radius,1rem)] border px-4 py-2 text-sm font-medium" style={{ background: 'var(--button-bg)', color: 'var(--button-foreground)', borderColor: 'var(--button-border)', boxShadow: 'var(--button-glow)' }}>Primary Button</button>
            <button className="rounded-[var(--layer-radius,1rem)] border px-4 py-2 text-sm" style={{ background: 'var(--button-hover-bg)', color: 'var(--button-foreground)', borderColor: 'var(--button-border)' }}>Hover State</button>
            <button className="rounded-[var(--layer-radius,1rem)] border px-4 py-2 text-sm" style={{ background: 'var(--button-active-bg)', color: 'var(--button-foreground)', borderColor: 'var(--button-border)' }}>Active State</button>
            <button disabled className="rounded-[var(--layer-radius,1rem)] border px-4 py-2 text-sm opacity-70" style={{ background: 'var(--button-disabled-bg)', color: 'var(--button-foreground)', borderColor: 'var(--button-border)' }}>Disabled</button>
          </div>
        </div>
      </div>
    </div>
  );
}