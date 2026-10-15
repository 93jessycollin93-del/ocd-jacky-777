// Flap Dash art, drawn entirely in code: sky, parallax clouds / hills / city, glowing pillars, the bird and the ground.
import { circle, clamp, lerp, roundRect, shade, withAlpha, type Ctx } from "../../kit/draw";
import { mulberry32 } from "../../kit/rng";
import { GROUND_Y, PILLAR_W, VIEW_H, type MedalName, type Pillar } from "./logic";

// ---------------------------------------------------------------- colour helpers

/** Blend two #rrggbb colours. */
export function mix(a: string, b: string, t: number): string {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const k = clamp(t, 0, 1);
  const ch = (s: number) => Math.round(lerp((x >> s) & 255, (y >> s) & 255, k));
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

/** Blend through three colours: 0 → a, 0.5 → b, 1 → c. */
function mix3(a: string, b: string, c: string, t: number) {
  return t < 0.5 ? mix(a, b, t * 2) : mix(b, c, (t - 0.5) * 2);
}

export function hsl(h: number, s: number, l: number, a = 1) {
  return `hsla(${Math.round(h) % 360}, ${s}%, ${l}%, ${a})`;
}

// ---------------------------------------------------------------- the sky

export function drawSky(ctx: Ctx, w: number, n: number) {
  const top = mix3("#2f9bff", "#5a3b95", "#050817", n);
  const bottom = mix3("#c7edff", "#ff9d6e", "#1c2552", n);
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, VIEW_H);
}

const rngStars = mulberry32(11);
const STARS = Array.from({ length: 70 }, () => ({
  x: rngStars(), y: rngStars() * 0.62, r: 0.6 + rngStars() * 1.4, tw: rngStars() * 6.28,
}));

export function drawSkyBodies(ctx: Ctx, w: number, n: number, time: number) {
  if (n > 0.12) {
    const a = clamp((n - 0.12) / 0.7, 0, 1);
    ctx.fillStyle = "#ffffff";
    for (const s of STARS) {
      ctx.globalAlpha = a * (0.45 + 0.55 * Math.sin(time * 1.6 + s.tw) ** 2);
      ctx.fillRect(s.x * w, s.y * GROUND_Y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
  }
  // The sun sets as the moon rises.
  const sunA = clamp(1.2 - n * 1.6, 0, 1);
  if (sunA > 0.02) {
    const sx = w * 0.76;
    const sy = 120 + n * 300;
    const g = ctx.createRadialGradient(sx, sy, 8, sx, sy, 90);
    g.addColorStop(0, withAlpha("#fff6c2", 0.9 * sunA));
    g.addColorStop(1, withAlpha("#ffd166", 0));
    ctx.fillStyle = g;
    ctx.fillRect(sx - 100, sy - 100, 200, 200);
    circle(ctx, sx, sy, 26, withAlpha(mix("#fff3a8", "#ffb35c", n), sunA));
  }
  const moonA = clamp((n - 0.25) * 1.6, 0, 1);
  if (moonA > 0.02) {
    const mx = w * 0.26;
    const my = 400 - n * 300;
    const g = ctx.createRadialGradient(mx, my, 10, mx, my, 70);
    g.addColorStop(0, withAlpha("#cfe3ff", 0.35 * moonA));
    g.addColorStop(1, withAlpha("#cfe3ff", 0));
    ctx.fillStyle = g;
    ctx.fillRect(mx - 80, my - 80, 160, 160);
    circle(ctx, mx, my, 20, withAlpha("#f4f7ff", moonA));
    circle(ctx, mx + 8, my - 5, 17, withAlpha(mix("#2b3a78", "#1a2250", 0.5), moonA));
    ctx.globalAlpha = moonA * 0.25;
    circle(ctx, mx - 5, my + 6, 3, "#9fb2e6");
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- parallax scenery

const CLOUD_PERIOD = 1500;
const rngClouds = mulberry32(5);
const CLOUDS = Array.from({ length: 9 }, (_, i) => ({
  x: (i / 9) * CLOUD_PERIOD + rngClouds() * 80, y: 50 + rngClouds() * 230, s: 0.7 + rngClouds() * 0.9, v: rngClouds(),
}));

export function drawClouds(ctx: Ctx, w: number, scroll: number, n: number, time: number) {
  const col = mix3("#ffffff", "#ffd2c0", "#6b74b8", n);
  ctx.fillStyle = col;
  ctx.globalAlpha = 0.9 - n * 0.3;
  for (const c of CLOUDS) {
    // Clouds drift a little on their own as well as with the parallax.
    let x = (((c.x - scroll * 0.22 - time * 5 * c.v) % CLOUD_PERIOD) + CLOUD_PERIOD) % CLOUD_PERIOD;
    x -= 200;
    if (x > w + 120) continue;
    const s = c.s;
    ctx.beginPath();
    ctx.ellipse(x, c.y, 54 * s, 20 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 26 * s, c.y - 12 * s, 30 * s, 24 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 10 * s, c.y - 22 * s, 34 * s, 28 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 36 * s, c.y - 6 * s, 28 * s, 18 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawHills(ctx: Ctx, w: number, scroll: number, n: number) {
  const base = GROUND_Y - 70;
  ctx.fillStyle = mix3("#9bd9a8", "#8a6d8f", "#16214a", n);
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  const off = scroll * 0.3;
  for (let x = 0; x <= w + 10; x += 10) {
    const u = x + off;
    const y = base - (Math.sin(u * 0.0075) * 26 + Math.sin(u * 0.0173 + 2) * 12 + 30);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, GROUND_Y);
  ctx.closePath();
  ctx.fill();
}

const CITY_PERIOD = 1100;
const rngCity = mulberry32(21);
interface Building { x: number; w: number; h: number; tone: number; roof: number }
const CITY: Building[] = [];
{
  let x = 0;
  while (x < CITY_PERIOD) {
    const w = 38 + rngCity() * 38;
    CITY.push({ x, w: Math.min(w, CITY_PERIOD - x), h: 46 + rngCity() * 128, tone: rngCity(), roof: Math.floor(rngCity() * 3) });
    x += w + rngCity() * 6;
  }
}

function lit(i: number, r: number, c: number) {
  const v = Math.sin(i * 91.7 + r * 12.9 + c * 78.2) * 43758.5453;
  return v - Math.floor(v);
}

export function drawCity(ctx: Ctx, w: number, scroll: number, n: number, time: number) {
  const off = scroll * 0.5;
  for (let rep = -1; rep <= Math.ceil(w / CITY_PERIOD) + 1; rep++) {
    for (let i = 0; i < CITY.length; i++) {
      const b = CITY[i];
      const x = b.x + rep * CITY_PERIOD - (off % CITY_PERIOD);
      if (x > w + 10 || x + b.w < -10) continue;
      const day = mix("#b4cdee", "#8fb0dc", b.tone);
      const night = mix("#1a2147", "#10153a", b.tone);
      ctx.fillStyle = mix3(day, mix(day, "#a77b8f", 0.6), night, n);
      const top = GROUND_Y - b.h;
      ctx.fillRect(x, top, b.w, b.h + 2);
      // Roof details.
      if (b.roof === 1) ctx.fillRect(x + b.w * 0.4, top - 14, 3, 14);
      else if (b.roof === 2) ctx.fillRect(x + 6, top - 7, b.w - 12, 7);
      // Windows: pale glass by day, warm light at night.
      const cols = Math.max(2, Math.floor((b.w - 8) / 11));
      const rows = Math.floor((b.h - 10) / 15);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const wx = x + 6 + c * 11;
          const wy = top + 8 + r * 15;
          const on = lit(i, r, c) > 0.5;
          if (n > 0.2 && on) {
            ctx.fillStyle = withAlpha("#ffd479", clamp((n - 0.2) * 1.5, 0, 0.9) * (0.75 + 0.25 * Math.sin(time * 0.7 + i + r)));
          } else {
            ctx.fillStyle = withAlpha("#ffffff", 0.22 * (1 - n * 0.8));
          }
          ctx.fillRect(wx, wy, 6, 8);
        }
      }
    }
  }
}

export function drawGround(ctx: Ctx, w: number, scroll: number, n: number) {
  const grass = mix3("#7bdc6a", "#8bb96a", "#1e6b4b", n);
  const dirtA = mix3("#e0b878", "#b28a6a", "#2d3563", n);
  const dirtB = mix3("#d1a566", "#a67d62", "#262d57", n);
  ctx.fillStyle = dirtA;
  ctx.fillRect(0, GROUND_Y, w, VIEW_H - GROUND_Y);
  // Diagonal stripes that scroll with the world.
  ctx.fillStyle = dirtB;
  const period = 34;
  const off = ((scroll % period) + period) % period;
  for (let x = -period * 2 - off; x < w + period; x += period) {
    ctx.beginPath();
    ctx.moveTo(x + 40, GROUND_Y + 16);
    ctx.lineTo(x + 40 + period / 2, GROUND_Y + 16);
    ctx.lineTo(x + period / 2, VIEW_H);
    ctx.lineTo(x, VIEW_H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = grass;
  ctx.fillRect(0, GROUND_Y, w, 16);
  ctx.fillStyle = shade(grass, 0.12);
  ctx.fillRect(0, GROUND_Y, w, 4);
  ctx.fillStyle = shade(grass, -0.2);
  ctx.fillRect(0, GROUND_Y + 14, w, 3);
  // Little tufts along the edge.
  ctx.fillStyle = shade(grass, -0.1);
  const tuft = 46;
  const to = ((scroll % tuft) + tuft) % tuft;
  for (let x = -tuft - to; x < w + tuft; x += tuft) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x + 5, GROUND_Y - 7);
    ctx.lineTo(x + 10, GROUND_Y);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- pillars

/** Each pillar gets its own hue, drifting around the colour wheel as the score climbs. */
export const pillarHue = (index: number) => (185 + index * 17) % 360;

export function drawPillar(ctx: Ctx, p: Pillar, camX: number, n: number) {
  const hue = pillarHue(p.index);
  const x0 = p.x - PILLAR_W / 2 - camX;
  const gapTop = p.gapY - p.gap / 2;
  const gapBottom = p.gapY + p.gap / 2;
  const capH = 28;
  const capX = x0 - 7;
  const capW = PILLAR_W + 14;

  // Glow first (additive), stronger at night.
  const glow = 0.10 + n * 0.16;
  ctx.globalCompositeOperation = "lighter";
  for (let i = 3; i >= 1; i--) {
    const e = i * 7;
    ctx.fillStyle = hsl(hue, 90, 55, glow / i);
    roundRect(ctx, x0 - e, -20, PILLAR_W + e * 2, gapTop + 20 + e, 14);
    ctx.fill();
    roundRect(ctx, x0 - e, gapBottom - e, PILLAR_W + e * 2, GROUND_Y - gapBottom + e + 4, 14);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  const body = ctx.createLinearGradient(x0, 0, x0 + PILLAR_W, 0);
  body.addColorStop(0, hsl(hue, 70, 24));
  body.addColorStop(0.22, hsl(hue, 80, 48));
  body.addColorStop(0.5, hsl(hue, 85, 62));
  body.addColorStop(0.8, hsl(hue, 80, 44));
  body.addColorStop(1, hsl(hue, 70, 22));
  const rim = hsl(hue, 90, 78, 0.9);

  const drawCap = (y: number) => {
    ctx.fillStyle = body;
    // The cap spans a different x range, so give it its own gradient.
    const cg = ctx.createLinearGradient(capX, 0, capX + capW, 0);
    cg.addColorStop(0, hsl(hue, 70, 26));
    cg.addColorStop(0.2, hsl(hue, 85, 52));
    cg.addColorStop(0.5, hsl(hue, 90, 68));
    cg.addColorStop(0.85, hsl(hue, 80, 44));
    cg.addColorStop(1, hsl(hue, 70, 24));
    ctx.fillStyle = cg;
    roundRect(ctx, capX, y, capW, capH, 8);
    ctx.fill();
    ctx.strokeStyle = rim;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(capX + 8, y + 5, capW - 16, 3);
  };

  const drawShaft = (y0: number, y1: number) => {
    ctx.fillStyle = body;
    ctx.fillRect(x0, y0, PILLAR_W, y1 - y0);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(x0 + 9, y0, 5, y1 - y0);
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    for (let y = y0 + 22 - ((y0 + 22) % 44); y < y1; y += 44) {
      if (y > y0) ctx.fillRect(x0, y, PILLAR_W, 3);
    }
    ctx.strokeStyle = rim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0, y1);
    ctx.moveTo(x0 + PILLAR_W, y0);
    ctx.lineTo(x0 + PILLAR_W, y1);
    ctx.stroke();
  };

  drawShaft(-20, gapTop - capH + 4);
  drawCap(gapTop - capH);
  drawShaft(gapBottom + capH - 4, GROUND_Y);
  drawCap(gapBottom);
}

// ---------------------------------------------------------------- the bird

export interface BirdPose {
  x: number;
  y: number;
  tilt: number;
  /** Wing angle in radians (negative = raised). */
  wing: number;
  /** 1 = normal, below 1 squashed. */
  squash: number;
  dead: boolean;
}

/** An original little bird: round and plump, coral with a cream belly, a teal crest and wing. */
export function drawBird(ctx: Ctx, b: BirdPose) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.tilt);
  ctx.scale(1 + (1 - b.squash) * 0.6, b.squash);
  const ink = "#1b2a49";
  ctx.lineJoin = "round";
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = ink;

  // Tail feathers.
  ctx.fillStyle = "#1fb5a8";
  for (const a of [-0.35, 0, 0.35]) {
    ctx.save();
    ctx.translate(-15, 3);
    ctx.rotate(Math.PI + a * 0.8);
    ctx.beginPath();
    ctx.ellipse(10, 0, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // Crest.
  ctx.fillStyle = "#1fb5a8";
  for (const [dx, dy, r] of [[-3, -17, -0.5], [2, -18, 0], [7, -16, 0.5]] as const) {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(r);
    ctx.beginPath();
    ctx.ellipse(0, -4, 3.2, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // Body.
  const g = ctx.createRadialGradient(-4, -6, 3, 0, 0, 22);
  g.addColorStop(0, "#ff9a6b");
  g.addColorStop(1, "#f2603f");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Belly.
  ctx.fillStyle = "#ffecd0";
  ctx.beginPath();
  ctx.ellipse(3, 7, 13, 8, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Beak.
  ctx.fillStyle = "#ffc43d";
  ctx.beginPath();
  ctx.moveTo(15, -3);
  ctx.quadraticCurveTo(28, 0, 16, 7);
  ctx.quadraticCurveTo(13, 2, 15, -3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Eye.
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(8, -6, 6.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ink;
  if (b.dead) {
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(5, -9);
    ctx.lineTo(11, -3);
    ctx.moveTo(11, -9);
    ctx.lineTo(5, -3);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(9.6, -5.8, 2.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(10.5, -6.8, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  // Wing: rotates about the shoulder.
  ctx.save();
  ctx.translate(-5, 1);
  ctx.rotate(b.wing);
  ctx.fillStyle = "#26c9bb";
  ctx.beginPath();
  ctx.moveTo(4, -1);
  ctx.bezierCurveTo(-4, -12, -22, -6, -24, 6);
  ctx.bezierCurveTo(-16, 10, -4, 10, 4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(27,42,73,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-4, 2);
  ctx.lineTo(-17, 4);
  ctx.moveTo(-3, -2);
  ctx.lineTo(-15, -1);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- medals

export const MEDAL_STYLE: Record<MedalName, { label: string; from: string; to: string; ring: string }> = {
  bronze: { label: "Bronze", from: "#f0b27a", to: "#9a5b2b", ring: "#6e3f1a" },
  silver: { label: "Silver", from: "#f3f4f6", to: "#9ca3af", ring: "#6b7280" },
  gold: { label: "Gold", from: "#fff08a", to: "#d49a06", ring: "#9a6b00" },
  platinum: { label: "Platinum", from: "#f5fdff", to: "#7dd3fc", ring: "#0e7ab8" },
};
