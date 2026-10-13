// The level: floors, walls, ceilings, boarded windows, debris doors, chalk wall-guns, perk machines,
// the Mystery Box, the Upgrade Station, the power switch, and the room lights.
import { useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ARENA, type GameState } from "../engine/game";
import { CELL, MAX_BOARDS, WALL_HEIGHT, cellCenter, type Spot } from "../engine/map";
import { PERKS, WEAPONS, WEAPON_IDS, type WeaponId } from "../engine/weapons";
import { GunModel } from "./GunModel";
import { boxTexture, chalkTexture, glowTexture, perkSign, signTexture, surface, type Surface } from "./textures";

type GameRef = MutableRefObject<GameState>;

const ZONE_LOOK: Record<string, { floor: Surface; wall: string; ceiling: string }> = {
  Lobby: { floor: "wood_floor", wall: "#b59a84", ceiling: "#6b5440" },
  "Dining Hall": { floor: "tile_floor", wall: "#9fae94", ceiling: "#5e5a4c" },
  Chapel: { floor: "stone", wall: "#9aa3b8", ceiling: "#4a4650" },
  Workshop: { floor: "concrete", wall: "#a3a39a", ceiling: "#4d4d4a" },
};
const lookOf = (zone: number) => ZONE_LOOK[ARENA.zoneNames[zone]] ?? ZONE_LOOK.Lobby;

/** The cells of each room, as rectangles (every room on this map is one). */
function zoneRects() {
  const rects: { zone: number; x0: number; z0: number; x1: number; z1: number }[] = [];
  ARENA.zoneNames.forEach((_, zone) => {
    let x0 = Infinity;
    let z0 = Infinity;
    let x1 = -Infinity;
    let z1 = -Infinity;
    for (let z = 0; z < ARENA.h; z++) {
      for (let x = 0; x < ARENA.w; x++) {
        if (ARENA.zone[z * ARENA.w + x] !== zone) continue;
        x0 = Math.min(x0, x);
        z0 = Math.min(z0, z);
        x1 = Math.max(x1, x);
        z1 = Math.max(z1, z);
      }
    }
    rects.push({ zone, x0, z0, x1, z1 });
  });
  return rects;
}

function tiled(kind: Surface, rx: number, ry: number) {
  const t = surface(kind).clone();
  t.needsUpdate = true;
  t.repeat.set(rx, ry);
  return t;
}

/** Facing vector → rotation about y so local +z points that way. */
const yawOf = (f: { x: number; z: number }) => Math.atan2(f.x, f.z);

// ---------------------------------------------------------------- floors, ceilings, walls

function Shell() {
  const rects = useMemo(zoneRects, []);
  const wallRef = useRef<THREE.InstancedMesh>(null);
  const walls = useMemo(() => {
    const out: { x: number; z: number; color: string }[] = [];
    for (let z = 0; z < ARENA.h; z++) {
      for (let x = 0; x < ARENA.w; x++) {
        if (ARENA.tiles[z * ARENA.w + x] !== "wall") continue;
        // Tint by the room it faces.
        let color = "#8f8478";
        for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const zn = ARENA.zone[(z + dz) * ARENA.w + (x + dx)];
          if (zn >= 0 && z + dz >= 0 && z + dz < ARENA.h && x + dx >= 0 && x + dx < ARENA.w) {
            color = lookOf(zn).wall;
            break;
          }
        }
        out.push({ x, z, color });
      }
    }
    return out;
  }, []);
  const wallMat = useMemo(() => {
    const t = tiled("wallpaper", 1, WALL_HEIGHT / CELL);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 });
  }, []);
  useLayoutEffect(() => {
    const m = wallRef.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    walls.forEach((w, i) => {
      o.position.set(cellCenter(w.x), WALL_HEIGHT / 2, cellCenter(w.z));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(w.color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [walls]);

  // Door cells get a strip of floor and ceiling so open doorways look finished.
  const doorCells = useMemo(() => ARENA.doors.flatMap((d) => d.cells), []);

  return (
    <group>
      {/* the yard outside */}
      <mesh rotation-x={-Math.PI / 2} position={[(ARENA.w * CELL) / 2, -0.02, (ARENA.h * CELL) / 2]}>
        <planeGeometry args={[ARENA.w * CELL + 80, ARENA.h * CELL + 80]} />
        <meshStandardMaterial map={tiled("dirt", (ARENA.w + 40) / 2, (ARENA.h + 40) / 2)} roughness={1} />
      </mesh>
      {rects.map((r) => {
        const w = (r.x1 - r.x0 + 1) * CELL;
        const d = (r.z1 - r.z0 + 1) * CELL;
        const cx = r.x0 * CELL + w / 2;
        const cz = r.z0 * CELL + d / 2;
        const look = lookOf(r.zone);
        return (
          <group key={r.zone}>
            <mesh rotation-x={-Math.PI / 2} position={[cx, 0, cz]}>
              <planeGeometry args={[w, d]} />
              <meshStandardMaterial map={tiled(look.floor, w / CELL, d / CELL)} roughness={0.85} />
            </mesh>
            <mesh rotation-x={Math.PI / 2} position={[cx, WALL_HEIGHT, cz]}>
              <planeGeometry args={[w, d]} />
              <meshStandardMaterial map={tiled("ceiling", w / CELL, d / CELL)} color={look.ceiling} roughness={1} />
            </mesh>
            {/* beams */}
            {Array.from({ length: Math.floor(w / (CELL * 2)) }, (_, i) => (
              <mesh key={i} position={[r.x0 * CELL + (i + 1) * CELL * 2, WALL_HEIGHT - 0.12, cz]}>
                <boxGeometry args={[0.22, 0.24, d]} />
                <meshStandardMaterial color="#2e2118" roughness={1} />
              </mesh>
            ))}
          </group>
        );
      })}
      {doorCells.map(([x, z]) => (
        <group key={`${x},${z}`}>
          <mesh rotation-x={-Math.PI / 2} position={[cellCenter(x), 0.001, cellCenter(z)]}>
            <planeGeometry args={[CELL, CELL]} />
            <meshStandardMaterial map={surface("wood_floor")} roughness={0.9} />
          </mesh>
          <mesh rotation-x={Math.PI / 2} position={[cellCenter(x), WALL_HEIGHT, cellCenter(z)]}>
            <planeGeometry args={[CELL, CELL]} />
            <meshStandardMaterial color="#2a201a" />
          </mesh>
        </group>
      ))}
      <instancedMesh ref={wallRef} args={[undefined, undefined, walls.length]} material={wallMat}>
        <boxGeometry args={[CELL, WALL_HEIGHT, CELL]} />
      </instancedMesh>
      <BloodAndGrime />
    </group>
  );
}

/** Blood smears on the floors, placed once from a fixed seed. One instanced mesh. */
function BloodAndGrime() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const decals = useMemo(() => {
    const out: { x: number; z: number; r: number; s: number }[] = [];
    let seed = 1337;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(rnd() * ARENA.w);
      const z = Math.floor(rnd() * ARENA.h);
      if (ARENA.tiles[z * ARENA.w + x] !== "floor") continue;
      out.push({ x: cellCenter(x) + (rnd() - 0.5), z: cellCenter(z) + (rnd() - 0.5), r: rnd() * Math.PI, s: 0.6 + rnd() * 1.4 });
    }
    return out;
  }, []);
  const mat = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d")!;
    for (let i = 0; i < 9; i++) {
      const x = 32 + Math.sin(i * 2.3) * 18;
      const y = 32 + Math.cos(i * 1.7) * 14;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 6 + (i % 4) * 5);
      g.addColorStop(0, "rgba(70,6,6,0.85)");
      g.addColorStop(1, "rgba(50,4,4,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 0.4 });
  }, []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    decals.forEach((d, i) => {
      o.position.set(d.x, 0.004 + i * 0.0001, d.z);
      o.rotation.set(-Math.PI / 2, 0, d.r);
      o.scale.setScalar(d.s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [decals]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, decals.length]} material={mat}>
      <planeGeometry args={[1, 1]} />
    </instancedMesh>
  );
}

// ---------------------------------------------------------------- windows

/**
 * Every window: the wall around the opening, the sill, and the boards (shown as many as are still
 * nailed up). Three instanced meshes for the whole map, so dozens of windows cost three draw calls.
 */
function Windows({ game }: { game: GameRef }) {
  const frameRef = useRef<THREE.InstancedMesh>(null);
  const sillRef = useRef<THREE.InstancedMesh>(null);
  const boardRef = useRef<THREE.InstancedMesh>(null);
  const boardKey = useRef("");
  const post = 0.32;
  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ map: tiled("wallpaper", 1, 0.5), roughness: 0.92 }), []);
  const sillMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3a2a1c", roughness: 0.8 }), []);
  const boardMat = useMemo(() => new THREE.MeshStandardMaterial({ map: surface("board"), roughness: 0.9 }), []);
  // Board heights and tilts, so they look nailed up by hand.
  const layout = useMemo(
    () => Array.from({ length: MAX_BOARDS }, (_, i) => ({ y: 1.0 + i * 0.22 + (i % 2) * 0.03, tilt: (((i * 37) % 11) - 5) * 0.035 })),
    [],
  );

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const sill = sillRef.current;
    if (!frame || !sill) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    ARENA.windows.forEach((w, i) => {
      const cx = cellCenter(w.cx);
      const cz = cellCenter(w.cz);
      const alongX = w.normal.x === 0; // the wall runs along x
      // [offset along the wall, centre height, width along the wall, height]
      const parts: [number, number, number, number][] = [
        [0, 0.45, CELL, 0.9],
        [0, (2.4 + WALL_HEIGHT) / 2, CELL, WALL_HEIGHT - 2.4],
        [-(CELL / 2 - post / 2), 1.65, post, 1.5],
        [CELL / 2 - post / 2, 1.65, post, 1.5],
      ];
      parts.forEach(([off, y, width, height], k) => {
        o.position.set(cx + (alongX ? off : 0), y, cz + (alongX ? 0 : off));
        o.rotation.set(0, 0, 0);
        o.scale.set(alongX ? width : CELL, height, alongX ? CELL : width);
        o.updateMatrix();
        frame.setMatrixAt(i * 4 + k, o.matrix);
        frame.setColorAt(i * 4 + k, c.set(lookOf(w.zone).wall));
      });
      o.position.set(cx, 0.92, cz);
      o.scale.set(alongX ? CELL : CELL + 0.1, 0.06, alongX ? CELL + 0.1 : CELL);
      o.updateMatrix();
      sill.setMatrixAt(i, o.matrix);
    });
    frame.instanceMatrix.needsUpdate = true;
    if (frame.instanceColor) frame.instanceColor.needsUpdate = true;
    sill.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(() => {
    const boards = game.current.boards;
    const key = boards.join(",");
    const m = boardRef.current;
    if (!m || key === boardKey.current) return;
    boardKey.current = key;
    const o = new THREE.Object3D();
    ARENA.windows.forEach((w, i) => {
      const alongX = w.normal.x === 0;
      layout.forEach((b, k) => {
        // Boards sit on the inside face of the opening.
        o.position.set(cellCenter(w.cx) - w.normal.x * 0.55, b.y, cellCenter(w.cz) - w.normal.z * 0.55);
        o.rotation.set(0, alongX ? 0 : Math.PI / 2, b.tilt);
        o.scale.setScalar(k < boards[i] ? 1 : 0);
        o.updateMatrix();
        m.setMatrixAt(i * MAX_BOARDS + k, o.matrix);
      });
    });
    m.instanceMatrix.needsUpdate = true;
  });

  const n = ARENA.windows.length;
  return (
    <group>
      <instancedMesh ref={frameRef} args={[undefined, undefined, n * 4]} material={frameMat}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      <instancedMesh ref={sillRef} args={[undefined, undefined, n]} material={sillMat}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      <instancedMesh ref={boardRef} args={[undefined, undefined, n * MAX_BOARDS]} material={boardMat} frustumCulled={false}>
        <boxGeometry args={[1.62, 0.17, 0.05]} />
      </instancedMesh>
    </group>
  );
}

// ---------------------------------------------------------------- doors

function DoorBlock({ id }: { id: number }) {
  const door = ARENA.doors.find((d) => d.id === id)!;
  const xs = door.cells.map((c) => c[0]);
  const zs = door.cells.map((c) => c[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const z0 = Math.min(...zs);
  const z1 = Math.max(...zs);
  const cx = ((x0 + x1 + 1) / 2) * CELL;
  const cz = ((z0 + z1 + 1) / 2) * CELL;
  const alongX = x1 > x0; // the doorway runs along x
  const width = ((alongX ? x1 - x0 : z1 - z0) + 1) * CELL;
  const plankMat = useMemo(() => new THREE.MeshStandardMaterial({ map: surface("board"), roughness: 0.9 }), []);
  const doorMat = useMemo(() => new THREE.MeshStandardMaterial({ map: surface("wood_floor"), color: "#8a6a4a", roughness: 0.85 }), []);
  const sign = useMemo(
    () => signTexture([{ text: `${door.cost}`, size: 52, color: "#ffd166" }, { text: "CLEAR DEBRIS", size: 20, color: "#e8e1d0" }], "#1a1410", "#5a4632"),
    [door.cost],
  );
  return (
    <group position={[cx, 0, cz]} rotation-y={alongX ? 0 : Math.PI / 2}>
      {/* a heavy door slab with planks nailed across */}
      <mesh position={[0, WALL_HEIGHT / 2, 0]} material={doorMat}>
        <boxGeometry args={[width, WALL_HEIGHT, 0.3]} />
      </mesh>
      {[0.6, 1.4, 2.2].map((y, i) => (
        <group key={y}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[0, y, side * 0.19]} rotation-z={(i - 1) * 0.25 * side} material={plankMat}>
              <boxGeometry args={[width * 0.95, 0.2, 0.06]} />
            </mesh>
          ))}
        </group>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 1.75, side * 0.24]} rotation-y={side > 0 ? 0 : Math.PI}>
          <planeGeometry args={[1.3, 0.65]} />
          <meshBasicMaterial map={sign} toneMapped={false} />
        </mesh>
      ))}
      {/* rubble at the foot */}
      {[-0.7, 0.2, 0.9].map((x, i) => (
        <mesh key={x} position={[x * (width / 4), 0.18, (i % 2 ? 1 : -1) * 0.35]} rotation={[0.3 * i, 0.7 * i, 0.2]}>
          <boxGeometry args={[0.5, 0.36, 0.4]} />
          <meshStandardMaterial color="#5b5148" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- things on the walls

function WallBuy({ spot }: { spot: Spot }) {
  const tex = useMemo(() => chalkTexture(spot.weapon!), [spot.weapon]);
  const x = cellCenter(spot.cx) - spot.facing.x * (CELL / 2 - 0.012);
  const z = cellCenter(spot.cz) - spot.facing.z * (CELL / 2 - 0.012);
  return (
    <mesh position={[x, 1.55, z]} rotation-y={yawOf(spot.facing)}>
      <planeGeometry args={[1.5, 0.94]} />
      <meshStandardMaterial map={tex} transparent roughness={1} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.18} />
    </mesh>
  );
}

function PerkMachine({ game, spot }: { game: GameRef; spot: Spot }) {
  const perk = spot.perk!;
  const sign = useMemo(() => perkSign(perk), [perk]);
  const color = useMemo(() => new THREE.Color(PERKS[perk].color), [perk]);
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.55), roughness: 0.5, metalness: 0.3 }), [color]);
  const signMat = useMemo(() => new THREE.MeshStandardMaterial({ map: sign, emissive: "#ffffff", emissiveMap: sign, emissiveIntensity: 0.15 }), [sign]);
  const strip = useMemo(() => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.1, toneMapped: false }), [color]);
  const glow = useRef<THREE.Sprite>(null);
  useFrame(({ clock }) => {
    const on = game.current.power || perk === "wind";
    const flicker = on ? 1 + Math.sin(clock.elapsedTime * 7 + spot.id) * 0.06 : 0;
    signMat.emissiveIntensity = on ? 1.1 * flicker : 0.12;
    strip.emissiveIntensity = on ? 2.2 * flicker : 0.1;
    if (glow.current) glow.current.visible = on;
  });
  return (
    <group position={[cellCenter(spot.cx), 0, cellCenter(spot.cz)]} rotation-y={yawOf(spot.facing)}>
      <mesh position={[0, 1.05, -0.15]} material={body}>
        <boxGeometry args={[1.15, 2.1, 0.85]} />
      </mesh>
      <mesh position={[0, 1.78, 0.28]} material={signMat}>
        <planeGeometry args={[1.0, 0.5]} />
      </mesh>
      <mesh position={[0, 0.95, 0.285]}>
        <planeGeometry args={[0.7, 0.9]} />
        <meshStandardMaterial color="#14161a" roughness={0.15} metalness={0.2} />
      </mesh>
      {/* bottles behind the glass */}
      {[-0.2, 0, 0.2].map((x) => (
        <mesh key={x} position={[x, 0.85, 0.22]} material={strip}>
          <cylinderGeometry args={[0.05, 0.05, 0.28, 8]} />
        </mesh>
      ))}
      <mesh position={[0, 2.13, 0.05]} material={strip}>
        <boxGeometry args={[1.18, 0.06, 0.6]} />
      </mesh>
      <sprite ref={glow} position={[0, 1.8, 0.5]} scale={[2.2, 1.4, 1]}>
        <spriteMaterial map={glowTexture()} color={color} transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

function PowerSwitch({ game, spot }: { game: GameRef; spot: Spot }) {
  const lever = useRef<THREE.Group>(null);
  const lamp = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ff3b2b", emissive: "#ff3b2b", emissiveIntensity: 2, toneMapped: false }), []);
  const sign = useMemo(() => signTexture([{ text: "POWER", size: 48, color: "#ffd166" }], "#201812", "#806040"), []);
  useFrame((_, dt) => {
    const on = game.current.power;
    if (lever.current) lever.current.rotation.x = THREE.MathUtils.damp(lever.current.rotation.x, on ? -0.9 : 0.9, 8, dt);
    lamp.color.set(on ? "#4ade80" : "#ff3b2b");
    lamp.emissive.set(on ? "#4ade80" : "#ff3b2b");
  });
  const x = cellCenter(spot.cx) - spot.facing.x * (CELL / 2 - 0.1);
  const z = cellCenter(spot.cz) - spot.facing.z * (CELL / 2 - 0.1);
  return (
    <group position={[x, 0, z]} rotation-y={yawOf(spot.facing)}>
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[0.7, 1.0, 0.18]} />
        <meshStandardMaterial map={surface("metal")} color="#8d939a" metalness={0.25} roughness={0.55} />
      </mesh>
      <group ref={lever} position={[0, 1.4, 0.12]}>
        <mesh position={[0, 0.22, 0.04]}>
          <boxGeometry args={[0.06, 0.45, 0.06]} />
          <meshStandardMaterial color="#26262a" metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.45, 0.04]}>
          <boxGeometry args={[0.2, 0.07, 0.08]} />
          <meshStandardMaterial color="#b91c1c" />
        </mesh>
      </group>
      <mesh position={[0.24, 1.78, 0.1]} material={lamp}>
        <sphereGeometry args={[0.045, 8, 6]} />
      </mesh>
      <mesh position={[0, 2.12, 0.02]}>
        <planeGeometry args={[0.8, 0.4]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      {/* cables up to the ceiling */}
      {[-0.2, 0.2].map((cx) => (
        <mesh key={cx} position={[cx, 2.6, -0.02]}>
          <boxGeometry args={[0.04, 1.2, 0.04]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- the Mystery Box

const BOX_POOL = WEAPON_IDS.filter((id) => WEAPONS[id].boxWeight > 0);

function MysteryBox({ game }: { game: GameRef }) {
  const [spotId, setSpotId] = useState(game.current.box.spot);
  const group = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const gunHolder = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const [shown, setShown] = useState<WeaponId | null>(null);
  const shownRef = useRef<WeaponId | null>(null);
  const tex = useMemo(() => boxTexture(), []);
  const cycle = useRef(0);
  useFrame(({ clock }, dt) => {
    const b = game.current.box;
    if (b.spot !== spotId) setSpotId(b.spot);
    const open = b.state === "spinning" || b.state === "ready";
    if (lid.current) lid.current.rotation.x = THREE.MathUtils.damp(lid.current.rotation.x, open ? -1.9 : 0, 6, dt);
    // While spinning, flick through guns; then show the one it picked, sinking as time runs out.
    let next: WeaponId | null = null;
    if (b.state === "spinning") {
      cycle.current += dt * (b.timer > 1 ? 9 : 4);
      next = BOX_POOL[Math.floor(cycle.current) % BOX_POOL.length];
    } else if (b.state === "ready") next = b.weapon;
    if (next !== shownRef.current) {
      shownRef.current = next;
      setShown(next);
    }
    if (gunHolder.current) {
      const rise = b.state === "spinning" ? Math.min(1, (3.6 - b.timer) / 1.2) : b.state === "ready" ? Math.min(1, b.timer / 8) : 0;
      gunHolder.current.position.y = 0.6 + rise * 0.7;
      gunHolder.current.rotation.y = b.state === "spinning" ? clock.elapsedTime * 3 : Math.PI / 2;
    }
    if (group.current) {
      // Flying away: it lifts off and fades.
      const leaving = b.state === "leaving" ? 1 - b.timer / 4 : 0;
      group.current.position.y = leaving * leaving * 6;
      group.current.rotation.y = leaving * 6;
      group.current.visible = leaving < 0.95;
    }
    if (beam.current) {
      beam.current.visible = b.state !== "leaving";
      (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.16 + Math.sin(clock.elapsedTime * 2) * 0.04;
    }
  });
  const spot = ARENA.spots[spotId];
  return (
    <group position={[cellCenter(spot.cx), 0, cellCenter(spot.cz)]} rotation-y={yawOf(spot.facing)}>
      <group ref={group}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[1.5, 0.6, 0.75]} />
          <meshStandardMaterial map={surface("board")} color="#8a6a44" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.3, 0.38]}>
          <planeGeometry args={[1.3, 0.48]} />
          <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.35} />
        </mesh>
        {/* brass corners */}
        {[-0.74, 0.74].map((x) => (
          <mesh key={x} position={[x, 0.3, 0]}>
            <boxGeometry args={[0.05, 0.62, 0.78]} />
            <meshStandardMaterial color="#d4ad55" metalness={0.3} roughness={0.35} />
          </mesh>
        ))}
        <group ref={lid} position={[0, 0.6, -0.375]}>
          <mesh position={[0, 0.06, 0.375]}>
            <boxGeometry args={[1.52, 0.12, 0.77]} />
            <meshStandardMaterial map={surface("board")} color="#7a5a38" roughness={0.8} />
          </mesh>
        </group>
        <group ref={gunHolder} position={[0, 0.6, 0]} scale={1.6}>
          {shown && <GunModel id={shown} />}
        </group>
      </group>
      <mesh ref={beam} position={[0, 4, 0]}>
        <cylinderGeometry args={[0.45, 0.6, 8, 16, 1, true]} />
        <meshBasicMaterial color="#9ecbff" transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Where the box isn't: a crate of junk. */
function EmptyBoxSpot({ spot }: { spot: Spot }) {
  return (
    <group position={[cellCenter(spot.cx), 0, cellCenter(spot.cz)]} rotation-y={yawOf(spot.facing)}>
      <mesh position={[0, 0.35, -0.1]} rotation-y={0.2}>
        <boxGeometry args={[1.0, 0.7, 0.8]} />
        <meshStandardMaterial map={surface("board")} color="#5e4630" roughness={0.9} />
      </mesh>
      <mesh position={[0.3, 0.95, -0.2]} rotation-y={-0.4}>
        <boxGeometry args={[0.55, 0.5, 0.5]} />
        <meshStandardMaterial map={surface("board")} color="#6e5236" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- the Upgrade Station

function UpgradeStation({ game, spot }: { game: GameRef; spot: Spot }) {
  const panel = useMemo(() => new THREE.MeshStandardMaterial({ color: "#7c3aed", emissive: "#7c3aed", emissiveIntensity: 0.05, toneMapped: false }), []);
  const rollers = useRef<THREE.Group>(null);
  const holder = useRef<THREE.Group>(null);
  const [gun, setGun] = useState<{ id: WeaponId; up: boolean } | null>(null);
  const sign = useMemo(() => signTexture([{ text: "UPGRADE", size: 44, color: "#c084fc" }, { text: "5000", size: 26, color: "#f5f0e0" }], "#140c1c", "#7c3aed"), []);
  useFrame(({ clock }, dt) => {
    const g = game.current;
    const u = g.upgrade;
    panel.emissiveIntensity = g.power ? 1.4 + Math.sin(clock.elapsedTime * 4) * 0.3 : 0.05;
    if (rollers.current && u.state === "working") rollers.current.children.forEach((r) => (r.rotation.x += dt * 12));
    const want = u.weapon && u.state !== "idle" ? { id: u.weapon.id, up: u.state === "ready" } : null;
    if ((want?.id ?? null) !== (gun?.id ?? null) || (want?.up ?? false) !== (gun?.up ?? false)) setGun(want);
    if (holder.current) holder.current.position.z = u.state === "working" ? 0.5 - (1 - u.timer / 3.5) * 1.0 : 0;
  });
  return (
    <group position={[cellCenter(spot.cx), 0, cellCenter(spot.cz)]} rotation-y={yawOf(spot.facing)}>
      <mesh position={[0, 0.5, -0.1]}>
        <boxGeometry args={[1.7, 1.0, 1.0]} />
        <meshStandardMaterial map={surface("metal")} color="#8a8496" metalness={0.25} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.55, 0.41]} material={panel}>
        <planeGeometry args={[1.2, 0.35]} />
      </mesh>
      <group ref={rollers} position={[0, 1.05, -0.1]}>
        {[-0.35, -0.12, 0.12, 0.35].map((z) => (
          <mesh key={z} position={[0, 0, z]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.06, 0.06, 1.4, 10]} />
            <meshStandardMaterial color="#5a5560" metalness={0.3} roughness={0.35} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 1.9, -0.55]}>
        <planeGeometry args={[1.2, 0.6]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      {/* a hood the gun passes under */}
      <mesh position={[0, 1.45, -0.1]}>
        <boxGeometry args={[1.0, 0.5, 0.5]} />
        <meshStandardMaterial color="#3b3442" metalness={0.2} roughness={0.6} />
      </mesh>
      <group ref={holder} position={[0, 1.18, 0]} rotation-y={Math.PI / 2} scale={1.5}>
        {gun && <GunModel id={gun.id} upgraded={gun.up} />}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- lights

interface RoomLight {
  zone: string;
  x: number;
  z: number;
  color: string;
  /** Before the power comes on. */
  off: number;
  on: number;
  flicker?: boolean;
  needsPower?: boolean;
  offColor?: string;
}

function roomLights(): RoomLight[] {
  const rects = zoneRects();
  const center = (name: string, fx = 0.5, fz = 0.5) => {
    const r = rects.find((q) => ARENA.zoneNames[q.zone] === name)!;
    return { x: (r.x0 + (r.x1 - r.x0 + 1) * fx) * CELL, z: (r.z0 + (r.z1 - r.z0 + 1) * fz) * CELL };
  };
  return [
    { zone: "Lobby", ...center("Lobby"), color: "#ffb46b", off: 55, on: 70, flicker: true },
    { zone: "Dining Hall", ...center("Dining Hall", 0.28), color: "#ffcf8a", off: 45, on: 65 },
    { zone: "Dining Hall", ...center("Dining Hall", 0.75), color: "#ffcf8a", off: 45, on: 65 },
    { zone: "Chapel", ...center("Chapel", 0.5, 0.25), color: "#ff9a3c", off: 45, on: 65, flicker: true },
    { zone: "Chapel", ...center("Chapel", 0.5, 0.78), color: "#ff9a3c", off: 40, on: 65, flicker: true },
    { zone: "Workshop", ...center("Workshop"), color: "#d6f5ff", off: 30, on: 90, needsPower: true, offColor: "#ff2a1a" },
  ];
}

function Lights({ game }: { game: GameRef }) {
  const lights = useMemo(roomLights, []);
  const refs = useRef<(THREE.PointLight | null)[]>([]);
  const bulbs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  useFrame(({ clock }) => {
    const power = game.current.power;
    const t = clock.elapsedTime;
    lights.forEach((l, i) => {
      const light = refs.current[i];
      if (!light) return;
      let k = power ? l.on : l.off;
      if (l.flicker) k *= 0.85 + Math.sin(t * 13 + i) * 0.05 + (Math.sin(t * 2.3 + i * 4) > 0.97 ? -0.5 : 0);
      if (l.needsPower && !power) k *= 0.6 + Math.sin(t * 3) * 0.4; // a red emergency lamp, pulsing
      light.intensity = k;
      light.color.set(l.needsPower && !power ? l.offColor! : l.color);
      const bulb = bulbs.current[i];
      if (bulb) {
        bulb.emissive.set(light.color);
        bulb.emissiveIntensity = k / 25;
      }
    });
  });
  return (
    <group>
      <hemisphereLight args={["#6f82b0", "#2a2018", 1.1]} />
      <directionalLight position={[-30, 40, -20]} intensity={0.45} color="#8fa6d8" />
      <ambientLight intensity={0.22} />
      {lights.map((l, i) => (
        <group key={i} position={[l.x, WALL_HEIGHT - 0.55, l.z]}>
          <pointLight ref={(r) => (refs.current[i] = r)} color={l.color} intensity={l.off} distance={22} decay={1.7} />
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.5, 4]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshStandardMaterial ref={(m) => (bulbs.current[i] = m)} color="#ffffff" emissive={l.color} emissiveIntensity={2} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <coneGeometry args={[0.3, 0.2, 12, 1, true]} />
            <meshStandardMaterial color="#3a3a3a" side={THREE.DoubleSide} metalness={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- everything

export default function Arena({ game }: { game: GameRef }) {
  // Re-render when a door opens, the power comes on, or the box moves.
  const [version, setVersion] = useState(game.current.mapVersion);
  useFrame(() => {
    if (game.current.mapVersion !== version) setVersion(game.current.mapVersion);
  });
  const g = game.current;
  const spots = ARENA.spots;
  return (
    <group>
      <Shell />
      <Lights game={game} />
      <Windows game={game} />
      {ARENA.doors.filter((d) => !g.openDoors.includes(d.id)).map((d) => (
        <DoorBlock key={d.id} id={d.id} />
      ))}
      {spots.filter((s) => s.kind === "wallbuy").map((s) => (
        <WallBuy key={s.id} spot={s} />
      ))}
      {spots.filter((s) => s.kind === "perk").map((s) => (
        <PerkMachine key={s.id} game={game} spot={s} />
      ))}
      {spots.filter((s) => s.kind === "power").map((s) => (
        <PowerSwitch key={s.id} game={game} spot={s} />
      ))}
      {spots.filter((s) => s.kind === "upgrade").map((s) => (
        <UpgradeStation key={s.id} game={game} spot={s} />
      ))}
      {spots.filter((s) => s.kind === "box" && s.id !== g.box.spot).map((s) => (
        <EmptyBoxSpot key={s.id} spot={s} />
      ))}
      <MysteryBox game={game} />
    </group>
  );
}
