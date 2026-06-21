import { motion } from "framer-motion";

interface SpermCellProps {
  bodyColor: string; // hsl values
  tailColor: string;
  swimming?: boolean;
  size?: number;
}

export const SpermCell = ({
  bodyColor,
  tailColor,
  swimming = true,
  size = 44,
}: SpermCellProps) => {
  return (
    <svg
      width={size}
      height={size * 0.55}
      viewBox="0 0 100 55"
      fill="none"
      style={{ filter: `drop-shadow(0 0 6px hsl(${bodyColor} / 0.7))` }}
    >
      {/* Tail */}
      <motion.path
        d="M48 27 C 38 18, 30 36, 20 27 C 10 18, 4 36, -4 27"
        stroke={`hsl(${tailColor})`}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        animate={
          swimming
            ? {
                d: [
                  "M48 27 C 38 18, 30 36, 20 27 C 10 18, 4 36, -4 27",
                  "M48 27 C 38 36, 30 18, 20 27 C 10 36, 4 18, -4 27",
                  "M48 27 C 38 18, 30 36, 20 27 C 10 18, 4 36, -4 27",
                ],
              }
            : undefined
        }
        transition={{ duration: 0.45, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Head */}
      <ellipse cx="68" cy="27" rx="26" ry="20" fill={`hsl(${bodyColor})`} />
      <ellipse cx="68" cy="27" rx="26" ry="20" fill="url(#sheen)" opacity="0.5" />
      {/* nucleus */}
      <circle cx="74" cy="27" r="8" fill={`hsl(${tailColor})`} opacity="0.85" />
      <defs>
        <radialGradient id="sheen" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="white" stopOpacity="0.9" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
};
