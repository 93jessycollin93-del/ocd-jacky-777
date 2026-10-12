// Fruit Slash's fruit, bombs and power fruit, all drawn in code with gradients and highlights. Each is
// painted once into a sprite sheet (diameter 1 = the fruit's width) and stamped every frame.
type Ctx = CanvasRenderingContext2D;

export interface Look {
  /** Colour of the flesh along a cut. */
  inner: string;
  /** Colour of the splat left on the backdrop. */
  juice: string;
}

export const LOOKS: Record<string, Look> = {
  apple: { inner: "#fef3c7", juice: "#f87171" },
  orange: { inner: "#fdba74", juice: "#fb923c" },
  watermelon: { inner: "#f43f5e", juice: "#fb7185" },
  banana: { inner: "#fef9c3", juice: "#fde047" },
  pineapple: { inner: "#fde047", juice: "#facc15" },
  kiwi: { inner: "#84cc16", juice: "#a3e635" },
  strawberry: { inner: "#fb7185", juice: "#f43f5e" },
  lemon: { inner: "#fef08a", juice: "#fde047" },
  coconut: { inner: "#fff7ed", juice: "#f5f5f4" },
  grapes: { inner: "#c084fc", juice: "#a855f7" },
  bomb: { inner: "#fbbf24", juice: "#fbbf24" },
  freeze: { inner: "#e0f2fe", juice: "#7dd3fc" },
  frenzy: { inner: "#fde047", juice: "#fb923c" },
  double: { inner: "#fef9c3", juice: "#facc15" },
};

export const SPRITE_KEYS = Object.keys(LOOKS);

const R = 0.46;

function ball(ctx: Ctx, rx: number, ry: number, light: string, mid: string, dark: string, cx = 0, cy = 0) {
  const g = ctx.createRadialGradient(cx - rx * 0.35, cy - ry * 0.4, rx * 0.08, cx, cy, Math.max(rx, ry) * 1.1);
  g.addColorStop(0, light);
  g.addColorStop(0.45, mid);
  g.addColorStop(1, dark);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
}

function shine(ctx: Ctx, x = -0.17, y = -0.2, s = 1) {
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.ellipse(x, y, 0.1 * s, 0.055 * s, -0.7, 0, Math.PI * 2);
  ctx.fill();
}

function leaf(ctx: Ctx, x: number, y: number, rot: number, len = 0.2, color = "#22c55e") {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.45, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.4, 0, 0);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,60,0,0.35)";
  ctx.lineWidth = 0.012;
  ctx.stroke();
  ctx.restore();
}

function outlineRing(ctx: Ctx, rx: number, ry: number, color = "rgba(0,0,0,0.25)") {
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.025;
  ctx.stroke();
}

const painters: Record<string, (ctx: Ctx) => void> = {
  apple(ctx) {
    ball(ctx, R, R * 0.94, "#fecaca", "#ef4444", "#7f1d1d");
    ctx.fillStyle = "rgba(90,0,0,0.5)";
    ctx.beginPath();
    ctx.ellipse(0, -R * 0.82, 0.07, 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 0.045;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.78);
    ctx.quadraticCurveTo(0.03, -R * 1.02, 0.09, -R * 1.1);
    ctx.stroke();
    leaf(ctx, 0.03, -R * 0.95, -0.5, 0.2);
    outlineRing(ctx, R, R * 0.94);
    shine(ctx);
  },
  orange(ctx) {
    ball(ctx, R, R, "#fed7aa", "#fb923c", "#9a3412");
    ctx.fillStyle = "rgba(124,45,18,0.28)";
    for (let i = 0; i < 26; i++) {
      const a = i * 2.4;
      const d = ((i * 53) % 100) / 100;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * R * 0.85 * d, Math.sin(a) * R * 0.85 * d, 0.012, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#65a30d";
    ctx.beginPath();
    ctx.arc(0.02, -R * 0.78, 0.035, 0, Math.PI * 2);
    ctx.fill();
    leaf(ctx, 0.03, -R * 0.82, -0.2, 0.17);
    outlineRing(ctx, R, R);
    shine(ctx);
  },
  watermelon(ctx) {
    ball(ctx, R, R * 0.96, "#86efac", "#16a34a", "#14532d");
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, R, R * 0.96, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = "rgba(6,78,59,0.65)";
    ctx.lineWidth = 0.055;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 0.15, -R);
      ctx.bezierCurveTo(i * 0.28, -0.2, i * 0.28, 0.2, i * 0.15, R);
      ctx.stroke();
    }
    ctx.restore();
    outlineRing(ctx, R, R * 0.96);
    shine(ctx);
  },
  banana(ctx) {
    ctx.save();
    ctx.rotate(-0.5);
    const g = ctx.createLinearGradient(0, -R, 0, R);
    g.addColorStop(0, "#fef08a");
    g.addColorStop(0.5, "#facc15");
    g.addColorStop(1, "#a16207");
    ctx.beginPath();
    ctx.moveTo(-0.46, -0.06);
    ctx.quadraticCurveTo(-0.3, 0.46, 0.2, 0.42);
    ctx.quadraticCurveTo(0.42, 0.38, 0.5, 0.12);
    ctx.quadraticCurveTo(0.4, 0.27, 0.18, 0.28);
    ctx.quadraticCurveTo(-0.22, 0.28, -0.46, -0.06);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 0.03;
    ctx.strokeStyle = "#854d0e";
    ctx.stroke();
    ctx.fillStyle = "#713f12";
    ctx.beginPath();
    ctx.arc(-0.46, -0.06, 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0.5, 0.12, 0.035, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 0.035;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-0.3, 0.08);
    ctx.quadraticCurveTo(-0.1, 0.34, 0.18, 0.34);
    ctx.stroke();
    ctx.restore();
  },
  pineapple(ctx) {
    // Crown first, behind the body.
    ctx.fillStyle = "#16a34a";
    for (let i = -3; i <= 3; i++) {
      ctx.save();
      ctx.translate(i * 0.04, -0.34);
      ctx.rotate(i * 0.22);
      ctx.beginPath();
      ctx.moveTo(-0.045, 0);
      ctx.lineTo(0, -0.24 - (3 - Math.abs(i)) * 0.03);
      ctx.lineTo(0.045, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ball(ctx, R * 0.78, R, "#fde68a", "#f59e0b", "#92400e", 0, 0.06);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0.06, R * 0.78, R, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = "rgba(120,53,15,0.55)";
    ctx.lineWidth = 0.022;
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(-0.5, i * 0.12 - 0.3);
      ctx.lineTo(0.5, i * 0.12 + 0.3);
      ctx.moveTo(-0.5, i * 0.12 + 0.3);
      ctx.lineTo(0.5, i * 0.12 - 0.3);
      ctx.stroke();
    }
    ctx.restore();
    shine(ctx, -0.14, -0.18, 0.9);
  },
  kiwi(ctx) {
    ball(ctx, R, R * 0.9, "#d6b88a", "#92643a", "#4a2f17");
    ctx.fillStyle = "rgba(60,36,16,0.45)";
    for (let i = 0; i < 40; i++) {
      const a = i * 2.39;
      const d = ((i * 37) % 100) / 100;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * R * 0.88 * d, Math.sin(a) * R * 0.78 * d, 0.014, 0, Math.PI * 2);
      ctx.fill();
    }
    outlineRing(ctx, R, R * 0.9, "rgba(50,30,10,0.4)");
    shine(ctx);
  },
  strawberry(ctx) {
    const g = ctx.createRadialGradient(-0.12, -0.12, 0.03, 0, 0.02, 0.55);
    g.addColorStop(0, "#fecdd3");
    g.addColorStop(0.4, "#f43f5e");
    g.addColorStop(1, "#9f1239");
    ctx.beginPath();
    ctx.moveTo(0, 0.5);
    ctx.bezierCurveTo(-0.52, 0.2, -0.5, -0.32, -0.22, -0.34);
    ctx.quadraticCurveTo(0, -0.28, 0.22, -0.34);
    ctx.bezierCurveTo(0.5, -0.32, 0.52, 0.2, 0, 0.5);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 0.025;
    ctx.strokeStyle = "rgba(80,0,20,0.4)";
    ctx.stroke();
    ctx.fillStyle = "#fde68a";
    for (let i = 0; i < 14; i++) {
      const a = i * 2.2;
      const d = 0.15 + ((i * 29) % 100) / 100 * 0.22;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * d * 1.1, 0.05 + Math.sin(a) * d * 1.1, 0.012, 0.02, a, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = -2; i <= 2; i++) leaf(ctx, 0, -0.33, -Math.PI / 2 + i * 0.5, 0.2, "#22c55e");
    shine(ctx, -0.2, -0.12, 0.9);
  },
  lemon(ctx) {
    ctx.save();
    ctx.rotate(-0.45);
    ball(ctx, R * 0.98, R * 0.7, "#fef9c3", "#facc15", "#a16207");
    ctx.fillStyle = "#eab308";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * R * 1.0, 0, 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(161,98,7,0.25)";
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.arc(Math.cos(i * 2.1) * 0.3, Math.sin(i * 1.7) * 0.2, 0.012, 0, Math.PI * 2);
      ctx.fill();
    }
    outlineRing(ctx, R * 0.98, R * 0.7);
    shine(ctx, -0.18, -0.17);
    ctx.restore();
  },
  coconut(ctx) {
    ball(ctx, R, R, "#a8825a", "#6b4423", "#2e1c0d");
    ctx.strokeStyle = "rgba(30,15,5,0.4)";
    ctx.lineWidth = 0.012;
    for (let i = 0; i < 26; i++) {
      const a = i * 0.6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 0.1, Math.sin(a) * 0.1);
      ctx.lineTo(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95);
      ctx.stroke();
    }
    ctx.fillStyle = "#1c1009";
    for (const [x, y] of [[-0.09, -0.02], [0.09, -0.02], [0, 0.11]]) {
      ctx.beginPath();
      ctx.arc(x, y, 0.055, 0, Math.PI * 2);
      ctx.fill();
    }
    outlineRing(ctx, R, R);
    shine(ctx, -0.2, -0.24);
  },
  grapes(ctx) {
    ctx.strokeStyle = "#65a30d";
    ctx.lineWidth = 0.04;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -0.3);
    ctx.lineTo(0.03, -0.5);
    ctx.stroke();
    leaf(ctx, 0.03, -0.46, -0.3, 0.22);
    const pts: [number, number][] = [[-0.2, -0.2], [0, -0.22], [0.2, -0.2], [-0.1, -0.02], [0.1, -0.02], [-0.22, 0.04], [0.22, 0.04], [0, 0.17], [-0.12, 0.2], [0.12, 0.2], [0, 0.38]];
    for (const [x, y] of pts) {
      ball(ctx, 0.15, 0.15, "#e9d5ff", "#9333ea", "#4c1d95", x, y);
      ctx.strokeStyle = "rgba(40,0,80,0.35)";
      ctx.lineWidth = 0.012;
      ctx.beginPath();
      ctx.arc(x, y, 0.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(x - 0.05, y - 0.05, 0.03, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  bomb(ctx) {
    ball(ctx, R, R, "#6b7280", "#1f2937", "#030712");
    ctx.fillStyle = "#374151";
    ctx.fillRect(-0.1, -R - 0.02, 0.2, 0.12);
    ctx.strokeStyle = "#a16207";
    ctx.lineWidth = 0.035;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -R);
    ctx.quadraticCurveTo(0.12, -R - 0.12, 0.2, -R - 0.1);
    ctx.stroke();
    // A red warning mark so it never looks like a fruit.
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(0, 0.04, 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(-0.07, -0.03);
    ctx.lineTo(0.07, 0.11);
    ctx.moveTo(0.07, -0.03);
    ctx.lineTo(-0.07, 0.11);
    ctx.stroke();
    shine(ctx, -0.2, -0.22);
  },
  freeze(ctx) {
    ball(ctx, R, R, "#f0f9ff", "#7dd3fc", "#0369a1");
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 0.035;
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 0.3, Math.sin(a) * 0.3);
      ctx.lineTo(-Math.cos(a) * 0.3, -Math.sin(a) * 0.3);
      ctx.stroke();
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 0.2 * s - Math.sin(a) * 0.07, Math.sin(a) * 0.2 * s + Math.cos(a) * 0.07);
        ctx.lineTo(Math.cos(a) * 0.3 * s, Math.sin(a) * 0.3 * s);
        ctx.lineTo(Math.cos(a) * 0.2 * s + Math.sin(a) * 0.07, Math.sin(a) * 0.2 * s - Math.cos(a) * 0.07);
        ctx.stroke();
      }
    }
    outlineRing(ctx, R, R, "rgba(255,255,255,0.8)");
    shine(ctx);
  },
  frenzy(ctx) {
    ball(ctx, R, R, "#fef08a", "#f97316", "#7c2d12");
    ctx.beginPath();
    ctx.moveTo(0, -0.34);
    ctx.bezierCurveTo(0.22, -0.12, 0.3, 0.06, 0.18, 0.24);
    ctx.bezierCurveTo(0.1, 0.34, -0.1, 0.34, -0.18, 0.24);
    ctx.bezierCurveTo(-0.3, 0.06, -0.12, -0.1, 0, -0.34);
    ctx.fillStyle = "#fff7ed";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -0.1);
    ctx.bezierCurveTo(0.1, 0.02, 0.12, 0.1, 0.06, 0.18);
    ctx.bezierCurveTo(0.02, 0.24, -0.06, 0.24, -0.08, 0.18);
    ctx.bezierCurveTo(-0.12, 0.08, -0.04, 0, 0, -0.1);
    ctx.fillStyle = "#facc15";
    ctx.fill();
    outlineRing(ctx, R, R, "rgba(255,237,213,0.9)");
    shine(ctx);
  },
  double(ctx) {
    ball(ctx, R, R, "#fffbeb", "#fbbf24", "#92400e");
    ctx.fillStyle = "#7c2d12";
    ctx.font = "900 0.42px Arial Black, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("x2", 0, 0.03);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    outlineRing(ctx, R, R, "rgba(120,53,15,0.6)");
    shine(ctx);
  },
};

/** One sprite sheet with a square slot per kind, painted at the size it will be shown. */
export class FruitAtlas {
  px = 0;
  sheet: HTMLCanvasElement | null = null;
  slot = 0;
  readonly span = 1.7;
  private index = new Map<string, number>();

  setSize(diameterPx: number) {
    const q = Math.max(24, Math.round(diameterPx / 4) * 4);
    if (q === this.px && this.sheet) return;
    this.px = q;
    this.slot = Math.ceil(q * this.span);
    const cols = 7;
    const rows = Math.ceil(SPRITE_KEYS.length / cols);
    const cv = this.sheet ?? document.createElement("canvas");
    cv.width = this.slot * cols;
    cv.height = this.slot * rows;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, cv.width, cv.height);
    SPRITE_KEYS.forEach((key, i) => {
      this.index.set(key, i);
      ctx.save();
      ctx.translate((i % cols) * this.slot + this.slot / 2, Math.floor(i / cols) * this.slot + this.slot / 2);
      ctx.scale(q, q);
      painters[key](ctx);
      ctx.restore();
    });
    this.sheet = cv;
  }

  /** Draw sprite `key` centred at (x, y); r is the fruit's radius in canvas units. */
  stamp(ctx: Ctx, key: string, x: number, y: number, r: number, rot = 0, scale = 1) {
    if (!this.sheet) return;
    const i = this.index.get(key) ?? 0;
    const cols = 7;
    const s = r * 2 * this.span * scale;
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.drawImage(this.sheet, (i % cols) * this.slot, Math.floor(i / cols) * this.slot, this.slot, this.slot, -s / 2, -s / 2, s, s);
    ctx.restore();
  }
}
