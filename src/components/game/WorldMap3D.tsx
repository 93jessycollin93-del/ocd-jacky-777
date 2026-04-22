/**
 * Dragon Chaos Wars — Full 3D World Map
 * 
 * Procedural terrain with custom shaders, animated water, cinematic atmosphere,
 * game-node markers, fog of war, and particle effects.
 * Adapted from the "Remix of map base" reference project.
 */

import { useRef, useMemo, useCallback, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MapControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '@/game/GameContext';
import { EXPEDITIONS, LEGENDARY_CREATURES } from '@/game/data';
import { useIsMobile } from '@/hooks/use-mobile';

// ═══════════════════════════════════════════
//  NOISE ENGINE (from reference project)
// ═══════════════════════════════════════════

function hash(x: number, y: number, seed: number): number {
  let h = (seed + x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h & 0x7fffffff) / 0x7fffffff;
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function smoothstep(t: number): number { return t * t * (3 - 2 * t); }
function quintic(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
function clamp(v: number, min: number, max: number): number { return v < min ? min : v > max ? max : v; }

function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = quintic(x - ix), fy = quintic(y - iy);
  return lerp(
    lerp(hash(ix, iy, seed), hash(ix + 1, iy, seed), fx),
    lerp(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), fx), fy
  );
}

function fbm(x: number, y: number, seed: number, octaves = 4): number {
  let val = 0, amp = 1, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    val += valueNoise(x * freq, y * freq, seed + i * 1337) * amp;
    max += amp; amp *= 0.5; freq *= 2;
  }
  return val / max;
}

function warpedFbm(x: number, y: number, seed: number, octaves: number, ws = 0.4): number {
  const wx = x + fbm(x + 100, y + 100, seed + 1000, 3) * ws;
  const wy = y + fbm(x + 200, y + 200, seed + 2000, 3) * ws;
  return fbm(wx, wy, seed, octaves);
}

function ridgedSmooth(x: number, y: number, seed: number, octaves: number): number {
  let val = 0, amp = 1, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    const n = valueNoise(x * freq, y * freq, seed + i * 1337 + 7777);
    val += Math.pow(1 - Math.abs(n * 2 - 1), 0.65) * amp;
    max += amp; amp *= 0.42; freq *= 1.95;
  }
  return val / max;
}

function getRawHeight(wx: number, wy: number, seed: number): number {
  const nx = wx * 0.003, ny = wy * 0.003;
  const contWX = fbm(nx * 1.5 + 300, ny * 1.5 + 300, seed + 1111, 3) * 0.25;
  const contWY = fbm(nx * 1.5 + 400, ny * 1.5 + 400, seed + 2222, 3) * 0.25;
  const continentWarped = warpedFbm(nx * 1.6 + contWX, ny * 1.6 + contWY, seed, 5, 0.4);
  const continent = fbm(nx * 1.8, ny * 1.8, seed, 4);
  const detail = fbm(nx * 3.5, ny * 3.5, seed + 333, 4);
  let h = continentWarped * 0.55 + detail * 0.25 + continent * 0.20;
  h = Math.pow(clamp(h, 0, 1), 1.15);

  // Mountains
  const beltWX = warpedFbm(nx * 0.7 + 500, ny * 0.7 + 500, seed + 4444, 3, 0.5) * 0.55;
  const beltWY = warpedFbm(nx * 0.7 + 700, ny * 0.7 + 700, seed + 5555, 3, 0.5) * 0.55;
  const belt = fbm(nx * 1.2 + beltWX, ny * 1.2 + beltWY, seed + 6666, 4);
  const zone = smoothstep(clamp((belt - 0.46) / 0.35, 0, 1));
  const ridge = ridgedSmooth(nx * 3 + beltWX * 1.5, ny * 3 + beltWY * 1.5, seed + 8888, 4);
  h += zone * ridge * 0.32;

  // Erosion
  const erosionWX = valueNoise(nx * 0.7 * 6, ny * 0.7 * 6, seed + 11111) * 0.7;
  const erosionN = valueNoise((nx * 6 + erosionWX) * 3, (ny * 6) * 3, seed + 33333);
  const dist = Math.abs(erosionN - 0.5) * 2;
  const erosion = 1 - Math.pow(1 - dist, 3);
  h -= (1 - erosion) * clamp(h - 0.35, 0, 0.5) * 0.08;

  h = clamp(h, 0, 1);
  return smoothstep(h) * 0.85 + h * 0.15;
}

// ═══════════════════════════════════════════
//  WORLD GENERATION
// ═══════════════════════════════════════════

const CHUNK_SIZE = 64;
const HEIGHT_SCALE = 16;
const WORLD_SEED = 42069;
const SEA_LEVEL_Y = 0.32 * HEIGHT_SCALE * 0.82 + 0.08;

// ═══════════════════════════════════════════
//  QUALITY PRESETS
// ═══════════════════════════════════════════

export type QualityTier = 'low' | 'medium' | 'high' | 'ultra';

export interface QualitySettings {
  /** Multiplier on CHUNK_SIZE for terrain plane segments */
  terrainSegmentMul: number;
  /** Water plane tessellation (segments per side) */
  waterSegments: number;
  /** Animated particle count */
  particleCount: number;
  /** Active chunk radius around camera */
  chunkRadius: number;
  /** Max device pixel ratio range */
  dpr: [number, number];
  /** MSAA antialias on canvas */
  antialias: boolean;
}

export const QUALITY_PRESETS: Record<QualityTier, QualitySettings> = {
  low:    { terrainSegmentMul: 1,    waterSegments: 32,  particleCount: 60,  chunkRadius: 2, dpr: [1, 1],   antialias: false },
  medium: { terrainSegmentMul: 1.5,  waterSegments: 56,  particleCount: 140, chunkRadius: 3, dpr: [1, 1.5], antialias: true  },
  high:   { terrainSegmentMul: 2,    waterSegments: 80,  particleCount: 250, chunkRadius: 3, dpr: [1, 2],   antialias: true  },
  ultra:  { terrainSegmentMul: 3,    waterSegments: 128, particleCount: 400, chunkRadius: 4, dpr: [1, 2],   antialias: true  },
};

/** Detect a sensible default tier from device hints. */
export function detectDefaultQuality(): QualityTier {
  if (typeof window === 'undefined') return 'high';
  const ua = navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const cores = (navigator as any).hardwareConcurrency ?? 4;
  const mem = (navigator as any).deviceMemory ?? 4;
  const dpr = window.devicePixelRatio ?? 1;
  if (isMobile) {
    if (cores >= 8 && mem >= 6) return 'medium';
    return 'low';
  }
  // Desktop
  if (cores >= 12 && mem >= 16 && dpr >= 2) return 'ultra';
  if (cores >= 8) return 'high';
  if (cores >= 4) return 'medium';
  return 'low';
}


type BiomeType = 'grassland' | 'desert' | 'snow' | 'forest' | 'volcanic' | 'swamp' | 'wasteland';

interface Tile { x: number; y: number; height: number; biome: BiomeType; explored: boolean; }
interface ChunkData { cx: number; cy: number; tiles: Tile[][]; }

const BIOME_COLORS: Record<BiomeType, THREE.Color> = {
  grassland: new THREE.Color(0.3, 0.55, 0.2),
  desert: new THREE.Color(0.82, 0.72, 0.45),
  snow: new THREE.Color(0.88, 0.9, 0.94),
  volcanic: new THREE.Color(0.35, 0.15, 0.1),
  swamp: new THREE.Color(0.25, 0.35, 0.2),
  forest: new THREE.Color(0.15, 0.4, 0.12),
  wasteland: new THREE.Color(0.4, 0.35, 0.3),
};

function getBiome(height: number, moisture: number, temperature: number): BiomeType {
  if (height > 0.78) return 'snow';
  if (height > 0.68 && temperature > 0.65) return 'volcanic';
  if (height < 0.25 && moisture > 0.6) return 'swamp';
  if (temperature > 0.6 && moisture < 0.35) return 'desert';
  if (moisture > 0.55 && height < 0.65) return 'forest';
  if (height < 0.2 || (temperature > 0.5 && moisture < 0.2)) return 'wasteland';
  return 'grassland';
}

function generateChunk(cx: number, cy: number): ChunkData {
  const tiles: Tile[][] = [];
  const baseX = cx * CHUNK_SIZE, baseY = cy * CHUNK_SIZE;
  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    tiles[ly] = [];
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = baseX + lx, wy = baseY + ly;
      const nx = wx * 0.003, ny = wy * 0.003;
      const height = getRawHeight(wx, wy, WORLD_SEED);
      const moisture = fbm(nx * 4 + 100, ny * 4 + 100, WORLD_SEED + 500, 4);
      const temperature = fbm(nx * 3 + 200, ny * 3 + 200, WORLD_SEED + 1000, 3);
      const biome = getBiome(height, moisture, temperature);
      const explored = Math.hypot(wx, wy) < 35;
      tiles[ly][lx] = { x: wx, y: wy, height, biome, explored };
    }
  }
  return { cx, cy, tiles };
}

function chunkKey(cx: number, cy: number) { return `${cx},${cy}`; }

// Recent-prefetch tracker: prevents re-scheduling the same chunks during
// jittery movement near the speed threshold (e.g. camera oscillating across
// the 1.5 u/s gate). Stores key -> last-touched timestamp (ms).
const RECENT_PREFETCH_TTL_MS = 4000;
const RECENT_PREFETCH_MAX = 64;
const recentPrefetch = new Map<string, number>();

function touchRecentPrefetch(key: string, now: number) {
  recentPrefetch.delete(key);
  recentPrefetch.set(key, now);
  if (recentPrefetch.size > RECENT_PREFETCH_MAX) {
    // Drop oldest (Map preserves insertion order)
    const oldest = recentPrefetch.keys().next().value;
    if (oldest !== undefined) recentPrefetch.delete(oldest);
  }
}

function isRecentlyPrefetched(key: string, now: number): boolean {
  const t = recentPrefetch.get(key);
  if (t === undefined) return false;
  if (now - t > RECENT_PREFETCH_TTL_MS) {
    recentPrefetch.delete(key);
    return false;
  }
  return true;
}

function loadChunksAround(
  chunks: Map<string, ChunkData>,
  camX: number,
  camZ: number,
  radius: number,
  velocity?: { vx: number; vz: number },
): { map: Map<string, ChunkData>; changed: boolean } {
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const ccx = Math.floor(camX / CHUNK_SIZE), ccy = Math.floor(camZ / CHUNK_SIZE);
  let changed = false;
  const next = chunks;

  // Core ring: always loaded around current chunk
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const key = chunkKey(ccx + dx, ccy + dy);
      if (!next.has(key)) {
        next.set(key, generateChunk(ccx + dx, ccy + dy));
        changed = true;
      }
    }
  }

  // Velocity-based prefetch: extend the load region in the direction of travel
  // so chunks generate before the player crosses into them.
  let prefetchCells: Array<[number, number]> = [];
  if (velocity) {
    const speed = Math.hypot(velocity.vx, velocity.vz);
    // Only prefetch when actually moving — convert world units/s to chunk lookahead
    if (speed > 1.5) {
      // Lookahead: ~2s of travel, capped at +3 chunks beyond core radius
      const lookSec = 2.0;
      const aheadX = (velocity.vx * lookSec) / CHUNK_SIZE;
      const aheadZ = (velocity.vz * lookSec) / CHUNK_SIZE;
      const reachX = clamp(Math.ceil(Math.abs(aheadX)), 1, 3);
      const reachZ = clamp(Math.ceil(Math.abs(aheadZ)), 1, 3);
      const dirX = Math.sign(aheadX);
      const dirZ = Math.sign(aheadZ);
      // Build a wedge of cells in front of motion, beyond the core radius
      const widen = 1; // half-width perpendicular padding
      for (let ex = 0; ex <= reachX; ex++) {
        for (let ez = 0; ez <= reachZ; ez++) {
          // Skip cells already inside core radius
          const offX = ex * dirX;
          const offZ = ez * dirZ;
          if (Math.abs(offX) <= radius && Math.abs(offZ) <= radius) continue;
          // Only keep cells "in front" — i.e. on the motion side
          if ((dirX !== 0 && Math.sign(offX) !== dirX && offX !== 0) ||
              (dirZ !== 0 && Math.sign(offZ) !== dirZ && offZ !== 0)) continue;
          for (let pad = -widen; pad <= widen; pad++) {
            const cx = ccx + offX + (dirZ !== 0 ? pad : 0);
            const cy = ccy + offZ + (dirX !== 0 ? pad : 0);
            prefetchCells.push([cx, cy]);
          }
        }
      }
    }
  }

  // Generate at most a few prefetch chunks per call to keep frame budget.
  // Skip any cell already generated recently — this prevents jittery movement
  // near the speed threshold from re-queueing the same chunks repeatedly.
  const MAX_PREFETCH_PER_CALL = 2;
  let prefetched = 0;
  for (const [cx, cy] of prefetchCells) {
    if (prefetched >= MAX_PREFETCH_PER_CALL) break;
    const key = chunkKey(cx, cy);
    if (next.has(key)) {
      // Already loaded — refresh its recency so the keep-radius protects it
      touchRecentPrefetch(key, now);
      continue;
    }
    if (isRecentlyPrefetched(key, now)) continue;
    next.set(key, generateChunk(cx, cy));
    touchRecentPrefetch(key, now);
    changed = true;
    prefetched++;
  }

  // Unload far chunks (use a wider keep radius so prefetch survives brief stops).
  // Additionally, never unload a chunk that was prefetched within the TTL window —
  // this absorbs short oscillations across the unload boundary.
  const keep = radius + 3;
  for (const [key, chunk] of next) {
    if (Math.abs(chunk.cx - ccx) > keep || Math.abs(chunk.cy - ccy) > keep) {
      if (isRecentlyPrefetched(key, now)) continue;
      next.delete(key);
      changed = true;
    }
  }
  return { map: changed ? new Map(next) : next, changed };
}

// ═══════════════════════════════════════════
//  TERRAIN SHADERS
// ═══════════════════════════════════════════

const terrainVert = `
  attribute vec3 color;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vFogDepth;
  void main() {
    vColor = color;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vec4 mvPos = viewMatrix * worldPos;
    vFogDepth = -mvPos.z;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const terrainFrag = `
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uAmbientColor;
  uniform float uAmbientIntensity;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vFogDepth;
  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uSunDir);
    float wrapDiffuse = max(0.0, (dot(N, L) + 0.3) / 1.3);
    float slopeFactor = 1.0 - max(0.0, 1.0 - N.y) * 0.35;
    float heightAO = smoothstep(0.0, 40.0, vWorldPos.y) * 0.08;
    vec3 diffuse = uSunColor * wrapDiffuse * 0.85;
    vec3 ambient = uAmbientColor * uAmbientIntensity;
    float rim = pow(1.0 - max(0.0, N.y), 3.0) * 0.04;
    vec3 litColor = vColor * (diffuse + ambient + heightAO) * slopeFactor + rim * uSunColor * 0.3;
    float fogT = smoothstep(uFogNear, uFogFar, vFogDepth);
    litColor = mix(litColor, uFogColor, fogT);
    litColor = litColor / (litColor + 0.8) * 1.2;
    gl_FragColor = vec4(litColor, 1.0);
  }
`;

// ═══════════════════════════════════════════
//  TERRAIN CHUNK MESH
// ═══════════════════════════════════════════

const _color = new THREE.Color();

function ChunkMesh({ chunk, segmentMul }: { chunk: ChunkData; segmentMul: number }) {
  const geometry = useMemo(() => {
    const size = CHUNK_SIZE;
    const segments = Math.max(16, Math.round(size * segmentMul));
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);
    const baseX = chunk.cx * CHUNK_SIZE, baseY = chunk.cy * CHUNK_SIZE;
    geo.translate(baseX + size / 2, 0, baseY + size / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i), wz = pos.getZ(i);
      const fx = wx - baseX, fz = wz - baseY;
      const lx = Math.max(0, Math.min(size - 1, Math.floor(fx)));
      const ly = Math.max(0, Math.min(size - 1, Math.floor(fz)));
      const tile = chunk.tiles[ly]?.[lx];
      if (!tile) continue;

      // Interpolated height
      const lx2 = Math.min(size - 1, lx + 1), ly2 = Math.min(size - 1, ly + 1);
      const tx = smoothstep(fx - lx), tz = smoothstep(fz - ly);
      const h00 = chunk.tiles[ly][lx].height;
      const h10 = chunk.tiles[ly][lx2].height;
      const h01 = chunk.tiles[ly2]?.[lx]?.height ?? h00;
      const h11 = chunk.tiles[ly2]?.[lx2]?.height ?? h10;
      const rawH = h00 * (1 - tx) * (1 - tz) + h10 * tx * (1 - tz) + h01 * (1 - tx) * tz + h11 * tx * tz;
      pos.setY(i, rawH * HEIGHT_SCALE);

      const c = BIOME_COLORS[tile.biome];
      const fog = tile.explored ? 1.0 : 0.06;
      colors[i * 3] = c.r * fog;
      colors[i * 3 + 1] = c.g * fog;
      colors[i * 3 + 2] = c.b * fog;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [chunk, segmentMul]);

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.3).normalize() },
      uSunColor: { value: new THREE.Color(1.0, 0.95, 0.85) },
      uAmbientColor: { value: new THREE.Color(0.45, 0.45, 0.50) },
      uAmbientIntensity: { value: 0.25 },
      uFogColor: { value: new THREE.Color(0.52, 0.58, 0.74) },
      uFogNear: { value: 200.0 },
      uFogFar: { value: 650.0 },
    },
    vertexShader: terrainVert,
    fragmentShader: terrainFrag,
  }), []);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  return <mesh geometry={geometry} material={material} frustumCulled={true} />;
}

// ═══════════════════════════════════════════
//  WATER PLANE
// ═══════════════════════════════════════════

const waterVert = `
  uniform float uTime;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vFoamMask;
  void main() {
    vec3 pos = position;
    float w1 = sin(pos.x*0.04+uTime*0.35)*cos(pos.y*0.03+uTime*0.22)*0.14;
    float w2 = sin(pos.x*0.11+pos.y*0.08+uTime*0.55)*0.07;
    float w3 = sin(pos.x*0.02-pos.y*0.015+uTime*0.15)*0.20;
    float w4 = cos(pos.x*0.18+pos.y*0.14+uTime*0.8)*0.035;
    float totalWave = w1+w2+w3+w4;
    pos.z += totalWave;
    vFoamMask = smoothstep(0.15, 0.28, totalWave);
    float dx = 0.04*cos(pos.x*0.04+uTime*0.35)*cos(pos.y*0.03+uTime*0.22)*0.14
             + 0.11*cos(pos.x*0.11+pos.y*0.08+uTime*0.55)*0.07
             + 0.02*cos(pos.x*0.02-pos.y*0.015+uTime*0.15)*0.20
             - 0.18*sin(pos.x*0.18+pos.y*0.14+uTime*0.8)*0.035;
    float dy = -0.03*sin(pos.x*0.04+uTime*0.35)*sin(pos.y*0.03+uTime*0.22)*0.14
             + 0.08*cos(pos.x*0.11+pos.y*0.08+uTime*0.55)*0.07
             - 0.015*cos(pos.x*0.02-pos.y*0.015+uTime*0.15)*0.20
             + 0.14*cos(pos.x*0.18+pos.y*0.14+uTime*0.8)*0.035;
    vNormal = normalize(vec3(-dx, -dy, 1.0));
    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const waterFrag = `
  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uDeepColor;
  uniform vec3 uMidColor;
  uniform vec3 uShallowColor;
  uniform vec3 uCameraPos;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vFoamMask;
  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCameraPos - vWorldPos);
    float camDist = length(uCameraPos - vWorldPos);
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 5.0);
    float d1 = sin(vWorldPos.x*0.003+vWorldPos.z*0.002)*0.5+0.5;
    float d2 = sin(vWorldPos.x*0.010-vWorldPos.z*0.007+1.5)*0.3+0.5;
    float depthFake = d1*0.6+d2*0.4;
    vec3 baseColor = depthFake < 0.35
      ? mix(uShallowColor, uMidColor, depthFake/0.35)
      : mix(uMidColor, uDeepColor, (depthFake-0.35)/0.65);
    vec3 R = reflect(-uSunDir, N);
    float dotRV = max(dot(R, V), 0.0);
    float specTight = pow(dotRV, 768.0)*0.8;
    float specMid = pow(dotRV, 96.0)*0.22;
    float specBroad = pow(dotRV, 16.0)*0.08;
    float sss = pow(max(dot(V, -uSunDir), 0.0), 6.0)*0.10;
    float c1 = sin(vWorldPos.x*0.15+uTime*0.3)*sin(vWorldPos.z*0.14+uTime*0.26);
    float caustic = pow(max(c1,0.0), 5.0)*0.05;
    float foam = vFoamMask*0.20;
    vec3 skyReflect = mix(vec3(0.04,0.06,0.10), uFogColor*0.6, fresnel*0.5);
    vec3 finalColor = baseColor*(1.0-fresnel*0.4)
      + uSunColor*specTight + uSunColor*specMid + uSunColor*specBroad
      + skyReflect*fresnel*0.6
      + vec3(sss)*vec3(0.15,0.55,0.45)
      + caustic*vec3(0.22,0.42,0.62)
      + foam*vec3(0.72,0.78,0.84);
    float fogT = smoothstep(uFogNear, uFogFar, camDist);
    finalColor = mix(finalColor, uFogColor, fogT*0.75);
    float alpha = mix(0.80, 0.97, fresnel);
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

function WaterPlane({ camX, camZ, segments }: { camX: number; camZ: number; segments: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uDeepColor: { value: new THREE.Color(0.01, 0.04, 0.14) },
    uMidColor: { value: new THREE.Color(0.03, 0.10, 0.28) },
    uShallowColor: { value: new THREE.Color(0.06, 0.20, 0.40) },
    uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.3).normalize() },
    uSunColor: { value: new THREE.Color(1.0, 0.95, 0.85) },
    uCameraPos: { value: new THREE.Vector3() },
    uFogColor: { value: new THREE.Color(0.52, 0.58, 0.74) },
    uFogNear: { value: 200.0 },
    uFogFar: { value: 650.0 },
  }), []);

  useFrame(({ clock, camera, scene }) => {
    if (!matRef.current) return;
    const u = matRef.current.uniforms;
    u.uTime.value = clock.elapsedTime;
    u.uCameraPos.value.copy(camera.position);
    if (scene.fog && scene.fog instanceof THREE.Fog) {
      u.uFogColor.value.copy(scene.fog.color);
      u.uFogNear.value = scene.fog.near;
      u.uFogFar.value = scene.fog.far;
    }
  });

  const planeSize = CHUNK_SIZE * 14;
  return (
    <mesh
      position={[Math.round(camX / CHUNK_SIZE) * CHUNK_SIZE, SEA_LEVEL_Y, Math.round(camZ / CHUNK_SIZE) * CHUNK_SIZE]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[planeSize, planeSize, segments, segments]} />
      <shaderMaterial ref={matRef} uniforms={uniforms} vertexShader={waterVert} fragmentShader={waterFrag} transparent depthWrite={false} />
    </mesh>
  );
}

// ═══════════════════════════════════════════
//  ATMOSPHERE
// ═══════════════════════════════════════════

function Atmosphere() {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const fillRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const { scene } = useThree();
  const fogRef = useRef<THREE.Fog | null>(null);
  const hourRef = useRef(10); // start at 10am
  // Reusable color targets to avoid per-frame allocations
  const dayFog = useMemo(() => new THREE.Color(0.52, 0.58, 0.74), []);
  const duskFog = useMemo(() => new THREE.Color(0.40, 0.25, 0.15), []);
  const nightFog = useMemo(() => new THREE.Color(0.02, 0.03, 0.07), []);
  const targetFog = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    // Day cycle: slowly advance hour
    const iv = setInterval(() => {
      hourRef.current = (hourRef.current + 0.15) % 24;
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  useFrame(({ camera }) => {
    const hour = hourRef.current;
    const sunAngle = ((hour - 6) / 12) * Math.PI;
    const sunY = Math.sin(sunAngle) * 200;
    const sunX = Math.cos(sunAngle) * 250;
    const dl = clamp(Math.sin(sunAngle), 0, 1);

    if (sunRef.current) {
      sunRef.current.position.set(camera.position.x + sunX, Math.max(12, sunY), camera.position.z + 100);
      if (dl > 0.1) {
        sunRef.current.color.setRGB(1.0, 0.94, 0.82);
        sunRef.current.intensity = 0.85 + dl * 0.5;
      } else {
        sunRef.current.color.setRGB(0.18, 0.22, 0.40);
        sunRef.current.intensity = 0.08;
      }
    }

    if (fillRef.current) {
      fillRef.current.position.set(camera.position.x - sunX * 0.3, 30, camera.position.z - 70);
      fillRef.current.intensity = dl > 0.2 ? 0.08 + dl * 0.12 : 0.04;
    }

    if (ambientRef.current) {
      ambientRef.current.intensity = dl > 0.1 ? 0.08 + dl * 0.16 : 0.05;
    }

    if (hemiRef.current) {
      hemiRef.current.intensity = dl > 0.1 ? 0.06 + dl * 0.12 : 0.03;
    }

    // Fog
    if (!fogRef.current) {
      fogRef.current = new THREE.Fog('#060a14', 200, 650);
      scene.fog = fogRef.current;
    }
    if (dl > 0.3) targetFog.copy(dayFog);
    else if (dl > 0.1) targetFog.copy(duskFog);
    else targetFog.copy(nightFog);
    fogRef.current.color.lerp(targetFog, 0.02);
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(fogRef.current.color);
    } else {
      scene.background = fogRef.current.color.clone();
    }
  });

  return (
    <>
      <directionalLight ref={sunRef} position={[200, 150, 100]} intensity={1.2} />
      <directionalLight ref={fillRef} position={[-80, 40, -50]} intensity={0.15} />
      <ambientLight ref={ambientRef} intensity={0.20} />
      <hemisphereLight ref={hemiRef} args={['#7AACE0', '#3a2810', 0.10]} />
    </>
  );
}

// ═══════════════════════════════════════════
//  GAME NODE MARKERS
// ═══════════════════════════════════════════

interface MapMarker { id: string; x: number; z: number; y: number; icon: string; label: string; type: string; }

function FloatingMarker({ marker, onClick, selected }: { marker: MapMarker; onClick: () => void; selected: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);

  const typeColors: Record<string, string> = {
    city: '#ffd700', expedition: '#00e5ff', creature: '#ff4444', gathering: '#22c55e', defense: '#e0e0e0',
  };
  const color = typeColors[marker.type] || '#da70d6';

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = marker.y + 1.5 + Math.sin(clock.elapsedTime * 1.2 + marker.x) * 0.25;
    }
    if (glowRef.current) {
      glowRef.current.emissiveIntensity = selected ? 0.8 : (0.3 + Math.sin(clock.elapsedTime * 2 + marker.x) * 0.15);
    }
  });

  return (
    <group ref={groupRef} position={[marker.x, marker.y + 1.5, marker.z]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {marker.type === 'city' ? (
        <>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.2, 2.4, 1.2]} />
            <meshStandardMaterial ref={glowRef} color={color} emissive={color} emissiveIntensity={0.3} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <coneGeometry args={[0.9, 1.0, 4]} />
            <meshStandardMaterial color="#cc8800" metalness={0.4} roughness={0.4} />
          </mesh>
        </>
      ) : marker.type === 'creature' ? (
        <mesh>
          <coneGeometry args={[0.6, 1.0, 6]} />
          <meshStandardMaterial ref={glowRef} color={color} emissive="#330000" emissiveIntensity={0.4} roughness={0.6} />
        </mesh>
      ) : marker.type === 'expedition' ? (
        <mesh rotation={[0, Math.PI / 4, 0]}>
          <octahedronGeometry args={[0.5]} />
          <meshStandardMaterial ref={glowRef} color={color} emissive={color} emissiveIntensity={0.3} metalness={0.7} roughness={0.2} />
        </mesh>
      ) : (
        <mesh>
          <sphereGeometry args={[0.4, 8, 8]} />
          <meshStandardMaterial ref={glowRef} color={color} emissive={color} emissiveIntensity={0.4} />
        </mesh>
      )}

      {selected && (
        <Html center position={[0, 2.5, 0]} style={{ pointerEvents: 'none' }}>
          <div className="bg-background/90 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground whitespace-nowrap shadow-lg backdrop-blur-sm">
            <span className="mr-1">{marker.icon}</span>
            <span className="font-semibold">{marker.label}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

// ═══════════════════════════════════════════
//  PARTICLE SYSTEM
// ═══════════════════════════════════════════

function SimpleParticles({ camX, camZ, count = 250 }: { camX: number; camZ: number; count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors, sizes } = useMemo(() => ({
    positions: new Float32Array(count * 3),
    colors: new Float32Array(count * 3),
    sizes: new Float32Array(count),
  }), [count]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, colors, sizes]);

  const material = useMemo(() => new THREE.PointsMaterial({
    size: 0.4,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const seed = i * 73.7;
      const radius = 30 + (hash(i, 0, 42) * 80);
      const angle = t * 0.03 * (1 + hash(i, 1, 42) * 0.5) + seed;
      positions[i * 3] = camX + Math.cos(angle) * radius;
      positions[i * 3 + 1] = 2 + Math.sin(t * 0.5 + seed) * 4 + hash(i, 2, 42) * 8;
      positions[i * 3 + 2] = camZ + Math.sin(angle) * radius;

      const type = i % 3;
      const fade = 0.3 + Math.sin(t * 2 + seed) * 0.2;
      if (type === 0) { // firefly
        colors[i * 3] = 0.9 * fade; colors[i * 3 + 1] = 0.8 * fade; colors[i * 3 + 2] = 0.2 * fade;
      } else if (type === 1) { // dust
        colors[i * 3] = 0.5 * fade; colors[i * 3 + 1] = 0.5 * fade; colors[i * 3 + 2] = 0.4 * fade;
      } else { // magic
        colors[i * 3] = 0.3 * fade; colors[i * 3 + 1] = 0.5 * fade; colors[i * 3 + 2] = 0.9 * fade;
      }
      sizes[i] = 0.15 + hash(i, 3, 42) * 0.3;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
}

// ═══════════════════════════════════════════
//  CAMERA CONTROLLER
// ═══════════════════════════════════════════

function CameraController({
  controlsRef,
  onCameraMove,
}: {
  controlsRef: React.RefObject<any>;
  onCameraMove: (x: number, z: number, vx: number, vz: number) => void;
}) {
  const lastSync = useRef(0);
  const lastPos = useRef<{ x: number; z: number; t: number } | null>(null);
  const velocity = useRef({ vx: 0, vz: 0 });

  useFrame(({ clock }) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const t = clock.elapsedTime;
    const x = controls.target.x;
    const z = controls.target.z;

    // Update velocity estimate every frame (EMA-smoothed) so prefetch reacts quickly
    if (lastPos.current) {
      const dt = Math.max(1 / 120, t - lastPos.current.t);
      const instVx = (x - lastPos.current.x) / dt;
      const instVz = (z - lastPos.current.z) / dt;
      // Exponential moving average: smooth out jitter from damped controls
      const a = 0.25;
      velocity.current.vx = velocity.current.vx * (1 - a) + instVx * a;
      velocity.current.vz = velocity.current.vz * (1 - a) + instVz * a;
    }
    lastPos.current = { x, z, t };

    if (t - lastSync.current > 0.15) {
      lastSync.current = t;
      onCameraMove(x, z, velocity.current.vx, velocity.current.vz);
    }
  });

  return null;
}

// ═══════════════════════════════════════════
//  MAIN WORLD SCENE
// ═══════════════════════════════════════════

function WorldScene({ onSelect, quality }: { onSelect: (id: string | null) => void; quality: QualitySettings }) {
  const { state } = useGame();
  const controlsRef = useRef<any>(null);
  const isMobile = useIsMobile();

  const [camPos, setCamPos] = useState({ x: 0, z: 0 });
  const [chunks, setChunks] = useState<Map<string, ChunkData>>(() => {
    const init = new Map<string, ChunkData>();
    return loadChunksAround(init, 0, 0, quality.chunkRadius).map;
  });
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const lastChunkCenter = useRef({ cx: 0, cy: 0 });
  const handleCameraMove = useCallback((x: number, z: number, vx: number, vz: number) => {
    setCamPos(prev => (Math.abs(prev.x - x) < 0.5 && Math.abs(prev.z - z) < 0.5 ? prev : { x, z }));
    const ccx = Math.floor(x / CHUNK_SIZE), ccy = Math.floor(z / CHUNK_SIZE);
    const crossedBoundary =
      lastChunkCenter.current.cx !== ccx || lastChunkCenter.current.cy !== ccy;
    const speed = Math.hypot(vx, vz);
    if (!crossedBoundary && speed < 1.5) return;
    lastChunkCenter.current = { cx: ccx, cy: ccy };
    setChunks(prev => {
      const { map, changed } = loadChunksAround(prev, x, z, quality.chunkRadius, { vx, vz });
      return changed ? map : prev;
    });
  }, [quality.chunkRadius]);

  // Generate markers from game data
  const markers: MapMarker[] = useMemo(() => {
    const m: MapMarker[] = [];
    // Citadel at center
    const citHeight = getRawHeight(0, 0, WORLD_SEED) * HEIGHT_SCALE;
    m.push({ id: 'citadel', x: 0, z: 0, y: citHeight, icon: '🏰', label: state.realmName, type: 'city' });

    // Expeditions
    EXPEDITIONS.forEach((exp, i) => {
      const wx = 15 + (i % 4) * 30 + Math.sin(i * 1.5) * 10;
      const wz = 15 + Math.floor(i / 4) * 30 + Math.cos(i * 2.1) * 10;
      const h = getRawHeight(wx, wz, WORLD_SEED) * HEIGHT_SCALE;
      m.push({ id: exp.id, x: wx, z: wz, y: Math.max(h, SEA_LEVEL_Y + 0.5), icon: exp.icon || '⚔️', label: `${exp.type} Lv${exp.difficulty}`, type: 'expedition' });
    });

    // Creatures
    LEGENDARY_CREATURES.forEach((c, i) => {
      const wx = c.x || (-20 - i * 25 + Math.sin(i * 3) * 15);
      const wz = c.y || (10 + i * 20 + Math.cos(i * 2) * 15);
      const h = getRawHeight(wx, wz, WORLD_SEED) * HEIGHT_SCALE;
      m.push({ id: `creature_${c.id}`, x: wx, z: wz, y: Math.max(h, SEA_LEVEL_Y + 0.5), icon: c.icon || '🐉', label: c.id.replace(/_/g, ' '), type: 'creature' });
    });

    // Gathering nodes
    const gatherNodes = [
      { id: 'farm_1', x: 12, z: -8, icon: '🌾', label: 'Fertile Plains' },
      { id: 'mine_1', x: -15, z: -20, icon: '⛏️', label: 'Iron Depths' },
      { id: 'forest_1', x: 25, z: -15, icon: '🪵', label: 'Ancient Forest' },
      { id: 'quarry_1', x: -30, z: 5, icon: '🪨', label: 'Granite Quarry' },
      { id: 'goldmine_1', x: 35, z: 20, icon: '💰', label: 'Gold Vein' },
    ];
    gatherNodes.forEach(g => {
      const h = getRawHeight(g.x, g.z, WORLD_SEED) * HEIGHT_SCALE;
      m.push({ ...g, z: g.z, y: Math.max(h, SEA_LEVEL_Y + 0.5), type: 'gathering' });
    });

    return m;
  }, [state.realmName]);

  const chunkArray = useMemo(() => Array.from(chunks.values()), [chunks]);

  const handleMarkerClick = useCallback((id: string) => {
    setSelectedMarkerId(prev => prev === id ? null : id);
    onSelect(id);
  }, [onSelect]);

  return (
    <>
      <Atmosphere />
      <Suspense fallback={null}>
        {chunkArray.map(chunk => (
          <ChunkMesh key={chunkKey(chunk.cx, chunk.cy)} chunk={chunk} segmentMul={quality.terrainSegmentMul} />
        ))}
        <WaterPlane camX={camPos.x} camZ={camPos.z} segments={quality.waterSegments} />
        <SimpleParticles camX={camPos.x} camZ={camPos.z} count={quality.particleCount} />
        {markers.map(m => (
          <FloatingMarker
            key={m.id}
            marker={m}
            onClick={() => handleMarkerClick(m.id)}
            selected={selectedMarkerId === m.id}
          />
        ))}
      </Suspense>

      <MapControls
        ref={controlsRef}
        enableRotate
        enableDamping
        dampingFactor={isMobile ? 0.12 : 0.06}
        minDistance={3}
        maxDistance={200}
        minPolarAngle={THREE.MathUtils.degToRad(5)}
        maxPolarAngle={THREE.MathUtils.degToRad(85)}
        target={[0, 0, 0]}
        touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }}
        panSpeed={isMobile ? 1.5 : 1}
      />
      <CameraController controlsRef={controlsRef} onCameraMove={handleCameraMove} />
    </>
  );
}

// ═══════════════════════════════════════════
//  EXPORTED COMPONENT
// ═══════════════════════════════════════════

const QUALITY_STORAGE_KEY = 'dcw.worldmap.quality';

export default function WorldMap3D() {
  const isMobile = useIsMobile();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [tier, setTier] = useState<QualityTier>(() => {
    if (typeof window === 'undefined') return 'high';
    const saved = window.localStorage.getItem(QUALITY_STORAGE_KEY) as QualityTier | null;
    if (saved && saved in QUALITY_PRESETS) return saved;
    return detectDefaultQuality();
  });

  const quality = QUALITY_PRESETS[tier];

  const handleTierChange = useCallback((next: QualityTier) => {
    setTier(next);
    try { window.localStorage.setItem(QUALITY_STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <Canvas
        // Re-mount canvas when MSAA or DPR ceiling changes (cannot toggle live)
        key={`${quality.antialias}-${quality.dpr[1]}`}
        camera={{
          position: [0, 80, 100],
          fov: isMobile ? 52 : 38,
          near: 0.1,
          far: 1500,
        }}
        style={{ width: '100%', height: '100%', background: '#040812', touchAction: 'none' }}
        gl={{
          antialias: quality.antialias,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
          outputColorSpace: THREE.SRGBColorSpace,
          powerPreference: 'high-performance',
        }}
        shadows={false}
        dpr={quality.dpr}
      >
        <WorldScene onSelect={setSelectedNode} quality={quality} />
      </Canvas>

      {/* HUD overlay */}
      <div className="absolute top-2 left-2 flex gap-1.5 pointer-events-none">
        <div className="bg-background/80 backdrop-blur-sm border border-border rounded-lg px-2.5 py-1.5 pointer-events-auto">
          <p className="text-[10px] text-muted-foreground font-mono">3D WORLD MAP</p>
          <p className="text-xs text-foreground font-display">🏰 Dragon Chaos Wars</p>
        </div>
      </div>

      {/* Quality selector */}
      <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm border border-border rounded-lg px-2 py-1.5 pointer-events-auto">
        <p className="text-[9px] text-muted-foreground font-mono mb-1">QUALITY</p>
        <div className="flex gap-1">
          {(['low', 'medium', 'high', 'ultra'] as QualityTier[]).map(t => (
            <button
              key={t}
              onClick={() => handleTierChange(t)}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                tier === t
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background/40 text-muted-foreground border-border hover:text-foreground'
              }`}
              aria-pressed={tier === t}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm border border-border rounded-lg px-2.5 py-1.5 pointer-events-none">
        <p className="text-[9px] text-muted-foreground font-mono">
          🖱️ Drag to pan · Scroll to zoom · Right-drag to rotate
        </p>
      </div>

      {/* Legend */}
      <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm border border-border rounded-lg px-2.5 py-1.5 space-y-0.5 pointer-events-none">
        <p className="text-[9px] text-muted-foreground font-mono mb-1">LEGEND</p>
        {[
          { icon: '🏰', label: 'Citadel', color: 'text-yellow-400' },
          { icon: '⚔️', label: 'Expedition', color: 'text-cyan-400' },
          { icon: '🐉', label: 'Creature', color: 'text-red-400' },
          { icon: '🌾', label: 'Gathering', color: 'text-green-400' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className="text-xs">{l.icon}</span>
            <span className={`text-[10px] ${l.color}`}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
