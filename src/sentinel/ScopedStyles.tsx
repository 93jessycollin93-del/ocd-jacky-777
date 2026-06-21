export const SENTINEL_CSS = `
.cs-scope {
  --color-surface-1: oklch(0.20 0.022 252);
  --color-surface-2: oklch(0.24 0.024 252);
  --color-grid: oklch(0.30 0.02 252);
  --color-success: oklch(0.78 0.18 150);
  --color-warning: oklch(0.82 0.17 80);
  --color-danger: oklch(0.66 0.24 25);
  --color-info: oklch(0.70 0.18 220);
  --color-chart-1: oklch(0.82 0.20 150);
  --color-chart-2: oklch(0.70 0.18 220);
  --color-chart-3: oklch(0.82 0.17 80);
  --color-chart-4: oklch(0.66 0.24 25);
  --color-chart-5: oklch(0.72 0.20 300);
  --color-primary: oklch(0.82 0.20 150);
  --color-primary-foreground: oklch(0.16 0.018 252);
  --color-background: oklch(0.16 0.018 252);
  --color-foreground: oklch(0.96 0.01 230);
  --color-popover: oklch(0.22 0.024 252);
  --color-border: oklch(0.30 0.022 252);
  --color-muted-foreground: oklch(0.66 0.024 240);
  background: var(--color-background);
  color: var(--color-foreground);
  min-height: 100vh;
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
}
.cs-scope .font-display { font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; }
.cs-scope .font-mono { font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; }
.cs-scope .text-primary { color: var(--color-primary); }
.cs-scope .bg-primary { background-color: var(--color-primary); color: var(--color-primary-foreground); }
.cs-scope .text-primary-foreground { color: var(--color-primary-foreground); }
.cs-scope .text-danger { color: var(--color-danger); }
.cs-scope .text-warning { color: var(--color-warning); }
.cs-scope .text-info { color: var(--color-info); }
.cs-scope .text-success { color: var(--color-success); }
.cs-scope .bg-card { background-color: var(--color-surface-1); }
.cs-scope .border-border { border-color: var(--color-border); }
.cs-scope .bg-surface-1 { background: var(--color-surface-1); }
.cs-scope .bg-surface-2 { background: var(--color-surface-2); }
.cs-scope .bg-surface-1\\/40 { background: color-mix(in oklab, var(--color-surface-1) 40%, transparent); }
.cs-scope .bg-surface-1\\/50 { background: color-mix(in oklab, var(--color-surface-1) 50%, transparent); }
.cs-scope .bg-surface-2\\/60 { background: color-mix(in oklab, var(--color-surface-2) 60%, transparent); }
.cs-scope .bg-surface-2\\/70 { background: color-mix(in oklab, var(--color-surface-2) 70%, transparent); }
.cs-scope .bg-surface-2\\/50 { background: color-mix(in oklab, var(--color-surface-2) 50%, transparent); }
.cs-scope .text-muted-foreground { color: var(--color-muted-foreground); }
.cs-scope .grid-bg {
  background-image:
    linear-gradient(to right, color-mix(in oklab, var(--color-grid) 40%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in oklab, var(--color-grid) 40%, transparent) 1px, transparent 1px);
  background-size: 32px 32px;
}
.cs-scope .scanline {
  background: linear-gradient(180deg, transparent 0%, color-mix(in oklab, var(--color-primary) 8%, transparent) 50%, transparent 100%);
}
.cs-scope .fill-foreground { fill: var(--color-foreground); }
`;
