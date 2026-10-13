// Tile faces, drawn in code. Each face is a group in a 54 x 70 box (the tile's top face), defined once and
// reused for every tile with <use>. Dots, bamboo, characters (CJK numerals), winds, dragons, flowers and
// seasons. This file only exports a component; the sizes live in metrics.ts.
import type { ReactNode } from "react";
import { FIRST_FLOWER, FIRST_SEASON } from "./tiles";

const CJK = '"Noto Serif CJK SC","Noto Sans CJK SC","Source Han Sans SC","PingFang SC","Hiragino Sans GB","Microsoft YaHei","WenQuanYi Zen Hei","Noto Sans SC",serif';
const INK = "#1b2a4a";
const RED = "#c0392b";
const GREEN = "#1f8f4e";
const BLUE = "#1d4e9b";

const NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

// ---- dots

const DOT_POS: Record<number, [number, number][]> = {
  1: [[27, 35]],
  2: [[27, 20], [27, 50]],
  3: [[13, 14], [27, 35], [41, 56]],
  4: [[16, 20], [38, 20], [16, 50], [38, 50]],
  5: [[14, 17], [40, 17], [27, 35], [14, 53], [40, 53]],
  6: [[16, 14], [38, 14], [16, 35], [38, 35], [16, 56], [38, 56]],
  7: [[10, 10], [22, 17], [34, 24], [16, 46], [38, 46], [16, 60], [38, 60]],
  8: [[16, 11], [38, 11], [16, 28], [38, 28], [16, 45], [38, 45], [16, 62], [38, 62]],
  9: [[11, 14], [27, 14], [43, 14], [11, 35], [27, 35], [43, 35], [11, 56], [27, 56], [43, 56]],
};
const DOT_R: Record<number, number> = { 1: 17, 2: 11, 3: 9.5, 4: 9.5, 5: 9, 6: 8.5, 7: 7, 8: 7.2, 9: 7.2 };

function Dot({ x, y, r, c }: { x: number; y: number; r: number; c: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={c} />
      <circle cx={x} cy={y} r={r * 0.68} fill="#fffdf2" />
      <circle cx={x} cy={y} r={r * 0.5} fill="none" stroke={c} strokeWidth={Math.max(1, r * 0.14)} />
      <circle cx={x} cy={y} r={r * 0.2} fill={c} />
    </g>
  );
}

function DotsFace({ n }: { n: number }) {
  const cols = [GREEN, RED, BLUE];
  if (n === 1) {
    return (
      <g>
        <circle cx={27} cy={35} r={19} fill={RED} />
        <circle cx={27} cy={35} r={15} fill="#fffdf2" />
        <circle cx={27} cy={35} r={12} fill={GREEN} />
        <circle cx={27} cy={35} r={8.5} fill="#fffdf2" />
        <circle cx={27} cy={35} r={6} fill={BLUE} />
        <circle cx={27} cy={35} r={2.4} fill="#fffdf2" />
      </g>
    );
  }
  const pos = DOT_POS[n];
  return (
    <g>
      {pos.map(([x, y], i) => {
        // The classic look: a green diagonal, red in the middle, blue around the rest.
        const c = n === 7 ? (i < 3 ? GREEN : RED) : n === 3 ? cols[i % 3] : n === 5 && i === 2 ? RED : n === 9 ? cols[Math.floor(i / 3)] : i % 2 ? BLUE : GREEN;
        return <Dot key={i} x={x} y={y} r={DOT_R[n]} c={c} />;
      })}
    </g>
  );
}

// ---- bamboo

function Stick({ x, y, c, h = 17, w = 6.4 }: { x: number; y: number; c: string; h?: number; w?: number }) {
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={w / 2.4} fill={c} stroke="rgba(0,0,0,0.35)" strokeWidth={0.8} />
      <rect x={x - w / 2 - 0.7} y={y - 1.2} width={w + 1.4} height={2.4} rx={1.1} fill="rgba(255,255,255,0.7)" />
      <rect x={x - w / 2 + 1.1} y={y - h / 2 + 1.6} width={1.3} height={h - 3.2} rx={0.6} fill="rgba(255,255,255,0.35)" />
    </g>
  );
}

const STICKS: Record<number, [number, number, string][]> = {
  2: [[27, 20, GREEN], [27, 50, BLUE]],
  3: [[27, 17, GREEN], [17, 51, RED], [37, 51, BLUE]],
  4: [[17, 20, GREEN], [37, 20, BLUE], [17, 50, BLUE], [37, 50, GREEN]],
  5: [[15, 18, GREEN], [39, 18, BLUE], [27, 35, RED], [15, 52, BLUE], [39, 52, GREEN]],
  6: [[13, 21, GREEN], [27, 21, GREEN], [41, 21, GREEN], [13, 50, BLUE], [27, 50, BLUE], [41, 50, BLUE]],
  7: [[27, 11, RED], [13, 36, GREEN], [27, 36, GREEN], [41, 36, GREEN], [13, 58, BLUE], [27, 58, BLUE], [41, 58, BLUE]],
  8: [[9, 21, GREEN], [21, 21, BLUE], [33, 21, GREEN], [45, 21, BLUE], [9, 50, BLUE], [21, 50, GREEN], [33, 50, BLUE], [45, 50, GREEN]],
  9: [[12, 13, GREEN], [27, 13, RED], [42, 13, BLUE], [12, 35, GREEN], [27, 35, RED], [42, 35, BLUE], [12, 57, GREEN], [27, 57, RED], [42, 57, BLUE]],
};

function BambooFace({ n }: { n: number }) {
  if (n === 1) {
    // The bird.
    return (
      <g>
        <path d="M12 52 C6 44 8 36 14 34" fill="none" stroke={BLUE} strokeWidth={4} strokeLinecap="round" />
        <path d="M14 56 C10 48 12 42 17 40" fill="none" stroke={RED} strokeWidth={3.4} strokeLinecap="round" />
        <path d="M18 58 C16 52 18 47 22 45" fill="none" stroke={GREEN} strokeWidth={3.4} strokeLinecap="round" />
        <ellipse cx={28} cy={41} rx={14} ry={10} fill={GREEN} stroke="rgba(0,0,0,0.3)" strokeWidth={0.8} />
        <path d="M20 41 C26 36 34 36 40 41 C34 47 26 47 20 41Z" fill="#6ee7a7" opacity={0.55} />
        <circle cx={38} cy={27} r={7} fill={GREEN} stroke="rgba(0,0,0,0.3)" strokeWidth={0.8} />
        <path d="M33 22 L31 14 M37 20 L37 12 M41 21 L44 14" stroke={RED} strokeWidth={2.2} strokeLinecap="round" />
        <path d="M44 26 L51 29 L44 31Z" fill="#f59e0b" />
        <circle cx={40} cy={26} r={1.8} fill="#fffdf2" />
        <circle cx={40.5} cy={26} r={0.9} fill="#111" />
        <path d="M26 51 L24 60 M32 51 L33 60" stroke="#92400e" strokeWidth={1.6} strokeLinecap="round" />
      </g>
    );
  }
  const sticks = STICKS[n];
  const small = n >= 8;
  return (
    <g>
      {sticks.map(([x, y, c], i) => (
        <Stick key={i} x={x} y={y} c={c} h={small ? 19 : n === 9 || n === 7 ? 17 : 19} w={small ? 5.4 : 6.4} />
      ))}
    </g>
  );
}

// ---- characters, winds, dragons

function CharFace({ n }: { n: number }) {
  return (
    <g fontFamily={CJK} textAnchor="middle" fontWeight={700}>
      <text x={27} y={29} fontSize={27} fill={INK}>{NUMERALS[n]}</text>
      <text x={27} y={61} fontSize={29} fill={RED}>萬</text>
    </g>
  );
}

const WIND_CH = ["東", "南", "西", "北"];
const WIND_LETTER = ["E", "S", "W", "N"];

function WindFace({ n }: { n: number }) {
  return (
    <g fontFamily={CJK} textAnchor="middle" fontWeight={700}>
      <text x={27} y={50} fontSize={42} fill={INK}>{WIND_CH[n]}</text>
      <text x={9} y={14} fontSize={10} fill="#6b7280" textAnchor="middle" fontFamily="system-ui, sans-serif">{WIND_LETTER[n]}</text>
    </g>
  );
}

function DragonFace({ n }: { n: number }) {
  if (n === 2) {
    // White dragon: an empty frame.
    return (
      <g fill="none" stroke={BLUE} strokeLinejoin="round">
        <rect x={9} y={10} width={36} height={50} rx={4} strokeWidth={3.2} />
        <rect x={14.5} y={15.5} width={25} height={39} rx={2.5} strokeWidth={1.6} />
      </g>
    );
  }
  return (
    <g fontFamily={CJK} textAnchor="middle" fontWeight={700}>
      <text x={27} y={51} fontSize={46} fill={n === 0 ? RED : GREEN}>{n === 0 ? "中" : "發"}</text>
    </g>
  );
}

// ---- flowers and seasons

function Corner({ n, tint }: { n: number; tint: string }) {
  return (
    <g>
      <circle cx={10} cy={11} r={7.2} fill={tint} />
      <text x={10} y={14.6} fontSize={10} fontWeight={700} textAnchor="middle" fill="#fff" fontFamily="system-ui, sans-serif">{n}</text>
    </g>
  );
}

function PlumFace() {
  const petals = [0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return [27 + Math.cos(a) * 10, 40 + Math.sin(a) * 10] as const;
  });
  return (
    <g>
      <path d="M8 66 C20 56 28 52 44 52" stroke="#7c4a24" strokeWidth={3} fill="none" strokeLinecap="round" />
      {petals.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={7.5} fill="#f4849f" stroke="#c2415f" strokeWidth={0.9} />)}
      <circle cx={27} cy={40} r={4.2} fill="#fcd34d" stroke="#b45309" strokeWidth={0.8} />
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2 + 0.3;
        return <circle key={i} cx={27 + Math.cos(a) * 2.6} cy={40 + Math.sin(a) * 2.6} r={0.8} fill="#b45309" />;
      })}
    </g>
  );
}

function OrchidFace() {
  return (
    <g>
      <path d="M27 66 C18 56 12 44 10 28" stroke="#2f9e5b" strokeWidth={4.2} fill="none" strokeLinecap="round" />
      <path d="M27 66 C30 52 36 40 46 30" stroke="#1f8f4e" strokeWidth={4.2} fill="none" strokeLinecap="round" />
      <path d="M27 66 C26 54 26 44 28 34" stroke="#43b97a" strokeWidth={3.4} fill="none" strokeLinecap="round" />
      <g transform="translate(27 30)">
        {[-50, 0, 50].map((a) => <ellipse key={a} cx={0} cy={-8} rx={4.4} ry={9} fill="#b57edc" stroke="#7e3fa8" strokeWidth={0.8} transform={`rotate(${a})`} />)}
        <ellipse cx={0} cy={4} rx={5} ry={4} fill="#f9a8d4" stroke="#be185d" strokeWidth={0.8} />
        <circle cx={0} cy={0} r={2.2} fill="#fcd34d" />
      </g>
    </g>
  );
}

function ChrysFace() {
  return (
    <g transform="translate(27 40)">
      {Array.from({ length: 16 }, (_, i) => (
        <ellipse key={i} cx={0} cy={-13} rx={2.8} ry={9} fill={i % 2 ? "#fb923c" : "#fbbf24"} stroke="#b45309" strokeWidth={0.6} transform={`rotate(${(i * 360) / 16})`} />
      ))}
      <circle cx={0} cy={0} r={6.5} fill="#b45309" />
      <circle cx={0} cy={0} r={3.4} fill="#fbbf24" />
    </g>
  );
}

function BambooFlowerFace() {
  return (
    <g>
      <rect x={24} y={12} width={6} height={54} rx={3} fill={GREEN} stroke="rgba(0,0,0,0.3)" strokeWidth={0.8} />
      {[24, 40, 56].map((y) => <rect key={y} x={22.6} y={y} width={8.8} height={2.6} rx={1.3} fill="#a7f3d0" stroke="rgba(0,0,0,0.25)" strokeWidth={0.5} />)}
      <path d="M30 24 C40 22 46 28 48 36 C40 36 34 32 30 24Z" fill="#43b97a" stroke="#176b3a" strokeWidth={0.8} />
      <path d="M24 42 C14 40 8 46 6 54 C14 54 20 50 24 42Z" fill="#43b97a" stroke="#176b3a" strokeWidth={0.8} />
      <path d="M30 56 C38 56 44 60 46 66 C38 66 32 62 30 56Z" fill="#2f9e5b" stroke="#176b3a" strokeWidth={0.8} />
    </g>
  );
}

function SpringFace() {
  return (
    <g>
      <path d="M27 64 C27 52 27 44 27 32" stroke="#2f9e5b" strokeWidth={3.6} fill="none" strokeLinecap="round" />
      <ellipse cx={17} cy={42} rx={11} ry={5.2} fill="#86efac" stroke="#15803d" strokeWidth={0.9} transform="rotate(-30 17 42)" />
      <ellipse cx={38} cy={36} rx={11} ry={5.2} fill="#4ade80" stroke="#15803d" strokeWidth={0.9} transform="rotate(30 38 36)" />
      <circle cx={27} cy={28} r={5.5} fill="#f9a8d4" stroke="#be185d" strokeWidth={0.9} />
      <circle cx={27} cy={28} r={2} fill="#fcd34d" />
      <path d="M12 64 H42" stroke="#92400e" strokeWidth={2.6} strokeLinecap="round" />
    </g>
  );
}

function SummerFace() {
  return (
    <g transform="translate(27 38)">
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={-1.8} y={-23} width={3.6} height={8} rx={1.8} fill="#f59e0b" transform={`rotate(${i * 30})`} />
      ))}
      <circle r={13} fill="#fbbf24" stroke="#d97706" strokeWidth={1.2} />
      <circle cx={-3} cy={-3} r={4} fill="#fde68a" opacity={0.8} />
    </g>
  );
}

function AutumnFace() {
  return (
    <g>
      <path d="M27 14 C42 24 46 44 27 60 C8 44 12 24 27 14Z" fill="#ea580c" stroke="#9a3412" strokeWidth={1.1} />
      <path d="M27 14 C34 26 34 44 27 60 C20 44 20 26 27 14Z" fill="#f97316" opacity={0.7} />
      <path d="M27 18 V66" stroke="#7c2d12" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M27 30 L18 24 M27 38 L16 34 M27 46 L19 44 M27 30 L36 24 M27 38 L38 34 M27 46 L35 44" stroke="#7c2d12" strokeWidth={1.1} strokeLinecap="round" />
    </g>
  );
}

function WinterFace() {
  return (
    <g transform="translate(27 40)" stroke="#38bdf8" strokeLinecap="round" fill="none">
      {[0, 60, 120].map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d="M0 -22 V22" strokeWidth={3} />
          <path d="M-6 -15 L0 -10 L6 -15 M-6 15 L0 10 L6 15" strokeWidth={2.2} />
        </g>
      ))}
      <circle r={4.4} fill="#e0f2fe" strokeWidth={1.6} />
    </g>
  );
}

function Face({ kind }: { kind: number }): ReactNode {
  if (kind < 9) return <DotsFace n={kind + 1} />;
  if (kind < 18) return <BambooFace n={kind - 8} />;
  if (kind < 27) return <CharFace n={kind - 18} />;
  if (kind < 31) return <WindFace n={kind - 27} />;
  if (kind < FIRST_FLOWER) return <DragonFace n={kind - 31} />;
  if (kind < FIRST_SEASON) {
    const n = kind - FIRST_FLOWER;
    return (
      <g>
        <Corner n={n + 1} tint="#db2777" />
        {n === 0 ? <PlumFace /> : n === 1 ? <OrchidFace /> : n === 2 ? <ChrysFace /> : <BambooFlowerFace />}
      </g>
    );
  }
  const n = kind - FIRST_SEASON;
  return (
    <g>
      <Corner n={n + 1} tint="#d97706" />
      {n === 0 ? <SpringFace /> : n === 1 ? <SummerFace /> : n === 2 ? <AutumnFace /> : <WinterFace />}
    </g>
  );
}

/** Put once inside the board's <svg>: the tile gradients and all 42 faces (ids mj-k0 to mj-k41). */
export function TileDefs() {
  return (
    <defs>
      <linearGradient id="mj-ivory" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fffef7" />
        <stop offset="0.55" stopColor="#f8f0d6" />
        <stop offset="1" stopColor="#ebdfba" />
      </linearGradient>
      <linearGradient id="mj-jade" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#4fc4a0" />
        <stop offset="1" stopColor="#1b6f5a" />
      </linearGradient>
      {Array.from({ length: 42 }, (_, k) => (
        <g key={k} id={`mj-k${k}`}>
          <Face kind={k} />
        </g>
      ))}
    </defs>
  );
}
