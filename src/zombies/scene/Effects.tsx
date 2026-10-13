// Effects in the world: tracers, blood, splinters, dust and sparks, lightning arcs, explosions with a
// flash of light, glowing power-ups and live grenades. Pooled so nothing is allocated mid-fight.
import { useMemo, useRef, useState, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Drop, Fx, GameState } from "../engine/game";
import { POWER_UPS } from "../engine/weapons";
import { glowTexture, iconTexture } from "./textures";

type GameRef = MutableRefObject<GameState>;

const PARTICLES = 420;
const TRACERS = 24;
const ARCS = 10;

interface Particle {
  life: number;
  max: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  gravity: number;
}

const KIND: Record<string, { colors: string[]; n: number; speed: number; up: number; size: number; life: number; gravity: number }> = {
  blood: { colors: ["#7a0b0b", "#a01212", "#5a0606"], n: 9, speed: 2.2, up: 1.6, size: 0.06, life: 0.6, gravity: 9 },
  wall: { colors: ["#8a8274", "#5d564c", "#b0a796"], n: 6, speed: 1.6, up: 1.2, size: 0.045, life: 0.45, gravity: 6 },
  splinter: { colors: ["#8a6440", "#a87d52", "#5e4024"], n: 10, speed: 2.6, up: 1.8, size: 0.07, life: 0.8, gravity: 9 },
  dust: { colors: ["#6d665c", "#857d70", "#4e4a43"], n: 26, speed: 2.2, up: 1.2, size: 0.16, life: 1.2, gravity: 0.6 },
  spark: { colors: ["#58e1ff", "#c6f6ff", "#ff5cf4"], n: 10, speed: 3.5, up: 1.5, size: 0.04, life: 0.35, gravity: 3 },
  fire: { colors: ["#ffb347", "#ff6a1a", "#ffe08a", "#3a3633"], n: 40, speed: 6, up: 3, size: 0.18, life: 0.9, gravity: 2 },
};

function Particles({ game }: { game: GameRef }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const pool = useMemo<Particle[]>(
    () => Array.from({ length: PARTICLES }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 0, gravity: 0 })),
    [],
  );
  const next = useRef(0);
  const o = useMemo(() => new THREE.Object3D(), []);
  const c = useMemo(() => new THREE.Color(), []);
  const tracerRefs = useRef<(THREE.Mesh | null)[]>([]);
  const tracerLife = useRef<number[]>(Array(TRACERS).fill(0));
  const tracerNext = useRef(0);
  const arcLife = useRef<number[]>(Array(ARCS).fill(0));
  const arcNext = useRef(0);
  const boomLight = useRef<THREE.PointLight>(null);
  const boomBall = useRef<THREE.Mesh>(null);
  const boom = useRef({ t: 9, x: 0, y: 0, z: 0 });
  const muzzleLight = useRef<THREE.PointLight>(null);
  const muzzleT = useRef(9);
  const { camera } = useThree();
  const arcs = useMemo(
    () => Array.from({ length: ARCS }, () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(8 * 3), 3));
      const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: "#9ff3ff", transparent: true, opacity: 0.95, toneMapped: false }));
      line.visible = false;
      line.frustumCulled = false;
      return line;
    }),
    [],
  );

  const emit = (kind: string, x: number, y: number, z: number) => {
    const k = KIND[kind];
    for (let i = 0; i < k.n; i++) {
      const p = pool[next.current];
      const idx = next.current;
      next.current = (next.current + 1) % PARTICLES;
      const a = Math.random() * Math.PI * 2;
      const s = k.speed * (0.4 + Math.random() * 0.8);
      Object.assign(p, {
        life: k.life * (0.6 + Math.random() * 0.6), x, y, z,
        vx: Math.cos(a) * s, vy: k.up * (0.3 + Math.random()), vz: Math.sin(a) * s,
        size: k.size * (0.6 + Math.random() * 0.8), gravity: k.gravity,
      });
      p.max = p.life;
      mesh.current?.setColorAt(idx, c.set(k.colors[i % k.colors.length]));
    }
    if (mesh.current?.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  };

  const handle = (f: Fx) => {
    if (f.type === "impact") emit(f.kind, f.at[0], f.at[1], f.at[2]);
    else if (f.type === "explosion") {
      emit("fire", f.at[0], f.at[1] + 0.3, f.at[2]);
      emit("dust", f.at[0], f.at[1] + 0.2, f.at[2]);
      boom.current = { t: 0, x: f.at[0], y: f.at[1] + 0.8, z: f.at[2] };
    } else if (f.type === "muzzle") {
      muzzleT.current = 0;
    } else if (f.type === "tracer") {
      const i = tracerNext.current;
      tracerNext.current = (i + 1) % TRACERS;
      const m = tracerRefs.current[i];
      if (!m) return;
      // Start at the gun, not the eye: a little right and down along the view.
      const from = new THREE.Vector3(...f.from);
      const to = new THREE.Vector3(...f.to);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const down = new THREE.Vector3(0, -1, 0).applyQuaternion(camera.quaternion);
      const dir = to.clone().sub(from).normalize();
      from.add(right.multiplyScalar(0.12)).add(down.multiplyScalar(0.1)).add(dir.clone().multiplyScalar(0.8));
      const len = from.distanceTo(to);
      if (len < 0.3) return;
      m.position.copy(from).add(to).multiplyScalar(0.5);
      m.lookAt(to);
      m.scale.set(1, 1, len);
      (m.material as THREE.MeshBasicMaterial).color.set(f.color);
      m.visible = true;
      tracerLife.current[i] = 0.06;
    } else if (f.type === "zap") {
      const i = arcNext.current;
      arcNext.current = (i + 1) % ARCS;
      const line = arcs[i];
      const pos = line.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let k = 0; k < 8; k++) {
        const t = k / 7;
        const jitter = k === 0 || k === 7 ? 0 : 0.35;
        pos.setXYZ(
          k,
          f.from[0] + (f.to[0] - f.from[0]) * t + (Math.random() - 0.5) * jitter,
          f.from[1] + (f.to[1] - f.from[1]) * t + (Math.random() - 0.5) * jitter,
          f.from[2] + (f.to[2] - f.from[2]) * t + (Math.random() - 0.5) * jitter,
        );
      }
      pos.needsUpdate = true;
      line.visible = true;
      arcLife.current[i] = 0.18;
      emit("spark", f.to[0], f.to[1], f.to[2]);
    }
  };

  useFrame((_, dt) => {
    const g = game.current;
    for (const f of g.fx.splice(0)) handle(f);
    const m = mesh.current;
    if (m) {
      for (let i = 0; i < PARTICLES; i++) {
        const p = pool[i];
        if (p.life > 0) {
          p.life -= dt;
          p.vy -= p.gravity * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          if (p.y < 0.02) {
            p.y = 0.02;
            p.vy = 0;
            p.vx *= 0.6;
            p.vz *= 0.6;
          }
        }
        const s = p.life > 0 ? p.size * Math.min(1, (p.life / p.max) * 2) : 0;
        o.position.set(p.x, p.y, p.z);
        o.scale.setScalar(s);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    }
    tracerLife.current.forEach((life, i) => {
      if (life <= 0) return;
      tracerLife.current[i] = life - dt;
      const t = tracerRefs.current[i];
      if (t && tracerLife.current[i] <= 0) t.visible = false;
    });
    arcLife.current.forEach((life, i) => {
      if (life <= 0) return;
      arcLife.current[i] = life - dt;
      if (arcLife.current[i] <= 0) arcs[i].visible = false;
    });
    // Explosion: a fireball that swells and fades, lighting the room.
    const b = boom.current;
    b.t += dt;
    if (boomLight.current) {
      boomLight.current.position.set(b.x, b.y, b.z);
      boomLight.current.intensity = b.t < 0.5 ? 60 * (1 - b.t / 0.5) : 0;
    }
    if (boomBall.current) {
      boomBall.current.visible = b.t < 0.35;
      boomBall.current.position.set(b.x, b.y, b.z);
      boomBall.current.scale.setScalar(0.5 + b.t * 9);
      (boomBall.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - b.t * 2.6);
    }
    // Muzzle flash lights up the room around you for a moment.
    muzzleT.current += dt;
    if (muzzleLight.current) {
      const p = g.player;
      muzzleLight.current.position.set(p.x + Math.sin(p.yaw) * 0.8, 1.5, p.z + Math.cos(p.yaw) * 0.8);
      muzzleLight.current.intensity = muzzleT.current < 0.05 ? 7 : 0;
    }
  });

  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, PARTICLES]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial />
      </instancedMesh>
      {Array.from({ length: TRACERS }, (_, i) => (
        <mesh key={i} ref={(r) => (tracerRefs.current[i] = r)} visible={false}>
          <boxGeometry args={[0.012, 0.012, 1]} />
          <meshBasicMaterial color="#ffd27a" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {arcs.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
      <pointLight ref={boomLight} color="#ff8a3a" intensity={0} distance={18} decay={1.4} />
      <pointLight ref={muzzleLight} color="#ffcf7a" intensity={0} distance={9} decay={1.6} />
      <mesh ref={boomBall} visible={false}>
        <sphereGeometry args={[0.5, 16, 12]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}

function DropModel({ drop }: { drop: Drop }) {
  const ref = useRef<THREE.Group>(null);
  const info = POWER_UPS[drop.kind];
  const tex = useMemo(() => iconTexture(info.icon, info.color), [info.icon, info.color]);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    g.position.set(drop.x, 1.0 + Math.sin(clock.elapsedTime * 2.5 + drop.id) * 0.12, drop.z);
    // Blink when it's about to vanish.
    g.visible = drop.age < 20 || Math.floor(drop.age * 6) % 2 === 0;
  });
  return (
    <group ref={ref}>
      <sprite scale={[0.9, 0.9, 1]}>
        <spriteMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite scale={[2.4, 2.4, 1]}>
        <spriteMaterial map={glowTexture()} color={info.color} transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

function Drops({ game }: { game: GameRef }) {
  const [list, setList] = useState<Drop[]>([]);
  const key = useRef("");
  useFrame(() => {
    const k = game.current.drops.map((d) => d.id).join(",");
    if (k !== key.current) {
      key.current = k;
      setList([...game.current.drops]);
    }
  });
  return (
    <group>
      {list.map((d) => (
        <DropModel key={d.id} drop={d} />
      ))}
    </group>
  );
}

function Grenades({ game }: { game: GameRef }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => {
    const gs = game.current.grenades;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const g = gs[i];
      m.visible = !!g;
      if (g) m.position.set(g.x, g.y, g.z);
    });
  });
  return (
    <group>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} ref={(r) => (refs.current[i] = r)} visible={false}>
          <sphereGeometry args={[0.07, 10, 8]} />
          <meshStandardMaterial color="#3d4a2a" roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

export default function Effects({ game }: { game: GameRef }) {
  return (
    <group>
      <Particles game={game} />
      <Drops game={game} />
      <Grenades game={game} />
    </group>
  );
}
