// First-person feel: the item in your hand (with its swing) and the chips that fly off whatever you hit.
import { useMemo, useRef, useState, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { equipped, type GameState } from "../engine/game";
import { isBlockItem, type BlockId } from "../engine/blocks";
import { ITEMS, type ItemId } from "../engine/items";
import { heldBlockMaterial } from "./textures";

type GameRef = MutableRefObject<GameState>;

// ---------------------------------------------------------------- particles

const MAX_PARTICLES = 256;

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
}

/** Little cubes that burst out of blocks, plants, rocks and creatures when you hit them. */
export function Particles({ game }: { game: GameRef }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const pool = useMemo<Particle[]>(
    () => Array.from({ length: MAX_PARTICLES }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1 })),
    [],
  );
  const next = useRef(0);
  const color = useMemo(() => new THREE.Color(), []);
  const m = useMemo(() => new THREE.Matrix4(), []);

  useFrame((_, dt) => {
    const inst = mesh.current;
    if (!inst) return;
    if (!inst.instanceColor) {
      // Give every slot a colour up front so the shader is built with per-particle colours.
      for (let i = 0; i < MAX_PARTICLES; i++) inst.setColorAt(i, color.set("#ffffff"));
      (inst.material as THREE.Material).needsUpdate = true;
    }
    const g = game.current;
    for (const fx of g.fx.splice(0)) {
      color.set(fx.color);
      for (let i = 0; i < fx.count; i++) {
        const idx = next.current;
        next.current = (idx + 1) % MAX_PARTICLES;
        const p = pool[idx];
        const a = Math.random() * Math.PI * 2;
        const sp = 1 + Math.random() * 2.5;
        Object.assign(p, {
          x: fx.x + (Math.random() - 0.5) * 0.4,
          y: fx.y + (Math.random() - 0.5) * 0.4,
          z: fx.z + (Math.random() - 0.5) * 0.4,
          vx: Math.cos(a) * sp,
          vy: 2 + Math.random() * 3,
          vz: Math.sin(a) * sp,
          life: 0.45 + Math.random() * 0.35,
        });
        p.max = p.life;
        // Vary the shade a little so a burst doesn't look flat.
        inst.setColorAt(idx, color.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.15));
      }
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    }
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = pool[i];
      if (p.life <= 0) {
        m.makeScale(0, 0, 0);
      } else {
        p.life -= dt;
        p.vy -= 14 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        const s = 0.11 * Math.max(0, p.life / p.max);
        m.makeScale(s, s, s).setPosition(p.x, p.y, p.z);
      }
      inst.setMatrixAt(i, m);
    }
    inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, MAX_PARTICLES]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
  );
}

// ---------------------------------------------------------------- held item

type HeldShape =
  | { kind: "hand" }
  | { kind: "block"; block: BlockId }
  | { kind: "tool"; head: string; handle: string; style: "pick" | "axe" | "shovel" | "spear" | "sword" | "club" }
  | { kind: "thing"; color: string };

function shapeFor(id: ItemId | null): HeldShape {
  if (!id) return { kind: "hand" };
  if (isBlockItem(id)) return { kind: "block", block: id };
  const stone = "#8a8680";
  const metal = "#c9ced6";
  switch (id) {
    case "stone_pick": return { kind: "tool", head: stone, handle: "#7a5230", style: "pick" };
    case "metal_pick": return { kind: "tool", head: metal, handle: "#5c3b1e", style: "pick" };
    case "stone_hatchet": return { kind: "tool", head: stone, handle: "#7a5230", style: "axe" };
    case "metal_hatchet": return { kind: "tool", head: metal, handle: "#5c3b1e", style: "axe" };
    case "stone_shovel": return { kind: "tool", head: stone, handle: "#7a5230", style: "shovel" };
    case "spear": return { kind: "tool", head: "#3b3b3b", handle: "#8a6238", style: "spear" };
    case "metal_sword": return { kind: "tool", head: metal, handle: "#4a3020", style: "sword" };
    case "club": return { kind: "tool", head: "#7a5230", handle: "#7a5230", style: "club" };
  }
  const colors: Partial<Record<ItemId, string>> = {
    berries: "#4b3a8c", raw_meat: "#b5463a", cooked_meat: "#8a4b22", bandage: "#f2f2f2",
  };
  return { kind: "thing", color: colors[id] ?? (ITEMS[id].kind === "structure" ? "#9c6b38" : "#aaaaaa") };
}

/** Basic material that draws over the world, so the held item never sinks into a wall you're facing. */
function onTop(color: string) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, depthTest: false });
}

function HeldModel({ shape }: { shape: HeldShape }) {
  const mats = useMemo(() => {
    if (shape.kind === "tool") return { head: onTop(shape.head), handle: onTop(shape.handle) };
    if (shape.kind === "thing") return { head: onTop(shape.color), handle: onTop(shape.color) };
    return { head: onTop("#e0ac69"), handle: onTop("#e0ac69") };
  }, [shape]);

  if (shape.kind === "hand") {
    return (
      <mesh material={mats.head} position={[0, 0, 0.1]} rotation-x={-0.25} renderOrder={999}>
        <boxGeometry args={[0.12, 0.12, 0.42]} />
      </mesh>
    );
  }
  if (shape.kind === "block") {
    return (
      <mesh material={heldBlockMaterial(shape.block)} rotation={[0.25, 0.6, 0]} position={[0.03, 0.02, -0.04]} renderOrder={999}>
        <boxGeometry args={[0.16, 0.16, 0.16]} />
      </mesh>
    );
  }
  if (shape.kind === "thing") {
    return (
      <mesh material={mats.head} renderOrder={999}>
        <boxGeometry args={[0.16, 0.12, 0.2]} />
      </mesh>
    );
  }
  const long = shape.style === "spear" ? 0.9 : 0.5;
  return (
    // Held like a tool resting in your right hand: handle down, head up and leaning in.
    <group rotation={[-0.25, -0.5, 0.35]} scale={0.7} position={[0, -0.05, 0]}>
      <mesh material={mats.handle} position={[0, long / 2 - 0.1, 0]} renderOrder={999}>
        <boxGeometry args={[0.045, long, 0.045]} />
      </mesh>
      {shape.style === "pick" && (
        <mesh material={mats.head} position={[0, long - 0.12, 0]} renderOrder={999}>
          <boxGeometry args={[0.36, 0.06, 0.06]} />
        </mesh>
      )}
      {shape.style === "axe" && (
        <mesh material={mats.head} position={[0.08, long - 0.16, 0]} renderOrder={999}>
          <boxGeometry args={[0.14, 0.16, 0.04]} />
        </mesh>
      )}
      {shape.style === "shovel" && (
        <mesh material={mats.head} position={[0, long + 0.02, 0]} renderOrder={999}>
          <boxGeometry args={[0.13, 0.17, 0.03]} />
        </mesh>
      )}
      {shape.style === "spear" && (
        <mesh material={mats.head} position={[0, long - 0.05, 0]} renderOrder={999}>
          <coneGeometry args={[0.05, 0.16, 4]} />
        </mesh>
      )}
      {shape.style === "sword" && (
        <>
          <mesh material={mats.head} position={[0, 0.45, 0]} renderOrder={999}>
            <boxGeometry args={[0.07, 0.6, 0.02]} />
          </mesh>
          <mesh material={mats.handle} position={[0, 0.14, 0]} renderOrder={999}>
            <boxGeometry args={[0.2, 0.04, 0.05]} />
          </mesh>
        </>
      )}
      {shape.style === "club" && (
        <mesh material={mats.head} position={[0, long - 0.08, 0]} renderOrder={999}>
          <boxGeometry args={[0.1, 0.22, 0.1]} />
        </mesh>
      )}
    </group>
  );
}

/** Whatever's in your selected hotbar slot, held bottom-right of the view, swinging when you use it. */
export function HeldItem({ game }: { game: GameRef }) {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const item = useRef<THREE.Group>(null);
  // The scene doesn't re-render on hotbar changes, so watch the selected item here.
  const [held, setHeld] = useState(() => equipped(game.current));
  const heldRef = useRef(held);
  const shape = useMemo(() => shapeFor(held), [held]);
  const sway = useRef({ x: 0, z: 0, phase: 0 });
  const offset = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const g = group.current;
    const it = item.current;
    if (!g || !it) return;
    const p = game.current.player;
    const now = equipped(game.current);
    if (now !== heldRef.current) {
      heldRef.current = now;
      setHeld(now);
    }
    g.visible = !p.dead;
    const s = sway.current;
    const moved = Math.hypot(p.x - s.x, p.z - s.z);
    s.x = p.x;
    s.z = p.z;
    if (p.onGround && moved < 1) s.phase += moved * 2.2;
    // Sit bottom-right in camera space, bobbing a little as you walk.
    offset.set(0.34 + Math.cos(s.phase) * 0.012, -0.32 + Math.abs(Math.sin(s.phase)) * 0.018, -0.6);
    offset.applyQuaternion(camera.quaternion);
    g.position.copy(camera.position).add(offset);
    g.quaternion.copy(camera.quaternion);
    // Swing: a quick chop down and back.
    const t = (p.swing ?? 0) > 0 ? 1 - (p.swing ?? 0) / 0.25 : 0;
    const chop = Math.sin(Math.min(1, t) * Math.PI);
    it.rotation.set(-chop * 1.1, chop * 0.3, 0);
    it.position.set(-chop * 0.08, -chop * 0.04, -chop * 0.08);
  });

  return (
    <group ref={group}>
      <group ref={item}>
        <HeldModel shape={shape} />
      </group>
    </group>
  );
}
