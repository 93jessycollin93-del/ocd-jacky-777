// The undead: low-poly bodies with outstretched arms and glowing eyes. Positions and animation come
// from the game state every frame; React only re-renders when zombies come and go.
import { useMemo, useRef, useState, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GameState, Zombie } from "../engine/game";

type GameRef = MutableRefObject<GameState>;

const SKINS = ["#7d8a6a", "#8a8f74", "#6f7a63", "#9a8f7a", "#7a6f62", "#5f6b58"];
const SHIRTS = ["#3b3f4a", "#5a3a2a", "#2f4a3a", "#6b6458", "#4a2f2f", "#2b2f3f", "#7a6a50"];
const PANTS = ["#2a2a30", "#3a3228", "#24303a", "#3b3b3b", "#2f2a24"];

function ZombieModel({ zombie }: { zombie: Zombie }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const mats = useMemo(() => {
    const l = zombie.look;
    const skin = new THREE.MeshStandardMaterial({ color: SKINS[l % SKINS.length], roughness: 0.9 });
    const shirt = new THREE.MeshStandardMaterial({ color: SHIRTS[(l >> 3) % SHIRTS.length], roughness: 0.95 });
    const pants = new THREE.MeshStandardMaterial({ color: PANTS[(l >> 6) % PANTS.length], roughness: 0.95 });
    const eye = new THREE.MeshStandardMaterial({ color: "#ffb020", emissive: "#ff9a10", emissiveIntensity: 3, toneMapped: false });
    const gore = new THREE.MeshStandardMaterial({ color: "#5a0d0d", roughness: 0.6 });
    return { skin, shirt, pants, eye, gore, all: [skin, shirt, pants] };
  }, [zombie.look]);
  const flashing = useRef(false);
  // Hunched runners, upright shamblers.
  const hunch = zombie.gait === "walk" ? 0.12 : zombie.gait === "run" ? 0.3 : 0.45;

  useFrame(({ clock }, dt) => {
    const z = zombie;
    const g = root.current;
    if (!g || !body.current) return;
    g.position.set(z.x, 0, z.z);
    g.rotation.y = z.yaw;
    const t = z.anim;
    const stride = z.gait === "walk" ? 0.45 : 0.85;
    const dead = z.state === "dead";
    if (!dead) {
      const swing = Math.sin(t) * stride;
      if (legL.current) legL.current.rotation.x = swing;
      if (legR.current) legR.current.rotation.x = -swing;
      body.current.rotation.x = hunch + Math.sin(t * 2) * 0.03;
      body.current.position.y = Math.abs(Math.cos(t)) * 0.04;
      // Arms reach forward; claw at boards; rake you when attacking.
      const reach = -1.35 + Math.sin(clock.elapsedTime * 2 + z.look) * 0.08;
      let l = reach + Math.sin(t) * 0.12;
      let r = reach - Math.sin(t) * 0.12;
      if (z.state === "tearing") {
        const pull = Math.sin(clock.elapsedTime * 6 + z.look) * 0.5;
        l = -1.5 + pull;
        r = -1.5 - pull;
      }
      if (z.attack > 0) {
        const k = 1 - z.attack / 0.4;
        l = -2.4 + k * 1.6;
        r = -2.2 + k * 1.4;
      }
      if (armL.current) armL.current.rotation.x = l;
      if (armR.current) armR.current.rotation.x = r;
      if (z.state === "climbing") body.current.rotation.x = 0.9;
      g.rotation.x = 0;
      g.position.y = z.state === "climbing" ? 0.25 : 0;
    } else {
      // Topple backward, lie there, then sink away.
      const fall = Math.min(1, z.timer / 0.55);
      g.rotation.x = -fall * (Math.PI / 2) * 0.95;
      g.position.y = z.timer > 3.2 ? -(z.timer - 3.2) * 0.4 : 0;
      if (armL.current) armL.current.rotation.x = THREE.MathUtils.damp(armL.current.rotation.x, -2.8, 4, dt);
      if (armR.current) armR.current.rotation.x = THREE.MathUtils.damp(armR.current.rotation.x, -0.4, 4, dt);
    }
    if (head.current) head.current.visible = !z.headless;
    const flash = z.hurt > 0;
    if (flash || flashing.current) {
      flashing.current = flash;
      for (const m of mats.all) m.emissive.setRGB(flash ? 0.5 : 0, 0, 0);
    }
    mats.eye.emissiveIntensity = dead ? Math.max(0, 3 - z.timer * 3) : 3;
  });

  return (
    <group ref={root}>
      <group ref={body}>
        {/* hips + torso */}
        <mesh position={[0, 0.92, 0]} material={mats.pants}>
          <boxGeometry args={[0.42, 0.16, 0.24]} />
        </mesh>
        <mesh position={[0, 1.2, 0]} material={mats.shirt}>
          <boxGeometry args={[0.5, 0.48, 0.27]} />
        </mesh>
        {/* a torn, bloody patch */}
        <mesh position={[0.09, 1.16, 0.137]} material={mats.gore}>
          <planeGeometry args={[0.16, 0.2]} />
        </mesh>
        <group ref={head} position={[0, 1.5, 0.02]}>
          <mesh position={[0, 0.11, 0]} material={mats.skin}>
            <boxGeometry args={[0.27, 0.3, 0.27]} />
          </mesh>
          <mesh position={[-0.065, 0.14, 0.137]} material={mats.eye}>
            <boxGeometry args={[0.055, 0.035, 0.01]} />
          </mesh>
          <mesh position={[0.065, 0.14, 0.137]} material={mats.eye}>
            <boxGeometry args={[0.055, 0.035, 0.01]} />
          </mesh>
          {/* jaw */}
          <mesh position={[0, 0.0, 0.11]} material={mats.gore}>
            <boxGeometry args={[0.15, 0.04, 0.06]} />
          </mesh>
        </group>
        <group ref={armL} position={[-0.31, 1.4, 0]}>
          <mesh position={[0, -0.18, 0]} material={mats.shirt}>
            <boxGeometry args={[0.13, 0.36, 0.13]} />
          </mesh>
          <mesh position={[0, -0.5, 0]} material={mats.skin}>
            <boxGeometry args={[0.11, 0.32, 0.11]} />
          </mesh>
        </group>
        <group ref={armR} position={[0.31, 1.4, 0]}>
          <mesh position={[0, -0.18, 0]} material={mats.shirt}>
            <boxGeometry args={[0.13, 0.36, 0.13]} />
          </mesh>
          <mesh position={[0, -0.5, 0]} material={mats.skin}>
            <boxGeometry args={[0.11, 0.32, 0.11]} />
          </mesh>
        </group>
      </group>
      <group ref={legL} position={[-0.12, 0.86, 0]}>
        <mesh position={[0, -0.42, 0]} material={mats.pants}>
          <boxGeometry args={[0.16, 0.84, 0.18]} />
        </mesh>
      </group>
      <group ref={legR} position={[0.12, 0.86, 0]}>
        <mesh position={[0, -0.42, 0]} material={mats.pants}>
          <boxGeometry args={[0.16, 0.84, 0.18]} />
        </mesh>
      </group>
    </group>
  );
}

export default function Zombies({ game }: { game: GameRef }) {
  const [list, setList] = useState<Zombie[]>(() => [...game.current.zombies]);
  const ids = useRef("");
  useFrame(() => {
    const key = game.current.zombies.map((z) => z.id).join(",");
    if (key !== ids.current) {
      ids.current = key;
      setList([...game.current.zombies]);
    }
  });
  return (
    <group>
      {list.map((z) => (
        <ZombieModel key={z.id} zombie={z} />
      ))}
    </group>
  );
}

