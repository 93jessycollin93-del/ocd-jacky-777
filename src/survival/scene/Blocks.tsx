// Rendering for Minecraft-style blocks: pixel-art textures drawn at runtime, one instanced mesh per
// block type, glowing torches, and the outline/preview of what you're aiming at.
import { useMemo, useRef, useState, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "../engine/noise";
import { BLOCKS, cellKey, isBlockItem, isDoor, parseKey, solidAt, type BlockId } from "../engine/blocks";
import { blockTarget, equipped, type GameState } from "../engine/game";

type GameRef = MutableRefObject<GameState>;

/** Full-cube blocks drawn as instanced boxes. Torches and doors have their own shapes. */
const CUBE_BLOCKS = (Object.keys(BLOCKS) as BlockId[]).filter((b) => BLOCKS[b].solid && b !== "door");

type Face = "top" | "side" | "bottom";
type RGB = [number, number, number];

/** 16×16 (doors 16×32) pixel-art texture, drawn once per block type and face. */
function pixelTexture(kind: BlockId, face: Face = "side"): THREE.Texture {
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

/** Materials in BoxGeometry face order: +x, -x, +y (top), -y (bottom), +z, -z. */
function blockMaterials(kind: BlockId): THREE.Material | THREE.Material[] {
  const make = (face: Face) =>
    new THREE.MeshStandardMaterial({
      map: pixelTexture(kind, face),
      roughness: kind === "glass" || kind === "metal_block" ? 0.35 : 1,
      transparent: kind === "glass",
      depthWrite: kind !== "glass",
    });
  if (kind !== "dirt" && kind !== "log") return make("side");
  const side = make("side");
  return [side, side, make("top"), make("bottom"), side, side];
}

const BOX = new THREE.BoxGeometry(1, 1, 1);

function CubeBlocks({ game, kind }: { game: GameRef; kind: BlockId }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(() => blockMaterials(kind), [kind]);
  const [capacity, setCapacity] = useState(64);
  const version = useRef(-1);

  useFrame(() => {
    const g = game.current;
    if (version.current === g.blockVersion || !mesh.current) return;
    const cells = Object.entries(g.blocks).filter(([, b]) => b === kind);
    if (cells.length > capacity) {
      setCapacity(2 ** Math.ceil(Math.log2(cells.length))); // remounts with room to spare
      return;
    }
    version.current = g.blockVersion;
    const m = new THREE.Matrix4();
    cells.forEach(([key], i) => {
      const [x, y, z] = parseKey(key);
      mesh.current!.setMatrixAt(i, m.makeTranslation(x + 0.5, y + 0.5, z + 0.5));
    });
    mesh.current.count = cells.length;
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      key={capacity}
      ref={mesh}
      args={[BOX, material, capacity]}
      castShadow={kind !== "glass"}
      receiveShadow
      frustumCulled={false}
    />
  );
}

interface DoorView {
  key: string;
  x: number;
  y: number;
  z: number;
  open: boolean;
  /** The door spans the x axis (its wall runs east-west). */
  alongX: boolean;
}

/** Two-high doors that line up with the wall they're set into, and swing on a hinge when opened. */
function Doors({ game }: { game: GameRef }) {
  const [doors, setDoors] = useState<DoorView[]>([]);
  const version = useRef(-1);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ map: pixelTexture("door"), roughness: 1 }), []);

  useFrame(() => {
    const g = game.current;
    if (version.current === g.blockVersion) return;
    version.current = g.blockVersion;
    const views: DoorView[] = [];
    for (const [key, b] of Object.entries(g.blocks)) {
      if (!isDoor(b)) continue;
      const [x, y, z] = parseKey(key);
      if (isDoor(g.blocks[cellKey(x, y - 1, z)])) continue; // draw each door once, from its bottom half
      const wallX = solidAt(g.blocks, x - 0.5, y + 0.5, z + 0.5) || solidAt(g.blocks, x + 1.5, y + 0.5, z + 0.5);
      const wallZ = solidAt(g.blocks, x + 0.5, y + 0.5, z - 0.5) || solidAt(g.blocks, x + 0.5, y + 0.5, z + 1.5);
      views.push({ key, x, y, z, open: b === "door_open", alongX: wallX || !wallZ });
    }
    setDoors(views);
  });

  return (
    <>
      {doors.map((d) => (
        <group
          key={d.key}
          position={d.alongX ? [d.x, d.y, d.z + 0.5] : [d.x + 0.5, d.y, d.z]}
          rotation-y={(d.alongX ? 0 : -Math.PI / 2) + (d.open ? -Math.PI / 2 : 0)}
        >
          <mesh position={[0.5, 1, 0]} material={material} castShadow receiveShadow>
            <boxGeometry args={[1, 2, 0.12]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

const MAX_TORCH_LIGHTS = 4;

function Torches({ game }: { game: GameRef }) {
  const [torches, setTorches] = useState<[number, number, number][]>([]);
  // A fixed pool of lights that move to the nearest torches. Changing the number of lights in a scene
  // makes three.js recompile every shader, which would hitch each time a torch is placed.
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const version = useRef(-1);
  const tick = useRef(1);

  useFrame((_, dt) => {
    const g = game.current;
    if (version.current !== g.blockVersion) {
      version.current = g.blockVersion;
      setTorches(Object.entries(g.blocks).filter(([, b]) => b === "torch").map(([k]) => parseKey(k)));
      tick.current = 1;
    }
    tick.current += dt;
    if (tick.current < 0.4) return;
    tick.current = 0;
    const p = g.player;
    const nearest = [...torches]
      .sort((a, b) => Math.hypot(a[0] - p.x, a[2] - p.z) - Math.hypot(b[0] - p.x, b[2] - p.z))
      .slice(0, MAX_TORCH_LIGHTS);
    lights.current.forEach((light, i) => {
      if (!light) return;
      const t = nearest[i];
      light.intensity = t ? 8 : 0;
      if (t) light.position.set(t[0] + 0.5, t[1] + 0.9, t[2] + 0.5);
    });
  });

  return (
    <>
      {torches.map(([x, y, z]) => (
        <group key={`${x},${y},${z}`} position={[x + 0.5, y, z + 0.5]}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.1, 0.6, 0.1]} />
            <meshStandardMaterial color="#6b4423" />
          </mesh>
          <mesh position={[0, 0.66, 0]}>
            <boxGeometry args={[0.14, 0.14, 0.14]} />
            <meshStandardMaterial color="#ffb347" emissive="#ff8c1a" emissiveIntensity={3} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: MAX_TORCH_LIGHTS }, (_, i) => (
        <pointLight
          key={i}
          ref={(el) => (lights.current[i] = el)}
          color="#ffb060"
          intensity={0}
          distance={12}
          decay={2}
        />
      ))}
    </>
  );
}

/** Outline on the block you're aiming at, and a see-through preview where a held block would go. */
function BlockCursor({ game }: { game: GameRef }) {
  const outline = useRef<THREE.LineSegments>(null);
  const ghost = useRef<THREE.Mesh>(null);
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)), []);

  useFrame(() => {
    const g = game.current;
    const o = outline.current;
    const gh = ghost.current;
    if (!o || !gh) return;
    const holding = isBlockItem(equipped(g));
    const hit = g.player.dead ? null : blockTarget(g);
    o.visible = !!hit?.block;
    if (hit?.block) o.position.set(hit.cell[0] + 0.5, hit.cell[1] + 0.5, hit.cell[2] + 0.5);
    gh.visible = holding && !!hit;
    if (hit && holding) gh.position.set(hit.place[0] + 0.5, hit.place[1] + 0.5, hit.place[2] + 0.5);
  });

  return (
    <>
      <lineSegments ref={outline} geometry={edges} visible={false}>
        <lineBasicMaterial color="#111" />
      </lineSegments>
      <mesh ref={ghost} visible={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </>
  );
}

export default function Blocks({ game }: { game: GameRef }) {
  return (
    <>
      {CUBE_BLOCKS.map((kind) => (
        <CubeBlocks key={kind} game={game} kind={kind} />
      ))}
      <Doors game={game} />
      <Torches game={game} />
      <BlockCursor game={game} />
    </>
  );
}
