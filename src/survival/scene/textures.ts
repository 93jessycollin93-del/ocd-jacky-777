// Pixel-art block textures drawn at runtime (no image files), shared by the world and the held item.
import * as THREE from "three";
import { mulberry32 } from "../engine/noise";
import type { BlockId } from "../engine/blocks";

export type Face = "top" | "side" | "bottom";
type RGB = [number, number, number];

/** 16×16 (doors 16×32) pixel-art texture, drawn once per block type and face. */
export function pixelTexture(kind: BlockId, face: Face = "side"): THREE.Texture {
  const w = 16;
  const h = kind === "door" ? 32 : 16;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const rng = mulberry32(kind.length * 977 + kind.charCodeAt(0) + face.length * 31);
  const px = (x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };
  const shade = (base: RGB, amt: number, alpha = 1) =>
    `rgba(${base.map((v) => Math.max(0, Math.min(255, Math.round(v + amt)))).join(",")},${alpha})`;
  const noiseFill = (base: RGB, spread: number) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(x, y, shade(base, (rng() - 0.5) * spread));
  };
  const GRASS: RGB = [92, 150, 60];
  const DIRT: RGB = [134, 96, 67];

  if (kind === "plank") {
    const base: RGB = [168, 120, 66];
    for (let y = 0; y < h; y++) {
      const row = Math.floor(y / 4);
      for (let x = 0; x < w; x++) {
        const seam = (x + row * 5) % 16 === 0;
        const edge = y % 4 === 3;
        px(x, y, edge || seam ? shade(base, -45) : shade(base, (rng() - 0.5) * 22 + (x % 7 === 0 ? -10 : 0)));
      }
    }
  } else if (kind === "cobblestone") {
    const base: RGB = [128, 128, 128];
    noiseFill([73, 73, 73], 0);
    for (let i = 0; i < 14; i++) {
      const cx = Math.floor(rng() * w);
      const cy = Math.floor(rng() * h);
      const r = 2 + Math.floor(rng() * 2);
      const tone = (rng() - 0.5) * 40;
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          if (x * x + y * y > r * r) continue;
          px((cx + x + w) % w, (cy + y + h) % h, shade(base, tone + (rng() - 0.5) * 14 + (y < 0 ? 10 : -6)));
        }
      }
    }
  } else if (kind === "thatch_block") {
    const base: RGB = [214, 180, 82];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) px(x, y, shade(base, (x + Math.floor(y / 3)) % 3 === 0 ? -40 : (rng() - 0.5) * 30));
    }
  } else if (kind === "metal_block") {
    const base: RGB = [176, 182, 190];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const rim = x === 0 || y === 0 || x === w - 1 || y === h - 1;
        const rivet = (x === 2 || x === w - 3) && (y === 2 || y === h - 3);
        px(x, y, rivet ? shade(base, -70) : rim ? shade(base, -40) : shade(base, ((x + y) % 9 === 0 ? 18 : 0) + (rng() - 0.5) * 10));
      }
    }
  } else if (kind === "dirt") {
    if (face === "top") noiseFill(GRASS, 34);
    else {
      noiseFill(DIRT, 30);
      if (face === "side") {
        // Grass hanging over the top edge, like a fresh-cut turf block.
        for (let x = 0; x < w; x++) {
          const depth = 2 + Math.floor(rng() * 3);
          for (let y = 0; y < depth; y++) px(x, y, shade(GRASS, (rng() - 0.5) * 30));
        }
      }
    }
  } else if (kind === "sand") {
    noiseFill([219, 207, 158], 22);
  } else if (kind === "glass") {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const rim = x === 0 || y === 0 || x === w - 1 || y === h - 1;
        const glint = (x - y === 3 || x - y === 4) && x > 3 && x < 9;
        px(x, y, rim ? "rgba(225,240,250,0.95)" : glint ? "rgba(255,255,255,0.7)" : "rgba(200,225,240,0.12)");
      }
    }
  } else if (kind === "stone_brick") {
    const base: RGB = [140, 140, 140];
    for (let y = 0; y < h; y++) {
      const row = Math.floor(y / 4);
      for (let x = 0; x < w; x++) {
        const mortar = y % 4 === 3 || (x + (row % 2) * 8) % 8 === 7;
        px(x, y, mortar ? shade(base, -50) : shade(base, (rng() - 0.5) * 18 + (y % 4 === 0 ? 12 : 0)));
      }
    }
  } else if (kind === "log") {
    if (face === "side") {
      const bark: RGB = [104, 78, 46];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(x, y, shade(bark, (x % 4 === 1 ? -28 : 0) + (rng() - 0.5) * 18));
    } else {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const r = Math.hypot(x - 7.5, y - 7.5);
          px(x, y, r > 7 ? shade([104, 78, 46], -10) : shade([190, 150, 96], Math.floor(r) % 3 === 0 ? -30 : (rng() - 0.5) * 10));
        }
      }
    }
  } else if (kind === "door") {
    const base: RGB = [150, 104, 58];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const frame = x < 2 || x > 13 || y < 2 || y > 29 || y === 15 || y === 16;
        const pane = y >= 4 && y <= 12 && x >= 4 && x <= 11 && x !== 7 && x !== 8 && y !== 8;
        px(x, y, pane ? "rgba(170,205,225,1)" : shade(base, frame ? -35 : (x % 4 === 0 ? -15 : 0) + (rng() - 0.5) * 16));
      }
    }
    px(12, 19, "#3a3a3a");
    px(12, 20, "#3a3a3a");
  } else {
    // torch: transparent, stick + flame
    for (let y = 6; y < h; y++) for (let x = 7; x < 9; x++) px(x, y, y % 3 ? "#7a5230" : "#5c3b1e");
    for (const [x, y, c] of [[7, 4, "#ffd166"], [8, 4, "#ffd166"], [7, 5, "#ff9f1c"], [8, 5, "#ff9f1c"], [7, 3, "#fff3b0"]] as const) px(x, y, c);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const heldMaterials = new Map<BlockId, THREE.Material>();

/** Material for a block shown in your hand: drawn on top of the world so it never clips into walls. */
export function heldBlockMaterial(kind: BlockId): THREE.Material {
  let m = heldMaterials.get(kind);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      map: pixelTexture(kind, "side"),
      roughness: 1,
      transparent: kind === "glass" || kind === "torch",
      depthTest: false,
    });
    heldMaterials.set(kind, m);
  }
  return m;
}
