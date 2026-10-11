// Rendering for Minecraft-style blocks: pixel-art textures drawn at runtime, one instanced mesh per
// block type, glowing torches, and the outline/preview of what you're aiming at.
import { useMemo, useRef, useState, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "../engine/noise";
import { BLOCKS, parseKey, isBlockItem, type BlockId } from "../engine/blocks";
import { blockTarget, equipped, type GameState } from "../engine/game";

type GameRef = MutableRefObject<GameState>;

const SOLID_BLOCKS = (Object.keys(BLOCKS) as BlockId[]).filter((b) => BLOCKS[b].solid);

/** 16×16 pixel-art texture, drawn once per block type. */
function pixelTexture(kind: BlockId): THREE.Texture {
  const size = 16;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rng = mulberry32(kind.length * 977 + kind.charCodeAt(0));
  const px = (x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };
  const shade = (base: [number, number, number], amt: number) =>
    `rgb(${base.map((v) => Math.max(0, Math.min(255, Math.round(v + amt)))).join(",")})`;

  if (kind === "plank") {
    const base: [number, number, number] = [168, 120, 66];
    for (let y = 0; y < size; y++) {
      const row = Math.floor(y / 4);
      for (let x = 0; x < size; x++) {
        const seam = (x + row * 5) % 16 === 0;
        const edge = y % 4 === 3;
        px(x, y, edge || seam ? shade(base, -45) : shade(base, (rng() - 0.5) * 22 + (x % 7 === 0 ? -10 : 0)));
      }
    }
  } else if (kind === "cobblestone") {
    const base: [number, number, number] = [128, 128, 128];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) px(x, y, shade(base, -55));
    for (let i = 0; i < 14; i++) {
      const cx = Math.floor(rng() * size);
      const cy = Math.floor(rng() * size);
      const r = 2 + Math.floor(rng() * 2);
      const tone = (rng() - 0.5) * 40;
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          if (x * x + y * y > r * r) continue;
          px((cx + x + size) % size, (cy + y + size) % size, shade(base, tone + (rng() - 0.5) * 14 + (y < 0 ? 10 : -6)));
        }
      }
    }
  } else if (kind === "thatch_block") {
    const base: [number, number, number] = [214, 180, 82];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const strand = (x + Math.floor(y / 3)) % 3 === 0;
        px(x, y, shade(base, strand ? -40 : (rng() - 0.5) * 30));
      }
    }
  } else {
    // torch: transparent, stick + flame
    ctx.clearRect(0, 0, size, size);
    for (let y = 6; y < size; y++) for (let x = 7; x < 9; x++) px(x, y, y % 3 ? "#7a5230" : "#5c3b1e");
    for (const [x, y, c] of [[7, 4, "#ffd166"], [8, 4, "#ffd166"], [7, 5, "#ff9f1c"], [8, 5, "#ff9f1c"], [7, 3, "#fff3b0"]] as const) px(x, y, c);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const BOX = new THREE.BoxGeometry(1, 1, 1);

function SolidBlocks({ game, kind }: { game: GameRef; kind: BlockId }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ map: pixelTexture(kind), roughness: 1 }), [kind]);
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
    <instancedMesh key={capacity} ref={mesh} args={[BOX, material, capacity]} castShadow receiveShadow frustumCulled={false} />
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
      {SOLID_BLOCKS.map((kind) => (
        <SolidBlocks key={kind} game={game} kind={kind} />
      ))}
      <Torches game={game} />
      <BlockCursor game={game} />
    </>
  );
}
