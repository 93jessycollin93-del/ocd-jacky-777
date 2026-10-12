// Textures for Dead Hours, painted on canvases at runtime (no image files): grimy floors and walls,
// boards, chalk drawings of wall guns, perk signs and power-up icons.
import * as THREE from "three";
import { PERKS, WEAPONS, type PerkId, type WeaponClass, type WeaponId } from "../engine/weapons";

type RGB = [number, number, number];

function seeded(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rgb = (c: RGB, d = 0, a = 1) =>
  `rgba(${c.map((v) => Math.max(0, Math.min(255, Math.round(v + d)))).join(",")},${a})`;

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d")! };
}

function finish(c: HTMLCanvasElement, pixel: boolean, repeat = false): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (pixel) {
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestMipmapLinearFilter;
  }
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

export type Surface =
  | "wood_floor" | "tile_floor" | "concrete" | "stone" | "plaster" | "wallpaper" | "brick" | "ceiling" | "board" | "dirt"
  | "metal";

const cache = new Map<string, THREE.CanvasTexture>();

/** A tiling 64×64 surface, with grime. */
export function surface(kind: Surface): THREE.CanvasTexture {
  const hit = cache.get(kind);
  if (hit) return hit;
  const S = 64;
  const { c, ctx } = canvas(S, S);
  const rng = seeded(kind.length * 7919 + kind.charCodeAt(0) * 31);
  const px = (x: number, y: number, col: string, w = 1, h = 1) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  };
  const noise = (base: RGB, spread: number) => {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) px(x, y, rgb(base, (rng() - 0.5) * spread));
  };
  const grime = (n: number, alpha: number) => {
    for (let i = 0; i < n; i++) {
      const x = rng() * S;
      const y = rng() * S;
      const r = 2 + rng() * 9;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(20,14,8,${alpha})`);
      g.addColorStop(1, "rgba(20,14,8,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  };

  if (kind === "wood_floor" || kind === "board" || kind === "ceiling") {
    const base: RGB = kind === "ceiling" ? [58, 42, 30] : kind === "board" ? [128, 92, 58] : [104, 72, 46];
    const plank = kind === "board" ? 64 : 8;
    for (let y = 0; y < S; y++) {
      const row = Math.floor(y / plank);
      const tone = ((row * 37) % 9) - 4;
      for (let x = 0; x < S; x++) {
        const seam = y % plank === plank - 1 || (x + row * 23) % 32 === 0;
        const grain = Math.sin((x + row * 11) * 0.45 + Math.sin(y * 0.9) * 1.5) * 6;
        px(x, y, seam ? rgb(base, -42) : rgb(base, tone * 3 + grain + (rng() - 0.5) * 10));
      }
    }
    if (kind === "board") {
      for (const nx of [6, 57]) for (const ny of [18, 44]) px(nx, ny, "#2a2a2a", 2, 2);
    }
    grime(kind === "ceiling" ? 10 : 18, 0.35);
  } else if (kind === "tile_floor") {
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const checker = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0;
        const grout = x % 16 === 0 || y % 16 === 0;
        const base: RGB = checker ? [176, 168, 150] : [52, 50, 48];
        px(x, y, grout ? "rgb(70,64,56)" : rgb(base, (rng() - 0.5) * 14));
      }
    }
    grime(26, 0.45);
  } else if (kind === "concrete" || kind === "stone" || kind === "dirt") {
    const base: RGB = kind === "concrete" ? [96, 96, 92] : kind === "stone" ? [92, 86, 80] : [44, 40, 32];
    noise(base, kind === "dirt" ? 26 : 18);
    if (kind === "stone") {
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const row = Math.floor(y / 16);
          if (y % 16 === 0 || (x + (row % 2) * 16) % 32 === 0) px(x, y, rgb(base, -38));
        }
      }
    }
    if (kind === "concrete") {
      for (let i = 0; i < 5; i++) {
        let x = rng() * S;
        let y = rng() * S;
        for (let k = 0; k < 14; k++) {
          px(Math.floor(x), Math.floor(y), "rgba(30,30,28,0.8)");
          x += (rng() - 0.5) * 3;
          y += rng() * 2;
        }
      }
    }
    if (kind === "dirt") {
      for (let i = 0; i < 90; i++) px(Math.floor(rng() * S), Math.floor(rng() * S), rgb([58, 70, 34], (rng() - 0.5) * 20), 1, 2);
    }
    grime(20, 0.4);
  } else if (kind === "plaster" || kind === "wallpaper") {
    const base: RGB = kind === "wallpaper" ? [92, 70, 58] : [128, 120, 104];
    noise(base, 10);
    if (kind === "wallpaper") {
      for (let x = 0; x < S; x += 8) {
        for (let y = 0; y < S; y++) px(x, y, rgb(base, -16));
        for (let y = (x / 8) % 2 ? 4 : 0; y < S; y += 8) px(x + 3, y + 2, rgb([150, 120, 80], -20), 2, 2);
      }
    }
    // Water stains running down.
    for (let i = 0; i < 6; i++) {
      const x = rng() * S;
      const len = 10 + rng() * 40;
      const g = ctx.createLinearGradient(0, 0, 0, len);
      g.addColorStop(0, "rgba(40,30,20,0.45)");
      g.addColorStop(1, "rgba(40,30,20,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, 2 + rng() * 4, len);
    }
    grime(16, 0.3);
  } else if (kind === "brick") {
    const base: RGB = [108, 54, 42];
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const row = Math.floor(y / 8);
        const mortar = y % 8 === 7 || (x + (row % 2) * 8) % 16 === 15;
        px(x, y, mortar ? "rgb(70,64,58)" : rgb(base, (rng() - 0.5) * 22 + ((row * 13) % 5) * 3));
      }
    }
    grime(18, 0.4);
  } else if (kind === "metal") {
    noise([86, 90, 94], 12);
    for (let y = 0; y < S; y += 16) for (let x = 0; x < S; x++) px(x, y, "rgba(40,42,44,0.9)");
    for (let i = 0; i < 12; i++) px(Math.floor(rng() * S), Math.floor(rng() * S), "rgba(120,62,30,0.7)", 3, 2);
  }
  const t = finish(c, true, true);
  cache.set(kind, t);
  return t;
}

// ---------------------------------------------------------------- chalk outlines of wall guns

/** Silhouettes in a 100×36 box, one per kind of gun. */
const SILHOUETTES: Record<WeaponClass, number[][]> = {
  pistol: [[20, 10, 70, 10, 70, 16, 46, 16, 42, 30, 32, 30, 34, 16, 20, 16]],
  rifle: [[2, 14, 30, 12, 34, 10, 96, 10, 96, 14, 60, 14, 58, 20, 50, 20, 48, 26, 42, 26, 40, 18, 30, 20, 4, 24]],
  smg: [[10, 14, 30, 10, 78, 10, 78, 15, 56, 15, 54, 32, 48, 32, 46, 16, 36, 18, 32, 26, 26, 26, 24, 18, 10, 20]],
  shotgun: [[2, 16, 26, 12, 98, 10, 98, 16, 64, 16, 64, 20, 44, 20, 30, 18, 4, 26]],
  lmg: [[2, 14, 28, 10, 96, 9, 96, 14, 62, 14, 62, 30, 46, 30, 44, 16, 32, 18, 28, 26, 4, 24]],
  sniper: [[2, 16, 28, 12, 98, 12, 98, 15, 52, 15, 50, 22, 42, 22, 40, 18, 30, 20, 4, 26], [40, 4, 66, 4, 66, 9, 40, 9]],
  revolver: [[18, 10, 80, 10, 80, 15, 50, 15, 50, 19, 44, 20, 40, 32, 30, 32, 32, 18, 18, 16]],
  wonder: [[10, 12, 70, 6, 92, 14, 70, 22, 50, 20, 46, 32, 36, 32, 38, 20, 12, 20]],
};

/** A chalk drawing of the gun with its name and price, for the wall. */
export function chalkTexture(id: WeaponId): THREE.CanvasTexture {
  const key = `chalk:${id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const def = WEAPONS[id];
  const { c, ctx } = canvas(256, 160);
  const rng = seeded(id.length * 131);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // A few wobbly passes, like real chalk.
  for (const poly of SILHOUETTES[def.cls]) {
    for (let pass = 0; pass < 3; pass++) {
      ctx.strokeStyle = `rgba(235,235,225,${0.35 + pass * 0.15})`;
      ctx.lineWidth = 3 - pass * 0.6;
      ctx.beginPath();
      for (let i = 0; i < poly.length; i += 2) {
        const x = 28 + poly[i] * 2 + (rng() - 0.5) * 2;
        const y = 18 + poly[i + 1] * 2.3 + (rng() - 0.5) * 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.fillStyle = "rgba(240,240,230,0.92)";
  ctx.textAlign = "center";
  ctx.font = "bold 20px 'Trebuchet MS', sans-serif";
  ctx.fillText(def.name.toUpperCase(), 128, 128);
  ctx.font = "bold 17px 'Trebuchet MS', sans-serif";
  ctx.fillStyle = "rgba(250,220,120,0.95)";
  ctx.fillText(`${def.cost ?? ""}`, 128, 150);
  const t = finish(c, false);
  cache.set(key, t);
  return t;
}

// ---------------------------------------------------------------- signs

export function signTexture(lines: { text: string; size: number; color: string }[], bg: string, border?: string): THREE.CanvasTexture {
  const key = `sign:${bg}:${lines.map((l) => l.text).join("|")}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { c, ctx } = canvas(256, 128);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 128);
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = 6;
    ctx.strokeRect(5, 5, 246, 118);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const total = lines.reduce((a, l) => a + l.size * 1.15, 0);
  let y = 64 - total / 2;
  for (const l of lines) {
    ctx.font = `900 ${l.size}px 'Impact', 'Arial Black', sans-serif`;
    ctx.fillStyle = l.color;
    ctx.shadowColor = l.color;
    ctx.shadowBlur = 10;
    y += (l.size * 1.15) / 2;
    ctx.fillText(l.text, 128, y);
    y += (l.size * 1.15) / 2;
  }
  const t = finish(c, false);
  cache.set(key, t);
  return t;
}

export const perkSign = (id: PerkId) =>
  signTexture(
    [
      { text: PERKS[id].name.toUpperCase(), size: 34, color: PERKS[id].color },
      { text: `${PERKS[id].cost}`, size: 22, color: "#f5f0e0" },
    ],
    "#120e0c",
    PERKS[id].color,
  );

export const boxTexture = () =>
  signTexture([{ text: "?  ?  ?", size: 64, color: "#f2e7c4" }], "#3b2716", "#c9a24a");

/** Soft round glow, for muzzle flashes, power-ups and lamps. */
export function glowTexture(): THREE.CanvasTexture {
  const hit = cache.get("glow");
  if (hit) return hit;
  const { c, ctx } = canvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,240,200,0.8)");
  g.addColorStop(1, "rgba(255,200,120,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = finish(c, false);
  cache.set("glow", t);
  return t;
}

/** A star-shaped muzzle flash. */
export function flashTexture(): THREE.CanvasTexture {
  const hit = cache.get("flash");
  if (hit) return hit;
  const { c, ctx } = canvas(64, 64);
  ctx.translate(32, 32);
  for (let i = 0; i < 7; i++) {
    ctx.rotate((Math.PI * 2) / 7);
    const g = ctx.createLinearGradient(0, 0, 30, 0);
    g.addColorStop(0, "rgba(255,250,220,1)");
    g.addColorStop(1, "rgba(255,160,40,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(30, 0);
    ctx.lineTo(0, 4);
    ctx.fill();
  }
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
  core.addColorStop(0, "rgba(255,255,240,1)");
  core.addColorStop(1, "rgba(255,200,80,0)");
  ctx.fillStyle = core;
  ctx.fillRect(-12, -12, 24, 24);
  const t = finish(c, false);
  cache.set("flash", t);
  return t;
}

/** Power-up icon: an emoji in a glowing disc. */
export function iconTexture(icon: string, color: string): THREE.CanvasTexture {
  const key = `icon:${icon}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { c, ctx } = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
  g.addColorStop(0, color);
  g.addColorStop(0.55, `${color}88`);
  g.addColorStop(1, `${color}00`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "64px sans-serif";
  ctx.fillText(icon, 64, 68);
  const t = finish(c, false);
  cache.set(key, t);
  return t;
}
