// Low-poly guns built from boxes and cylinders, one silhouette per kind of weapon. The muzzle points
// down -z, the grip sits near the origin. Used in your hands, in the Mystery Box and on the Upgrade Station.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WEAPONS, type WeaponClass, type WeaponId } from "../engine/weapons";

type V3 = [number, number, number];

interface Part {
  shape: "box" | "cyl" | "torus";
  size: V3;
  at: V3;
  rot?: V3;
  mat: "metal" | "wood" | "accent" | "glow" | "dark";
}

const box = (size: V3, at: V3, mat: Part["mat"] = "metal", rot?: V3): Part => ({ shape: "box", size, at, rot, mat });
/** Cylinder along z: size = [radius, radius, length]. */
const cyl = (r: number, len: number, at: V3, mat: Part["mat"] = "metal", rot?: V3): Part => ({
  shape: "cyl", size: [r, r, len], at, rot: rot ?? [Math.PI / 2, 0, 0], mat,
});

const PARTS: Record<WeaponClass, Part[]> = {
  pistol: [
    box([0.034, 0.034, 0.2], [0, 0.036, -0.07]),
    box([0.036, 0.008, 0.05], [0, 0.04, -0.005], "dark"),
    box([0.012, 0.012, 0.035], [0.012, 0.05, -0.08], "dark"),
    box([0.03, 0.024, 0.15], [0, 0.009, -0.05], "dark"),
    box([0.03, 0.112, 0.046], [0, -0.046, 0.022], "dark", [0.22, 0, 0]),
    box([0.004, 0.03, 0.05], [0, -0.012, -0.045], "dark"),
    box([0.007, 0.012, 0.007], [0, 0.058, -0.165]),
    box([0.022, 0.01, 0.007], [0, 0.057, 0.025]),
    box([0.012, 0.018, 0.012], [0, 0.05, 0.036], "dark", [-0.5, 0, 0]),
    cyl(0.008, 0.012, [0, 0.032, -0.172], "dark"),
  ],
  rifle: [
    box([0.05, 0.065, 0.3], [0, 0.02, -0.1]),
    box([0.056, 0.05, 0.22], [0, 0.015, -0.33], "wood"),
    cyl(0.012, 0.3, [0, 0.035, -0.55]),
    box([0.045, 0.072, 0.18], [0, -0.006, 0.13], "wood", [-0.08, 0, 0]),
    box([0.028, 0.12, 0.05], [0, -0.07, -0.13], "dark", [0.18, 0, 0]),
    box([0.03, 0.1, 0.04], [0, -0.06, 0.03], "wood", [0.3, 0, 0]),
    box([0.008, 0.02, 0.008], [0, 0.065, -0.66]),
  ],
  smg: [
    box([0.05, 0.065, 0.26], [0, 0.02, -0.08]),
    cyl(0.014, 0.16, [0, 0.03, -0.29]),
    box([0.026, 0.18, 0.042], [0, -0.09, -0.11], "dark"),
    box([0.03, 0.1, 0.04], [0, -0.05, 0.03], "dark", [0.3, 0, 0]),
    box([0.012, 0.04, 0.2], [0, 0.03, 0.15], "dark"),
    box([0.008, 0.018, 0.008], [0, 0.062, -0.2], "accent"),
  ],
  shotgun: [
    cyl(0.017, 0.58, [-0.017, 0.035, -0.38]),
    cyl(0.017, 0.58, [0.017, 0.035, -0.38]),
    box([0.06, 0.06, 0.16], [0, 0.015, -0.03]),
    box([0.06, 0.045, 0.2], [0, 0.0, -0.3], "wood"),
    box([0.05, 0.08, 0.2], [0, -0.022, 0.15], "wood", [-0.12, 0, 0]),
  ],
  lmg: [
    box([0.075, 0.085, 0.36], [0, 0.02, -0.1]),
    cyl(0.018, 0.42, [0, 0.03, -0.48]),
    cyl(0.075, 0.07, [0, -0.08, -0.1], "dark", [0, 0, Math.PI / 2]),
    box([0.05, 0.08, 0.18], [0, 0.0, 0.15], "dark"),
    box([0.03, 0.11, 0.04], [0, -0.06, 0.06], "dark", [0.3, 0, 0]),
    box([0.08, 0.02, 0.12], [0, 0.07, -0.12], "accent"),
  ],
  sniper: [
    box([0.05, 0.06, 0.32], [0, 0.015, -0.08]),
    cyl(0.013, 0.48, [0, 0.03, -0.48]),
    box([0.055, 0.07, 0.2], [0, -0.01, 0.15], "wood", [-0.06, 0, 0]),
    cyl(0.024, 0.24, [0, 0.095, -0.08], "dark"),
    cyl(0.03, 0.03, [0, 0.095, -0.2], "dark"),
    box([0.012, 0.035, 0.012], [0, 0.07, -0.02]),
    box([0.03, 0.1, 0.04], [0, -0.05, 0.04], "wood", [0.3, 0, 0]),
  ],
  revolver: [
    cyl(0.016, 0.2, [0, 0.04, -0.15]),
    cyl(0.032, 0.05, [0, 0.032, -0.02], "dark"),
    box([0.03, 0.04, 0.08], [0, 0.025, 0.02]),
    box([0.034, 0.12, 0.05], [0, -0.05, 0.05], "wood", [0.35, 0, 0]),
    box([0.008, 0.016, 0.008], [0, 0.062, -0.24]),
  ],
  wonder: [
    box([0.06, 0.08, 0.26], [0, 0.02, -0.06], "accent"),
    cyl(0.03, 0.18, [0, 0.03, -0.27], "metal"),
    { shape: "torus", size: [0.045, 0.008, 0], at: [0, 0.03, -0.22], mat: "glow" },
    { shape: "torus", size: [0.045, 0.008, 0], at: [0, 0.03, -0.3], mat: "glow" },
    { shape: "torus", size: [0.04, 0.008, 0], at: [0, 0.03, -0.37], mat: "glow" },
    box([0.03, 0.03, 0.03], [0, 0.03, -0.39], "glow"),
    box([0.032, 0.11, 0.045], [0, -0.05, 0.03], "dark", [0.25, 0, 0]),
    box([0.05, 0.03, 0.12], [0, 0.08, -0.04], "glow"),
  ],
};

export function GunModel({ id, upgraded = false, glow = 1 }: { id: WeaponId; upgraded?: boolean; glow?: number }) {
  const def = WEAPONS[id];
  const mats = useMemo(() => {
    const camo = upgraded ? new THREE.Color("#7c3aed") : new THREE.Color("#000000");
    // Low metalness: there's no environment to reflect, and fully metallic parts would render black.
    const metal = new THREE.MeshStandardMaterial({ color: "#5d636b", metalness: 0.35, roughness: 0.42, emissive: camo, emissiveIntensity: upgraded ? 0.45 : 0 });
    const dark = new THREE.MeshStandardMaterial({ color: "#2c2e33", metalness: 0.2, roughness: 0.6, emissive: camo, emissiveIntensity: upgraded ? 0.3 : 0 });
    const wood = new THREE.MeshStandardMaterial({ color: upgraded ? "#5b347d" : "#7a4f2c", roughness: 0.7 });
    const accent = new THREE.MeshStandardMaterial({ color: def.color, metalness: 0.25, roughness: 0.45, emissive: camo, emissiveIntensity: upgraded ? 0.4 : 0 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: upgraded ? "#ff5cf4" : "#58e1ff", emissive: upgraded ? "#ff5cf4" : "#58e1ff", emissiveIntensity: 2.2 * glow, toneMapped: false,
    });
    return { metal, dark, wood, accent, glow: glowMat };
  }, [def.color, upgraded, glow]);
  const pulse = useRef(0);
  useFrame((_, dt) => {
    if (!upgraded) return;
    pulse.current += dt;
    const k = 0.3 + Math.sin(pulse.current * 3) * 0.15;
    mats.metal.emissiveIntensity = k;
    mats.accent.emissiveIntensity = k;
  });
  return (
    <group>
      {PARTS[def.cls].map((p, i) => (
        <mesh key={i} position={p.at} rotation={p.rot ?? [0, 0, 0]} material={mats[p.mat]}>
          {p.shape === "box" && <boxGeometry args={p.size} />}
          {p.shape === "cyl" && <cylinderGeometry args={[p.size[0], p.size[1], p.size[2], 10]} />}
          {p.shape === "torus" && <torusGeometry args={[p.size[0], p.size[1], 6, 16]} />}
        </mesh>
      ))}
    </group>
  );
}
