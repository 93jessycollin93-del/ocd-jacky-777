// three.js scene for Primal Isle. Everything here reads the mutable GameState held in a ref and
// redraws in useFrame; React only re-renders when the set of creatures or structures changes.
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sky, Stars } from "@react-three/drei";
import * as THREE from "three";
import { heightAt, WATER_LEVEL, WORLD_SIZE, type NodeKind } from "../engine/world";
import { SPECIES, type Creature } from "../engine/creatures";
import { ITEMS } from "../engine/items";
import {
  EYE_HEIGHT, GRID, equipped, placementFor, timeOfDay,
  type GameState, type Structure, type StructureKind,
} from "../engine/game";

type GameRef = MutableRefObject<GameState>;

// ---------------------------------------------------------------- terrain & water

function Terrain({ seed }: { seed: number }) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 220, 220);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const sand = new THREE.Color("#d8c48f");
    const grass = new THREE.Color("#4f7d3a");
    const forest = new THREE.Color("#35602b");
    const rock = new THREE.Color("#7a756c");
    const snow = new THREE.Color("#e9ecef");
    const seabed = new THREE.Color("#8f8466");
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = heightAt(x, z, seed);
      pos.setY(i, h);
      if (h < WATER_LEVEL) c.copy(seabed);
      else if (h < 2.2) c.copy(sand);
      else if (h < 10) c.copy(grass).lerp(forest, (h - 2.2) / 7.8);
      else if (h < 20) c.copy(forest).lerp(rock, (h - 10) / 10);
      else c.copy(rock).lerp(snow, Math.min(1, (h - 20) / 6));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [seed]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} flatShading />
    </mesh>
  );
}

function Water() {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={WATER_LEVEL}>
      <planeGeometry args={[WORLD_SIZE * 4, WORLD_SIZE * 4]} />
      <meshStandardMaterial color="#2a6f97" transparent opacity={0.78} roughness={0.15} metalness={0.1} />
    </mesh>
  );
}

// ---------------------------------------------------------------- resource nodes

const NODE_PARTS: { kind: NodeKind; geometry: THREE.BufferGeometry; color: string; y: number; scale: number }[] = [
  { kind: "tree", geometry: new THREE.CylinderGeometry(0.25, 0.4, 4, 6), color: "#6b4a2b", y: 2, scale: 1 },
  { kind: "tree", geometry: new THREE.ConeGeometry(2, 5, 7), color: "#2f5d2a", y: 5.5, scale: 1 },
  { kind: "rock", geometry: new THREE.DodecahedronGeometry(1.1, 0), color: "#8a8680", y: 0.5, scale: 1 },
  { kind: "bush", geometry: new THREE.IcosahedronGeometry(0.8, 0), color: "#3d7a35", y: 0.5, scale: 1 },
];

function Nodes({ game }: { game: GameRef }) {
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const lastVersion = useRef(-1);
  const counts = useMemo(() => {
    const byKind: Record<NodeKind, number> = { tree: 0, rock: 0, bush: 0 };
    for (const n of game.current.nodes) byKind[n.kind]++;
    return byKind;
  }, [game]);

  useFrame(() => {
    const g = game.current;
    if (lastVersion.current === g.nodeVersion) return;
    lastVersion.current = g.nodeVersion;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    NODE_PARTS.forEach((part, pi) => {
      const mesh = refs.current[pi];
      if (!mesh) return;
      let i = 0;
      for (const n of g.nodes) {
        if (n.kind !== part.kind) continue;
        const variety = 0.8 + ((n.id * 9301) % 100) / 250;
        q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, n.id);
        s.setScalar(n.respawnAt ? 0 : variety * part.scale);
        p.set(n.x, n.y + part.y * variety - 0.1, n.z);
        mesh.setMatrixAt(i++, m.compose(p, q, s));
      }
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <>
      {NODE_PARTS.map((part, i) => (
        <instancedMesh
          key={i}
          ref={(el) => (refs.current[i] = el)}
          args={[part.geometry, undefined, counts[part.kind]]}
          castShadow
          frustumCulled={false}
        >
          <meshStandardMaterial color={part.color} flatShading roughness={0.9} />
        </instancedMesh>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- creatures

function CreatureModel({ creature, seed }: { creature: Creature; seed: number }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const tag = useRef<THREE.Mesh>(null);
  const last = useRef({ x: creature.x, z: creature.z, phase: 0 });
  const sp = SPECIES[creature.species];
  const biped = creature.species === "dodo" || creature.species === "compy" || creature.species === "raptor";
  const s = sp.size;

  useFrame((_, dt) => {
    const g = group.current;
    const b = body.current;
    if (!g || !b) return;
    const moved = Math.hypot(creature.x - last.current.x, creature.z - last.current.z);
    last.current.x = creature.x;
    last.current.z = creature.z;
    last.current.phase += moved * 3;
    g.position.set(creature.x, Math.max(heightAt(creature.x, creature.z, seed), WATER_LEVEL - 0.4), creature.z);
    g.rotation.y = creature.heading;
    const down = creature.state === "unconscious" || creature.state === "dead";
    b.rotation.z = THREE.MathUtils.damp(b.rotation.z, down ? Math.PI / 2 : 0, 6, dt);
    b.position.y = down ? 0 : Math.abs(Math.sin(last.current.phase)) * 0.08 * s;
    if (tag.current) {
      tag.current.visible = creature.tamed || creature.state === "unconscious";
      const mat = tag.current.material as THREE.MeshBasicMaterial;
      mat.color.set(creature.tamed ? "#4ade80" : "#a78bfa");
      tag.current.rotation.y += dt * 2;
    }
  });

  const color = creature.state === "dead" ? "#4a3f35" : sp.color;
  const legH = (biped ? 0.9 : 0.7) * s;
  return (
    <group ref={group}>
      <group ref={body}>
        {/* body */}
        <mesh position={[0, legH + 0.35 * s, 0]} scale={[0.55 * s, 0.5 * s, (biped ? 0.8 : 1.1) * s]} castShadow>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
        {/* neck + head */}
        <mesh position={[0, legH + (biped ? 0.95 : 0.55) * s, (biped ? 0.6 : 1.1) * s]} scale={0.32 * s} castShadow>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
        {/* tail */}
        <mesh position={[0, legH + 0.35 * s, -1.2 * s]} rotation-x={-Math.PI / 2} scale={s}>
          <coneGeometry args={[0.22, 1.2, 6]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
        {/* legs */}
        {(biped ? [[-0.25, 0], [0.25, 0]] : [[-0.35, 0.55], [0.35, 0.55], [-0.35, -0.55], [0.35, -0.55]]).map(([lx, lz], i) => (
          <mesh key={i} position={[lx * s, legH / 2, lz * s]}>
            <cylinderGeometry args={[0.1 * s, 0.08 * s, legH, 5]} />
            <meshStandardMaterial color={color} />
          </mesh>
        ))}
        {creature.species === "trike" && (
          <>
            <mesh position={[0, legH + 0.75 * s, 1.35 * s]} rotation-x={-0.4} scale={s}>
              <cylinderGeometry args={[0.6, 0.6, 0.08, 10]} />
              <meshStandardMaterial color="#8a7a4a" />
            </mesh>
            {[-0.15, 0.15].map((hx) => (
              <mesh key={hx} position={[hx * s, legH + 0.75 * s, 1.75 * s]} rotation-x={Math.PI / 2.4} scale={s}>
                <coneGeometry args={[0.06, 0.6, 5]} />
                <meshStandardMaterial color="#efe6cf" />
              </mesh>
            ))}
          </>
        )}
        {creature.species === "parasaur" && (
          <mesh position={[0, legH + 0.9 * s, 0.85 * s]} rotation-x={-1} scale={s}>
            <coneGeometry args={[0.08, 0.9, 5]} />
            <meshStandardMaterial color="#d9822b" />
          </mesh>
        )}
        {creature.species === "dodo" && (
          <mesh position={[0, legH + 0.95 * s, 0.95 * s]} rotation-x={Math.PI / 2} scale={s}>
            <coneGeometry args={[0.12, 0.4, 5]} />
            <meshStandardMaterial color="#e5c07b" />
          </mesh>
        )}
      </group>
      <mesh ref={tag} position={[0, legH + 1.6 * s + 0.4, 0]} visible={false}>
        <octahedronGeometry args={[0.18, 0]} />
        <meshBasicMaterial color="#4ade80" />
      </mesh>
    </group>
  );
}

function Creatures({ game }: { game: GameRef }) {
  const [list, setList] = useState<Creature[]>(() => [...game.current.creatures]);
  const sig = useRef("");
  useFrame(() => {
    const cs = game.current.creatures;
    // Rebuild only when creatures come and go, or a corpse's look changes.
    const next = cs.map((c) => `${c.id}${c.state === "dead" ? "d" : ""}`).join(",");
    if (next !== sig.current) {
      sig.current = next;
      setList([...cs]);
    }
  });
  return (
    <>
      {list.map((c) => (
        <CreatureModel key={`${c.id}-${c.state === "dead"}`} creature={c} seed={game.current.seed} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------- structures

function StructureMesh({ s, ghost = false }: { s: Structure; ghost?: boolean }) {
  const mat = ghost
    ? <meshStandardMaterial color="#60a5fa" transparent opacity={0.4} depthWrite={false} />
    : null;
  if (s.kind === "campfire") {
    return (
      <group position={[s.x, s.y, s.z]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[Math.sin(i) * 0.5, 0.1, Math.cos(i) * 0.5]}>
            <dodecahedronGeometry args={[0.18, 0]} />
            {mat ?? <meshStandardMaterial color="#77736b" flatShading />}
          </mesh>
        ))}
        <mesh position={[0, 0.35, 0]}>
          <coneGeometry args={[0.3, 0.7, 6]} />
          {mat ?? <meshStandardMaterial color="#ff8c1a" emissive="#ff5a00" emissiveIntensity={2} />}
        </mesh>
        {!ghost && <pointLight position={[0, 1, 0]} color="#ff9a3c" intensity={12} distance={14} decay={2} />}
      </group>
    );
  }
  if (s.kind === "foundation") {
    return (
      <mesh position={[s.x, s.y - 0.5, s.z]} receiveShadow castShadow>
        <boxGeometry args={[GRID, 1.3, GRID]} />
        {mat ?? <meshStandardMaterial color="#b08a4f" roughness={1} />}
      </mesh>
    );
  }
  return (
    <mesh position={[s.x, s.y + 1.5, s.z]} rotation-y={s.rot} castShadow receiveShadow>
      <boxGeometry args={[GRID, 3, 0.3]} />
      {mat ?? <meshStandardMaterial color="#c9a76a" roughness={1} />}
    </mesh>
  );
}

function Structures({ game }: { game: GameRef }) {
  const [list, setList] = useState<Structure[]>(() => [...game.current.structures]);
  const version = useRef(game.current.structureVersion);
  useFrame(() => {
    if (game.current.structureVersion !== version.current) {
      version.current = game.current.structureVersion;
      setList([...game.current.structures]);
    }
  });
  return <>{list.map((s) => <StructureMesh key={s.id} s={s} />)}</>;
}

function PlacementGhost({ game }: { game: GameRef }) {
  const [ghost, setGhost] = useState<Structure | null>(null);
  useFrame(() => {
    const id = equipped(game.current);
    const next = id && ITEMS[id].kind === "structure" && !game.current.player.dead
      ? placementFor(game.current, id as StructureKind)
      : null;
    setGhost((prev) => {
      if (!next) return prev ? null : prev;
      if (prev && prev.kind === next.kind && prev.x === next.x && prev.z === next.z && prev.rot === next.rot && Math.abs(prev.y - next.y) < 0.05) return prev;
      return next;
    });
  });
  return ghost ? <StructureMesh s={ghost} ghost /> : null;
}

// ---------------------------------------------------------------- camera, sky, lights

function FirstPersonCamera({ game }: { game: GameRef }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.rotation.order = "YXZ";
  }, [camera]);
  useFrame(() => {
    const p = game.current.player;
    const mount = p.mountId ? game.current.creatures.find((c) => c.id === p.mountId) : undefined;
    const lift = mount ? SPECIES[mount.species].size * 1.6 + 0.6 : p.dead ? 0.3 : EYE_HEIGHT;
    camera.position.set(p.x, p.y + lift, p.z);
    camera.rotation.set(p.pitch, p.yaw + Math.PI, p.dead ? 0.6 : 0);
  });
  return null;
}

function DayNight({ game }: { game: GameRef }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const stars = useRef<THREE.Group>(null);
  const { scene } = useThree();
  const [sunPos, setSunPos] = useState<[number, number, number]>([100, 60, 30]);
  const tick = useRef(0);
  const fog = useMemo(() => new THREE.Fog("#a9c7d8", 60, 260), []);
  useEffect(() => {
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [scene, fog]);

  useFrame((_, dt) => {
    const t = timeOfDay(game.current);
    const angle = (t - 0.25) * Math.PI * 2; // sunrise at 0.25, noon at 0.5
    const elev = Math.sin(angle);
    const p = game.current.player;
    const pos: [number, number, number] = [Math.cos(angle) * 150, elev * 150, 40];
    const daylight = THREE.MathUtils.clamp(elev * 2 + 0.2, 0, 1);
    if (sun.current) {
      sun.current.position.set(p.x + pos[0], pos[1], p.z + pos[2]);
      sun.current.target.position.set(p.x, 0, p.z);
      sun.current.target.updateMatrixWorld();
      sun.current.intensity = 2.4 * daylight;
    }
    if (ambient.current) ambient.current.intensity = 0.15 + 0.5 * daylight;
    if (stars.current) stars.current.visible = daylight < 0.4;
    fog.color.setRGB(0.05 + 0.6 * daylight, 0.07 + 0.71 * daylight, 0.12 + 0.73 * daylight);
    tick.current += dt;
    if (tick.current > 0.5) {
      tick.current = 0;
      setSunPos(pos);
    }
  });

  return (
    <>
      <Sky sunPosition={sunPos} distance={4500} turbidity={6} rayleigh={1.5} />
      <group ref={stars}>
        <Stars radius={300} depth={60} count={3000} factor={6} fade />
      </group>
      <ambientLight ref={ambient} intensity={0.5} />
      <hemisphereLight args={["#bcd7ff", "#4a3b26", 0.25]} />
      <directionalLight
        ref={sun}
        castShadow
        intensity={2}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
    </>
  );
}

export default function World({ game }: { game: GameRef }) {
  const seed = game.current.seed;
  return (
    <>
      <DayNight game={game} />
      <FirstPersonCamera game={game} />
      <Terrain seed={seed} />
      <Water />
      <Nodes game={game} />
      <Creatures game={game} />
      <Structures game={game} />
      <PlacementGhost game={game} />
    </>
  );
}
