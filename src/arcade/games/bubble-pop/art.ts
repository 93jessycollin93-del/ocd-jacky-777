// Bubble Pop's bubbles, drawn in code. Each colour also carries a small symbol so the board still reads
// for colour-blind players. All six are painted once into a sprite sheet and stamped every frame.
type Ctx = CanvasRenderingContext2D;

export const BUBBLE_COLORS = [
  { name: "red", base: "#ef4444", light: "#fecaca", dark: "#991b1b" },
  { name: "orange", base: "#fb923c", light: "#fed7aa", dark: "#9a3412" },
  { name: "yellow", base: "#facc15", light: "#fef9c3", dark: "#a16207" },
  { name: "green", base: "#4ade80", light: "#dcfce7", dark: "#15803d" },
  { name: "blue", base: "#38bdf8", light: "#e0f2fe", dark: "#0369a1" },
  { name: "purple", base: "#c084fc", light: "#f3e8ff", dark: "#6b21a8" },
];

function symbol(ctx: Ctx, color: number) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 0.07;
  ctx.lineJoin = "round";
  ctx.beginPath();
  switch (color) {
    case 0: ctx.arc(0, 0.04, 0.1, 0, Math.PI * 2); ctx.fill(); break;
    case 1:
      ctx.moveTo(0, -0.11);
      ctx.lineTo(0.12, 0.11);
      ctx.lineTo(-0.12, 0.11);
      ctx.closePath();
      ctx.fill();
      break;
    case 2:
      ctx.moveTo(0, -0.14);
      ctx.lineTo(0.11, 0.02);
      ctx.lineTo(0, 0.18);
      ctx.lineTo(-0.11, 0.02);
      ctx.closePath();
      ctx.fill();
      break;
    case 3:
      ctx.moveTo(-0.12, 0.03);
      ctx.lineTo(0.12, 0.03);
      ctx.moveTo(0, -0.09);
      ctx.lineTo(0, 0.15);
      ctx.stroke();
      break;
    case 4: ctx.arc(0, 0.03, 0.1, 0, Math.PI * 2); ctx.stroke(); break;
    default: ctx.rect(-0.09, -0.06, 0.18, 0.18); ctx.fill();
  }
  ctx.restore();
}

function drawBubble(ctx: Ctx, color: number) {
  const pal = BUBBLE_COLORS[color % BUBBLE_COLORS.length];
  const r = 0.475;
  // Shadow
  ctx.beginPath();
  ctx.arc(0, 0.03, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fill();
  const g = ctx.createRadialGradient(-0.16, -0.2, 0.03, 0, 0, r * 1.05);
  g.addColorStop(0, pal.light);
  g.addColorStop(0.3, pal.base);
  g.addColorStop(1, pal.dark);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 0.04;
  ctx.strokeStyle = pal.dark;
  ctx.stroke();
  symbol(ctx, color);
  // Gloss
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(-0.17, -0.22, 0.12, 0.07, -0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, 0.4, 1.2);
  ctx.stroke();
}

export class BubbleAtlas {
  px = 0;
  sheet: HTMLCanvasElement | null = null;
  slot = 0;
  readonly span = 1.3;

  /** Set the on-screen size of one bubble in device pixels; repaints the sheet if it changed. */
  setSize(bubblePx: number) {
    const q = Math.max(12, Math.round(bubblePx / 4) * 4);
    if (q === this.px && this.sheet) return;
    this.px = q;
    this.slot = Math.ceil(q * this.span);
    const cv = this.sheet ?? document.createElement("canvas");
    cv.width = this.slot * 6;
    cv.height = this.slot;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.translate(i * this.slot + this.slot / 2, this.slot / 2);
      ctx.scale(q, q);
      drawBubble(ctx, i);
      ctx.restore();
    }
    this.sheet = cv;
  }

  /** Stamp bubble `color` centred on (x, y) with diameter d (logical units). */
  stamp(ctx: Ctx, color: number, x: number, y: number, d: number, scale = 1) {
    if (!this.sheet || scale <= 0) return;
    const s = d * this.span * scale;
    ctx.drawImage(this.sheet, color * this.slot, 0, this.slot, this.slot, x - s / 2, y - s / 2, s, s);
  }
}
