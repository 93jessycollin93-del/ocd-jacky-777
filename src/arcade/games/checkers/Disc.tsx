// One checker: a lit, edged disc with a groove ring, and a gold crown when it is a king.
import { memo } from "react";

export const Disc = memo(function Disc({ red, king, size }: { red: boolean; king: boolean; size: number }) {
  const face = red
    ? "radial-gradient(circle at 34% 28%, #ff9a8f 0%, #ec4a42 38%, #b32622 78%, #8a1a1a 100%)"
    : "radial-gradient(circle at 34% 28%, #fffef8 0%, #f2e6c8 40%, #cdb88a 80%, #a98f5e 100%)";
  const edge = red ? "#6f1414" : "#8c7647";
  const groove = red ? "rgba(90,10,10,0.45)" : "rgba(110,86,40,0.4)";
  return (
    <div
      style={{
        position: "relative", width: size, height: size, borderRadius: "50%", background: face,
        boxShadow: `0 ${size * 0.07}px 0 ${edge}, 0 ${size * 0.13}px ${size * 0.14}px rgba(0,0,0,0.5), inset 0 0 0 ${size * 0.025}px rgba(255,255,255,0.18)`,
      }}
    >
      <div style={{ position: "absolute", inset: "15%", borderRadius: "50%", border: `${Math.max(1.5, size * 0.04)}px solid ${groove}` }} />
      <div style={{ position: "absolute", inset: "27%", borderRadius: "50%", border: `${Math.max(1, size * 0.025)}px solid ${groove}` }} />
      {king && (
        <svg viewBox="0 0 24 24" style={{ position: "absolute", inset: "19%", width: "62%", height: "62%", filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.45))" }} aria-hidden="true">
          <path d="M3 18 L2 7 L8 12 L12 4 L16 12 L22 7 L21 18 Z" fill="#fbbf24" stroke="#92400e" strokeWidth="1.4" strokeLinejoin="round" />
          <rect x="3" y="18" width="18" height="3" rx="1" fill="#f59e0b" stroke="#92400e" strokeWidth="1.2" />
          <circle cx="2" cy="6.5" r="1.6" fill="#fde68a" stroke="#92400e" strokeWidth="0.8" />
          <circle cx="12" cy="3.6" r="1.6" fill="#fde68a" stroke="#92400e" strokeWidth="0.8" />
          <circle cx="22" cy="6.5" r="1.6" fill="#fde68a" stroke="#92400e" strokeWidth="0.8" />
        </svg>
      )}
    </div>
  );
});
