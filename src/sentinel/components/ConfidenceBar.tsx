export function ConfidenceBar({ value, label = "CONFIDENCE", size = "sm" }: { value: number; label?: string; size?: "sm" | "md" }) {
  const color = value >= 80 ? "var(--color-success)" : value >= 60 ? "var(--color-info)" : value >= 40 ? "var(--color-warning)" : "var(--color-danger)";
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono">
      <span className="text-muted-foreground tracking-wider">{label}</span>
      <div className={(size === "md" ? "w-24 h-1.5" : "w-16 h-1") + " rounded-full bg-surface-2 overflow-hidden"}>
        <div className="h-full" style={{ width: `${value}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
      </div>
      <span className="font-mono" style={{ color }}>{value}%</span>
    </div>
  );
}
