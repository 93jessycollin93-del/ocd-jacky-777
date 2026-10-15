// First person: the camera rig (bob, recoil, shake, aim zoom) and the gun in your hands. The gun is
// drawn in its own overlay scene (drei's Hud) so it never pokes through walls.
import { useMemo, useRef, useState, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Hud, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { currentWeapon, type GameState } from "../engine/game";
import { EYE_HEIGHT } from "../engine/map";
import { WEAPONS, type WeaponId } from "../engine/weapons";
import { GunModel } from "./GunModel";
import { MUZZLE } from "./muzzle";
import { flashTexture } from "./textures";

type GameRef = MutableRefObject<GameState>;

/** Moves the world camera with the player. */
export function CameraRig({ game, fov }: { game: GameRef; fov: number }) {
  const { camera } = useThree();
  const bob = useRef({ phase: 0, amount: 0 });
  useFrame((_, dt) => {
    const g = game.current;
    const p = g.player;
    const b = bob.current;
    const speed = Math.hypot(p.vx, p.vz);
    b.amount = THREE.MathUtils.damp(b.amount, p.y <= 0 && speed > 0.5 ? Math.min(1, speed / 6) : 0, 8, dt);
    b.phase += dt * (p.sprinting ? 13 : 9) * (speed > 0.5 ? 1 : 0);
    const shake = g.shake * g.shake;
    const sx = (Math.random() - 0.5) * shake * 0.25;
    const sy = (Math.random() - 0.5) * shake * 0.25;
    const down = p.downed > 0 || g.phase === "over";
    camera.position.set(
      p.x,
      down ? 0.55 : EYE_HEIGHT + p.y + Math.abs(Math.sin(b.phase)) * 0.045 * b.amount * (p.sprinting ? 1.6 : 1) * (1 - p.ads * 0.8),
      p.z,
    );
    camera.rotation.order = "YXZ";
    camera.rotation.set(p.pitch + p.kick * 0.5 + sy, p.yaw + Math.PI + sx, down ? 0.35 : Math.sin(b.phase * 0.5) * 0.004 * b.amount);
    // Aiming zooms in (a lot, through a scope); sprinting widens the view a touch.
    const w = currentWeapon(g);
    const adsFov = w && WEAPONS[w.id].cls === "sniper" ? 26 : 56;
    const target = THREE.MathUtils.lerp(p.sprinting ? fov + 6 : fov, adsFov, p.ads);
    const cam = camera as THREE.PerspectiveCamera;
    if (Math.abs(cam.fov - target) > 0.05) {
      cam.fov = THREE.MathUtils.damp(cam.fov, target, 14, dt);
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

function Knife({ game }: { game: GameRef }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const m = game.current.player.melee;
    const g = ref.current;
    if (!g) return;
    g.visible = m > 0;
    if (m <= 0) return;
    const k = 1 - m / 0.6; // 0 → 1 over the slash
    const slash = Math.sin(Math.min(1, k * 1.6) * Math.PI);
    g.position.set(0.32 - slash * 0.45, -0.22 + slash * 0.08, -0.42 - slash * 0.12);
    g.rotation.set(-0.4, 0.9 - slash * 1.3, -0.6 + slash * 0.9);
  });
  return (
    <group ref={ref} visible={false}>
      <mesh position={[0, 0, -0.12]}>
        <boxGeometry args={[0.012, 0.035, 0.2]} />
        <meshStandardMaterial color="#c7ccd2" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[0.026, 0.04, 0.1]} />
        <meshStandardMaterial color="#2b1d12" roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.01, 0.06]}>
        <boxGeometry args={[0.07, 0.07, 0.11]} />
        <meshStandardMaterial color="#c49a7c" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Bottle({ game }: { game: GameRef }) {
  const ref = useRef<THREE.Group>(null);
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d1352b", emissive: "#d1352b", emissiveIntensity: 0.6, transparent: true, opacity: 0.9 }), []);
  useFrame(() => {
    const d = game.current.player.drink;
    const g = ref.current;
    if (!g) return;
    g.visible = d > 0;
    if (d <= 0) return;
    const k = 1 - d / 1.5;
    const up = Math.sin(Math.min(1, k * 1.3) * Math.PI);
    g.position.set(0.05, -0.32 + up * 0.22, -0.32);
    g.rotation.set(0.3 + up * 1.2, 0, -0.2);
  });
  return (
    <group ref={ref} visible={false}>
      <mesh material={glass}>
        <cylinderGeometry args={[0.035, 0.04, 0.16, 10]} />
      </mesh>
      <mesh position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.012, 0.018, 0.07, 8]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      <mesh position={[0, -0.04, 0.05]}>
        <boxGeometry args={[0.08, 0.1, 0.07]} />
        <meshStandardMaterial color="#c49a7c" roughness={0.8} />
      </mesh>
    </group>
  );
}

function HeldGun({ game }: { game: GameRef }) {
  const holder = useRef<THREE.Group>(null);
  const flash = useRef<THREE.Sprite>(null);
  const light = useRef<THREE.PointLight>(null);
  const sway = useRef({ yaw: 0, pitch: 0, x: 0, y: 0, bob: 0 });
  const [held, setHeld] = useState<{ id: WeaponId; up: boolean } | null>(() => {
    const w = currentWeapon(game.current);
    return w ? { id: w.id, up: w.upgraded } : null;
  });
  const heldRef = useRef(held);
  const flashTex = useMemo(() => flashTexture(), []);

  useFrame(({ clock }, dt) => {
    const g = game.current;
    const p = g.player;
    const w = currentWeapon(g);
    const want = w ? { id: w.id, up: w.upgraded } : null;
    if (want?.id !== heldRef.current?.id || want?.up !== heldRef.current?.up) {
      heldRef.current = want;
      setHeld(want);
    }
    const h = holder.current;
    if (!h) return;
    const s = sway.current;
    // Lag behind the view a little when you turn.
    const dYaw = p.yaw - s.yaw;
    const dPitch = p.pitch - s.pitch;
    s.yaw = p.yaw;
    s.pitch = p.pitch;
    const k = 1 - p.ads * 0.85;
    s.x = THREE.MathUtils.damp(s.x, THREE.MathUtils.clamp(dYaw * 1.6, -0.06, 0.06) * k, 10, dt);
    s.y = THREE.MathUtils.damp(s.y, THREE.MathUtils.clamp(-dPitch * 1.6, -0.06, 0.06) * k, 10, dt);
    const speed = Math.hypot(p.vx, p.vz);
    s.bob += dt * (p.sprinting ? 12 : 8.5) * (speed > 0.5 ? 1 : 0);
    const bobAmt = Math.min(1, speed / 5) * k;
    const breathe = Math.sin(clock.elapsedTime * 1.6) * 0.004 * k;

    const def = w ? WEAPONS[w.id] : null;
    // Long guns sit further out so the stock stays out of your face.
    const long = def && def.cls !== "pistol" && def.cls !== "revolver" && def.cls !== "wonder";
    const hip = new THREE.Vector3(0.17, -0.19, long ? -0.56 : -0.46);
    const ads = new THREE.Vector3(0, def?.cls === "pistol" || def?.cls === "revolver" ? -0.088 : -0.098, long ? -0.36 : -0.3);
    const pos = hip.lerp(ads, p.ads);
    let rx = 0;
    let ry = 0;
    let rz = 0;
    pos.x += s.x + Math.sin(s.bob) * 0.012 * bobAmt;
    pos.y += s.y + Math.abs(Math.cos(s.bob)) * 0.012 * bobAmt + breathe;
    // Recoil: back and up.
    pos.z += p.kick * 1.4;
    rx += p.kick * 2.6;
    // Sprinting: gun swings down and across.
    const sprint = p.sprinting ? 1 : 0;
    pos.x -= sprint * 0.05;
    pos.y -= sprint * 0.05;
    ry += sprint * 0.75;
    rx -= sprint * 0.25;
    // Reloading: tip down and in, then back.
    if (p.reload > 0 && def) {
      const total = def.reload * (p.perks.includes("hands") ? 0.5 : 1);
      const r = 1 - p.reload / total;
      const dip = Math.sin(Math.min(1, r) * Math.PI);
      rx -= dip * 0.75;
      rz += dip * 0.5;
      pos.y -= dip * 0.1;
    }
    // Swapping or busy: drop out of view.
    const away = Math.max(p.swap / 0.55, p.drink > 0 ? 1 : 0, p.melee > 0 ? 0.6 : 0, p.downed > 0 ? 0.5 : 0, g.phase === "over" ? 1 : 0);
    pos.y -= away * 0.35;
    rx -= away * 0.6;
    h.position.copy(pos);
    h.rotation.set(rx, ry, rz);
    // Scoped rifles hide the gun when fully aimed (the HUD draws the scope).
    h.visible = !!w && !(def?.cls === "sniper" && p.ads > 0.92);

    // Muzzle flash for a couple of frames after each shot.
    const since = g.time - p.shotAt;
    const on = since >= 0 && since < 0.05 && !!def;
    if (flash.current) {
      flash.current.visible = on;
      if (on && def) {
        flash.current.position.set(0, 0.035, -MUZZLE[def.cls] - 0.04);
        const sc = (def.cls === "shotgun" || def.cls === "lmg" ? 0.32 : def.cls === "pistol" ? 0.16 : 0.24) * (0.8 + Math.random() * 0.4);
        flash.current.scale.set(sc, sc, 1);
        flash.current.material.rotation = Math.random() * Math.PI;
        flash.current.material.color.set(def.cls === "wonder" ? (w?.upgraded ? "#ff5cf4" : "#58e1ff") : "#ffe2a8");
      }
    }
    if (light.current) light.current.intensity = on ? 3 : 0;
  });

  return (
    <group ref={holder}>
      {held && (
        <group>
          <GunModel id={held.id} upgraded={held.up} />
          {/* gloved hand on the grip, and a sleeve running back out of view */}
          <mesh position={[0.004, -0.07, 0.035]} rotation-x={0.25}>
            <boxGeometry args={[0.05, 0.07, 0.09]} />
            <meshStandardMaterial color="#3a332c" roughness={0.9} />
          </mesh>
          <mesh position={[0.03, -0.11, 0.13]} rotation-x={0.55}>
            <boxGeometry args={[0.06, 0.06, 0.16]} />
            <meshStandardMaterial color="#4a5640" roughness={0.95} />
          </mesh>
          {WEAPONS[held.id].cls !== "pistol" && WEAPONS[held.id].cls !== "revolver" && (
            <mesh position={[-0.01, -0.03, -0.27]} rotation={[0.2, 0, 0.5]}>
              <boxGeometry args={[0.055, 0.05, 0.1]} />
              <meshStandardMaterial color="#3a332c" roughness={0.9} />
            </mesh>
          )}
        </group>
      )}
      <sprite ref={flash} visible={false}>
        <spriteMaterial map={flashTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <pointLight ref={light} position={[0, 0.05, -0.5]} color="#ffcf7a" intensity={0} distance={2} />
    </group>
  );
}

/** The gun overlay: its own scene and camera, drawn after the world. */
export function ViewModel({ game }: { game: GameRef }) {
  return (
    <Hud renderPriority={1}>
      <PerspectiveCamera makeDefault fov={55} near={0.01} far={10} position={[0, 0, 0]} />
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#ffe2bf", "#2a2420", 0.9]} />
      <directionalLight position={[1, 2, 1.5]} intensity={1.6} color="#ffe9cf" />
      <directionalLight position={[-1.5, 0.5, -1]} intensity={0.5} color="#7f95c9" />
      <HeldGun game={game} />
      <Knife game={game} />
      <Bottle game={game} />
    </Hud>
  );
}
