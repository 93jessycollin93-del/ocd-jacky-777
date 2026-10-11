// Rendering for Minecraft-style blocks: pixel-art textures drawn at runtime, one instanced mesh per
// block type, glowing torches, and the outline/preview of what you're aiming at.
import { useMemo, useRef, useState, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { pixelTexture, type Face } from "./textures";
import { BLOCKS, cellKey, hitsToBreak, isBlockItem, isDoor, parseKey, solidAt, type BlockId } from "../engine/blocks";
import { blockTarget, equipped, toolStats, type GameState } from "../engine/game";

type GameRef = MutableRefObject<GameState>;

/** Full-cube blocks drawn as instanced boxes. Torches and doors have their own shapes. */
const CUBE_BLOCKS = (Object.keys(BLOCKS) as BlockId[]).filter((b) => BLOCKS[b].solid && b !== "door");

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
  const crack = useRef<THREE.Mesh>(null);
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
    // Darken the block you're breaking, more with each hit.
    const c = crack.current;
    if (c) {
      const key = hit?.block ? cellKey(hit.cell[0], hit.cell[1], hit.cell[2]) : null;
      const dmg = key && g.blockDamage?.key === key ? g.blockDamage.hits : 0;
      c.visible = dmg > 0;
      if (dmg > 0 && hit?.block) {
        const needed = hitsToBreak(hit.block, toolStats(g).harvest[BLOCKS[hit.block].breakAs] ?? 0.5);
        (c.material as THREE.MeshBasicMaterial).opacity = Math.min(0.75, 0.15 + (0.6 * dmg) / needed);
        c.position.copy(o.position);
      }
    }
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
      <mesh ref={crack} visible={false}>
        <boxGeometry args={[1.015, 1.015, 1.015]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} depthWrite={false} />
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
