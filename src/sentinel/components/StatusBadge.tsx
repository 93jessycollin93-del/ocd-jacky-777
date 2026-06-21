import type { IncidentStatus } from "@/sentinel/lib/mockData";
import { statusColor } from "@/sentinel/lib/mockData";

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const c = statusColor(status);
  const color = `var(--color-${c})`;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider whitespace-nowrap"
      style={{
        color,
        border: `1px solid color-mix(in oklab, ${color} 50%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
      }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
      {status}
    </span>
  );
}
