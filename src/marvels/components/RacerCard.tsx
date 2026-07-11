import { Racer, overall } from "@/marvels/lib/raceEngine";
import { SpermCell } from "./SpermCell";
import { Gauge, Heart, Compass, Sparkles } from "lucide-react";

interface RacerCardProps {
  racer: Racer;
  selected?: boolean;
  bet?: number;
  onClick?: () => void;
}

const Stat = ({ icon: Icon, value, color }: { icon: typeof Gauge; value: number; color: string }) => (
  <div className="flex items-center gap-1.5">
    <Icon className="h-3 w-3" style={{ color }} />
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
    </div>
  </div>
);

export const RacerCard = ({ racer, selected, bet, onClick }: RacerCardProps) => {
  return (
    <button
      onClick={onClick}
      className={`mm-card group relative flex w-full flex-col gap-3 rounded-xl border p-4 text-left transition-all ${
        selected ? "mm-card-selected" : "border-border bg-card hover:border-primary/50"
      }`}
    >
      {bet ? (
        <span className="absolute right-3 top-3 rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-semibold text-secondary">
          BET {bet} ⬡
        </span>
      ) : null}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted/50">
          <SpermCell bodyColor={racer.color} tailColor={racer.tailColor} size={40} />
        </div>
        <div className="min-w-0">
          <p className="truncate mm-display text-sm">{racer.name}</p>
          <p className="text-xs text-muted-foreground">
            OVR <span className="font-semibold text-primary">{overall(racer.attrs)}</span>
          </p>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Stat icon={Gauge} value={racer.attrs.speed} color="hsl(168 90% 55%)" />
        <Stat icon={Heart} value={racer.attrs.stamina} color="hsl(315 85% 62%)" />
        <Stat icon={Compass} value={racer.attrs.navigation} color="hsl(265 85% 66%)" />
        <Stat icon={Sparkles} value={racer.attrs.luck} color="hsl(45 95% 60%)" />
      </div>
    </button>
  );
};
