// A small 2D rigid-body engine for Sling Siege: boxes, circles and convex polygons (triangles) with
// rotation, friction and restitution. Contacts are solved with sequential impulses whose accumulated impulses are carried
// from step to step (warm starting) and matched by contact feature, which is what lets towers stand
// still instead of jittering. Box–box contacts come from SAT plus edge clipping (up to two points).
// Bodies that stay still for a moment fall asleep island by island and wake when touched.
//
// Units are metres, seconds and kilograms; y points DOWN (screen space), so gravity is positive.

export type Shape =
  | { kind: "box"; hw: number; hh: number }
  | { kind: "circle"; r: number }
  /** A convex polygon whose local origin is its centroid. Build one with polyShape(). */
  | { kind: "poly"; verts: number[]; area: number; inertia: number };

export interface Body {
  id: number;
  shape: Shape;
  x: number;
  y: number;
  /** Rotation in radians (clockwise on screen). */
  a: number;
  cos: number;
  sin: number;
  vx: number;
  vy: number;
  w: number;
  /** Pseudo-velocity used only to push overlapping bodies apart (split impulses), reset every step. */
  bvx: number;
  bvy: number;
  bw: number;
  mass: number;
  invMass: number;
  invI: number;
  friction: number;
  restitution: number;
  linearDamping: number;
  angularDamping: number;
  /** Bodies sharing a non-zero group never collide with each other. */
  group: number;
  awake: boolean;
  sleepTime: number;
  removed: boolean;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  /** Index in world.bodies (refreshed every step). */
  idx: number;
  /** Polygon data (boxes and polys): vertex count, then local and world vertices / outward normals, x then y. */
  nv: number;
  lv: Float64Array;
  ln: Float64Array;
  wv: Float64Array;
  wn: Float64Array;
  /** Whatever the game wants to hang on the body. */
  user: unknown;
}

export interface BodyDef {
  shape: Shape;
  x: number;
  y: number;
  angle?: number;
  /** kg per square metre; 0 makes the body static. */
  density?: number;
  friction?: number;
  restitution?: number;
  vx?: number;
  vy?: number;
  w?: number;
  linearDamping?: number;
  angularDamping?: number;
  group?: number;
  user?: unknown;
}

export interface Contact {
  x: number;
  y: number;
  /** Normal pointing from arbiter.a to arbiter.b. */
  nx: number;
  ny: number;
  sep: number;
  feature: number;
  pn: number;
  pt: number;
  /** Accumulated position-correction impulse (not carried between steps). */
  pnb: number;
  massN: number;
  massT: number;
  /** Target closing speed: a bounce, or the gap per step for a contact that has not touched yet. */
  bounce: number;
  /** Speed at which to push the bodies apart. */
  bias: number;
  r1x: number;
  r1y: number;
  r2x: number;
  r2y: number;
  /** r × n for each body, for the block solver. */
  rn1: number;
  rn2: number;
  /** Estimated impact impulse at this point this step (approach speed × effective mass). */
  impact: number;
}

export interface Arbiter {
  a: Body;
  b: Body;
  contacts: [Contact, Contact];
  n: number;
  friction: number;
  restitution: number;
  stamp: number;
  /** Sum of the contact impact impulses this step. */
  impact: number;
  /** Two-point block solver data (normal mass matrix and its inverse). */
  block: boolean;
  k11: number;
  k12: number;
  k22: number;
  i11: number;
  i12: number;
  i22: number;
}

export const PHYS = {
  dt: 1 / 120,
  iterations: 8,
  gravity: 10,
  slop: 0.008,
  baumgarte: 0.2,
  maxBias: 2,
  restitutionThreshold: 3,
  /** Approach speed (m/s) below which a contact is resting, not an impact. */
  impactSpeed: 0.35,
  /** Contacts are kept for bodies this close (m): speculative contacts keep resting stacks from flickering. */
  margin: 0.02,
  maxSpeed: 60,
  sleepLinear: 0.06,
  sleepAngular: 0.08,
  timeToSleep: 0.5,
};

const newContact = (): Contact => ({
  x: 0, y: 0, nx: 0, ny: 0, sep: 0, feature: 0, pn: 0, pt: 0, pnb: 0, massN: 0, massT: 0, bounce: 0, bias: 0, r1x: 0, r1y: 0, r2x: 0, r2y: 0, rn1: 0, rn2: 0, impact: 0,
});

/** Area of a shape in square metres. */
export const shapeArea = (s: Shape) => (s.kind === "box" ? 4 * s.hw * s.hh : s.kind === "circle" ? Math.PI * s.r * s.r : s.area);

/** A convex polygon from vertices in any winding; re-centred on its centroid. */
export function polyShape(points: number[]): Shape {
  const n = points.length / 2;
  let a2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x0 = points[2 * i], y0 = points[2 * i + 1], x1 = points[2 * j], y1 = points[2 * j + 1];
    const cr = x0 * y1 - x1 * y0;
    a2 += cr;
    cx += (x0 + x1) * cr;
    cy += (y0 + y1) * cr;
  }
  const area = Math.abs(a2) / 2;
  cx /= 3 * a2;
  cy /= 3 * a2;
  const v: number[] = [];
  for (let i = 0; i < n; i++) v.push(points[2 * i] - cx, points[2 * i + 1] - cy);
  // Winding with a positive shoelace sum (outward normal = (dy, -dx)).
  if (a2 < 0) {
    const r: number[] = [];
    for (let i = n - 1; i >= 0; i--) r.push(v[2 * i], v[2 * i + 1]);
    for (let i = 0; i < 2 * n; i++) v[i] = r[i];
  }
  let inertia = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x0 = v[2 * i], y0 = v[2 * i + 1], x1 = v[2 * j], y1 = v[2 * j + 1];
    inertia += (x0 * y1 - x1 * y0) * (x0 * x0 + x0 * x1 + x1 * x1 + y0 * y0 + y0 * y1 + y1 * y1);
  }
  return { kind: "poly", verts: v, area, inertia: Math.abs(inertia) / 12 };
}

/** An isosceles triangle with the base on the bottom and the apex up (y points down on screen). */
export const triangleShape = (w: number, h: number) => polyShape([-w / 2, h, w / 2, h, 0, 0]);
/** A right triangle: the right angle at bottom-left (dir < 0 at bottom-right). */
export const wedgeShape = (w: number, h: number, dir = 1) =>
  polyShape(dir > 0 ? [0, h, w, h, 0, 0] : [0, h, w, h, w, 0]);

export function makeBody(id: number, d: BodyDef): Body {
  const density = d.density ?? 1;
  const sh = d.shape;
  const area = shapeArea(sh);
  const mass = density * area;
  let inertia = 0;
  if (mass > 0) {
    inertia = sh.kind === "box"
      ? (mass * ((2 * sh.hw) ** 2 + (2 * sh.hh) ** 2)) / 12
      : sh.kind === "circle"
        ? 0.5 * mass * sh.r * sh.r
        : density * sh.inertia;
  }
  let lv: number[] = [];
  if (sh.kind === "box") lv = [-sh.hw, -sh.hh, sh.hw, -sh.hh, sh.hw, sh.hh, -sh.hw, sh.hh];
  else if (sh.kind === "poly") lv = sh.verts;
  const nv = lv.length / 2;
  const ln = new Float64Array(2 * nv);
  for (let i = 0; i < nv; i++) {
    const j = (i + 1) % nv;
    const dx = lv[2 * j] - lv[2 * i];
    const dy = lv[2 * j + 1] - lv[2 * i + 1];
    const len = Math.hypot(dx, dy) || 1;
    ln[2 * i] = dy / len;
    ln[2 * i + 1] = -dx / len;
  }
  const a = d.angle ?? 0;
  const b: Body = {
    id, shape: sh, x: d.x, y: d.y, a, cos: Math.cos(a), sin: Math.sin(a), vx: d.vx ?? 0, vy: d.vy ?? 0, w: d.w ?? 0, bvx: 0, bvy: 0, bw: 0,
    mass, invMass: mass > 0 ? 1 / mass : 0, invI: inertia > 0 ? 1 / inertia : 0,
    friction: d.friction ?? 0.6, restitution: d.restitution ?? 0.1,
    linearDamping: d.linearDamping ?? 0.02, angularDamping: d.angularDamping ?? (sh.kind === "circle" ? 1.2 : 0.1),
    group: d.group ?? 0, awake: mass > 0, sleepTime: 0, removed: false, minX: 0, minY: 0, maxX: 0, maxY: 0, idx: 0, user: d.user,
    nv, lv: Float64Array.from(lv), ln, wv: new Float64Array(2 * nv), wn: new Float64Array(2 * nv),
  };
  computeAABB(b);
  return b;
}

/** Refresh the world-space vertices, normals and bounding box after the body moved. */
function computeAABB(b: Body) {
  const sh = b.shape;
  if (sh.kind === "circle") {
    const r = sh.r;
    b.minX = b.x - r;
    b.maxX = b.x + r;
    b.minY = b.y - r;
    b.maxY = b.y + r;
  } else {
    const c = b.cos;
    const s = b.sin;
    let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
    const { lv, ln, wv, wn } = b;
    for (let i = 0; i < b.nv; i++) {
      const lx = lv[2 * i], ly = lv[2 * i + 1];
      const x = b.x + c * lx - s * ly;
      const y = b.y + s * lx + c * ly;
      wv[2 * i] = x;
      wv[2 * i + 1] = y;
      wn[2 * i] = c * ln[2 * i] - s * ln[2 * i + 1];
      wn[2 * i + 1] = s * ln[2 * i] + c * ln[2 * i + 1];
      if (x < mnx) mnx = x;
      if (x > mxx) mxx = x;
      if (y < mny) mny = y;
      if (y > mxy) mxy = y;
    }
    b.minX = mnx;
    b.maxX = mxx;
    b.minY = mny;
    b.maxY = mxy;
  }
  const m = 0.02;
  b.minX -= m;
  b.minY -= m;
  b.maxX += m;
  b.maxY += m;
}

// ---------------------------------------------------------------- narrow phase

// Scratch storage so collision tests never allocate.
const tmp: [Contact, Contact] = [newContact(), newContact()];

interface ClipV {
  x: number;
  y: number;
  in1: number;
  out1: number;
  in2: number;
  out2: number;
}
const cv = (): ClipV => ({ x: 0, y: 0, in1: 0, out1: 0, in2: 0, out2: 0 });
const incident: [ClipV, ClipV] = [cv(), cv()];
const clip1: [ClipV, ClipV] = [cv(), cv()];
const clip2: [ClipV, ClipV] = [cv(), cv()];

function copyClip(dst: ClipV, src: ClipV) {
  dst.x = src.x;
  dst.y = src.y;
  dst.in1 = src.in1;
  dst.out1 = src.out1;
  dst.in2 = src.in2;
  dst.out2 = src.out2;
}

function clipSegment(out: [ClipV, ClipV], vin: [ClipV, ClipV], nx: number, ny: number, offset: number, clipEdge: number): number {
  let n = 0;
  const d0 = nx * vin[0].x + ny * vin[0].y - offset;
  const d1 = nx * vin[1].x + ny * vin[1].y - offset;
  if (d0 <= 0) copyClip(out[n++], vin[0]);
  if (d1 <= 0) copyClip(out[n++], vin[1]);
  if (d0 * d1 < 0 && n < 2) {
    const t = d0 / (d0 - d1);
    const o = out[n];
    if (d0 > 0) {
      copyClip(o, vin[0]);
      o.in1 = clipEdge;
      o.in2 = 0;
    } else {
      copyClip(o, vin[1]);
      o.out1 = clipEdge;
      o.out2 = 0;
    }
    o.x = vin[0].x + t * (vin[1].x - vin[0].x);
    o.y = vin[0].y + t * (vin[1].y - vin[0].y);
    n++;
  }
  return n;
}

function setV(v: ClipV, x: number, y: number, in2: number, out2: number) {
  v.x = x;
  v.y = y;
  v.in1 = 0;
  v.out1 = 0;
  v.in2 = in2;
  v.out2 = out2;
}

/** The edge of a box most anti-parallel to the reference normal, in world space. */
function incidentEdge(hw: number, hh: number, b: Body, nx: number, ny: number) {
  const c = b.cos;
  const s = b.sin;
  // Normal in the incident box's frame, flipped.
  const lx = -(c * nx + s * ny);
  const ly = -(-s * nx + c * ny);
  const [v0, v1] = incident;
  if (Math.abs(lx) > Math.abs(ly)) {
    if (lx > 0) {
      setV(v0, hw, -hh, 3, 4);
      setV(v1, hw, hh, 4, 1);
    } else {
      setV(v0, -hw, hh, 1, 2);
      setV(v1, -hw, -hh, 2, 3);
    }
  } else if (ly > 0) {
    setV(v0, hw, hh, 4, 1);
    setV(v1, -hw, hh, 1, 2);
  } else {
    setV(v0, -hw, -hh, 2, 3);
    setV(v1, hw, -hh, 3, 4);
  }
  for (const v of incident) {
    const x = v.x;
    const y = v.y;
    v.x = b.x + c * x - s * y;
    v.y = b.y + s * x + c * y;
  }
}

const featureKey = (v: ClipV, flip: boolean) =>
  flip ? v.in2 | (v.out2 << 3) | (v.in1 << 6) | (v.out1 << 9) : v.in1 | (v.out1 << 3) | (v.in2 << 6) | (v.out2 << 9);

/** Box vs box. Normal from A to B. Writes up to two contacts into tmp. */
export function collideBoxes(A: Body, B: Body, out: [Contact, Contact] = tmp): number {
  if (A.shape.kind !== "box" || B.shape.kind !== "box") return 0;
  const hAx = A.shape.hw, hAy = A.shape.hh, hBx = B.shape.hw, hBy = B.shape.hh;
  const cA = A.cos, sA = A.sin, cB = B.cos, sB = B.sin;
  const dpx = B.x - A.x;
  const dpy = B.y - A.y;
  const dAx = cA * dpx + sA * dpy;
  const dAy = -sA * dpx + cA * dpy;
  const dBx = cB * dpx + sB * dpy;
  const dBy = -sB * dpx + cB * dpy;
  // C = RotA^T * RotB
  const c11 = Math.abs(cA * cB + sA * sB);
  const c12 = Math.abs(sA * cB - cA * sB);
  const c21 = Math.abs(cA * sB - sA * cB);
  const c22 = Math.abs(sA * sB + cA * cB);

  const faceAx = Math.abs(dAx) - hAx - (c11 * hBx + c12 * hBy);
  const faceAy = Math.abs(dAy) - hAy - (c21 * hBx + c22 * hBy);
  const M = PHYS.margin;
  if (faceAx > M || faceAy > M) return 0;
  const faceBx = Math.abs(dBx) - (c11 * hAx + c21 * hAy) - hBx;
  const faceBy = Math.abs(dBy) - (c12 * hAx + c22 * hAy) - hBy;
  if (faceBx > M || faceBy > M) return 0;

  // Pick the axis of least penetration, preferring A's faces for coherence.
  let axis = 0;
  let sep = faceAx;
  let nx = dAx > 0 ? cA : -cA;
  let ny = dAx > 0 ? sA : -sA;
  const rel = 0.95;
  const abs = 0.01;
  if (faceAy > rel * sep + abs * hAy) {
    axis = 1;
    sep = faceAy;
    nx = dAy > 0 ? -sA : sA;
    ny = dAy > 0 ? cA : -cA;
  }
  if (faceBx > rel * sep + abs * hBx) {
    axis = 2;
    sep = faceBx;
    nx = dBx > 0 ? cB : -cB;
    ny = dBx > 0 ? sB : -sB;
  }
  if (faceBy > rel * sep + abs * hBy) {
    axis = 3;
    sep = faceBy;
    nx = dBy > 0 ? -sB : sB;
    ny = dBy > 0 ? cB : -cB;
  }

  let fnx: number, fny: number, front: number, snx: number, sny: number, negSide: number, posSide: number;
  let negEdge: number, posEdge: number;
  if (axis === 0) {
    fnx = nx; fny = ny;
    front = A.x * fnx + A.y * fny + hAx;
    snx = -sA; sny = cA;
    const side = A.x * snx + A.y * sny;
    negSide = -side + hAy;
    posSide = side + hAy;
    negEdge = 3; posEdge = 1;
    incidentEdge(hBx, hBy, B, fnx, fny);
  } else if (axis === 1) {
    fnx = nx; fny = ny;
    front = A.x * fnx + A.y * fny + hAy;
    snx = cA; sny = sA;
    const side = A.x * snx + A.y * sny;
    negSide = -side + hAx;
    posSide = side + hAx;
    negEdge = 2; posEdge = 4;
    incidentEdge(hBx, hBy, B, fnx, fny);
  } else if (axis === 2) {
    fnx = -nx; fny = -ny;
    front = B.x * fnx + B.y * fny + hBx;
    snx = -sB; sny = cB;
    const side = B.x * snx + B.y * sny;
    negSide = -side + hBy;
    posSide = side + hBy;
    negEdge = 3; posEdge = 1;
    incidentEdge(hAx, hAy, A, fnx, fny);
  } else {
    fnx = -nx; fny = -ny;
    front = B.x * fnx + B.y * fny + hBy;
    snx = cB; sny = sB;
    const side = B.x * snx + B.y * sny;
    negSide = -side + hBx;
    posSide = side + hBx;
    negEdge = 2; posEdge = 4;
    incidentEdge(hAx, hAy, A, fnx, fny);
  }

  if (clipSegment(clip1, incident, -snx, -sny, negSide, negEdge) < 2) return 0;
  if (clipSegment(clip2, clip1, snx, sny, posSide, posEdge) < 2) return 0;

  let n = 0;
  const flip = axis >= 2;
  for (let i = 0; i < 2; i++) {
    const v = clip2[i];
    const s = fnx * v.x + fny * v.y - front;
    if (s <= M) {
      const c = out[n++];
      c.sep = s;
      c.nx = nx;
      c.ny = ny;
      // Slide the point onto the reference face.
      c.x = v.x - s * fnx;
      c.y = v.y - s * fny;
      c.feature = featureKey(v, flip);
    }
  }
  return n;
}

/** Circle vs circle. Normal from A to B. */
export function collideCircles(A: Body, B: Body, out: [Contact, Contact] = tmp): number {
  if (A.shape.kind !== "circle" || B.shape.kind !== "circle") return 0;
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const rs = A.shape.r + B.shape.r;
  const d2 = dx * dx + dy * dy;
  const rm = rs + PHYS.margin;
  if (d2 > rm * rm) return 0;
  const d = Math.sqrt(d2);
  const nx = d > 1e-9 ? dx / d : 0;
  const ny = d > 1e-9 ? dy / d : 1;
  const c = out[0];
  c.nx = nx;
  c.ny = ny;
  c.sep = d - rs;
  c.x = A.x + nx * (A.shape.r + c.sep / 2);
  c.y = A.y + ny * (A.shape.r + c.sep / 2);
  c.feature = 0;
  return 1;
}

/** Box (A) vs circle (B). Normal from A to B. */
export function collideBoxCircle(A: Body, B: Body, out: [Contact, Contact] = tmp): number {
  if (A.shape.kind !== "box" || B.shape.kind !== "circle") return 0;
  const hw = A.shape.hw;
  const hh = A.shape.hh;
  const r = B.shape.r;
  const c = A.cos;
  const s = A.sin;
  const wx = B.x - A.x;
  const wy = B.y - A.y;
  // Circle centre in the box's frame.
  const lx = c * wx + s * wy;
  const ly = -s * wx + c * wy;
  let px: number, py: number, nlx: number, nly: number, sep: number;
  if (Math.abs(lx) <= hw && Math.abs(ly) <= hh) {
    // Centre inside: push out through the nearest face.
    const ex = hw - Math.abs(lx);
    const ey = hh - Math.abs(ly);
    if (ex < ey) {
      nlx = lx >= 0 ? 1 : -1;
      nly = 0;
      px = nlx * hw;
      py = ly;
      sep = -ex - r;
    } else {
      nlx = 0;
      nly = ly >= 0 ? 1 : -1;
      px = lx;
      py = nly * hh;
      sep = -ey - r;
    }
  } else {
    px = Math.max(-hw, Math.min(hw, lx));
    py = Math.max(-hh, Math.min(hh, ly));
    const dx = lx - px;
    const dy = ly - py;
    const d2 = dx * dx + dy * dy;
    const rm = r + PHYS.margin;
    if (d2 > rm * rm) return 0;
    const d = Math.sqrt(d2);
    nlx = dx / d;
    nly = dy / d;
    sep = d - r;
  }
  const k = out[0];
  k.nx = c * nlx - s * nly;
  k.ny = s * nlx + c * nly;
  k.x = A.x + c * px - s * py;
  k.y = A.y + s * px + c * py;
  k.sep = sep;
  k.feature = 0;
  return 1;
}

// Scratch for the clipper.
const clipIn = [0, 0, 0, 0];
const clipA = [0, 0, 0, 0];
const clipB = [0, 0, 0, 0];

/** Largest (closest to zero) separation of A's edges against B's vertices; writes the edge into edgeOut[0]. */
const edgeOut = [0];
function maxSeparation(A: Body, B: Body): number {
  let best = -Infinity;
  let bi = 0;
  const { wv: av, wn: an } = A;
  const { wv: bv } = B;
  for (let i = 0; i < A.nv; i++) {
    const nx = an[2 * i], ny = an[2 * i + 1];
    const vx = av[2 * i], vy = av[2 * i + 1];
    let si = Infinity;
    for (let j = 0; j < B.nv; j++) {
      const d = nx * (bv[2 * j] - vx) + ny * (bv[2 * j + 1] - vy);
      if (d < si) si = d;
    }
    if (si > best) {
      best = si;
      bi = i;
    }
  }
  edgeOut[0] = bi;
  return best;
}

/** Convex polygon (or box) vs convex polygon (or box). Normal from A to B. */
export function collidePolys(A: Body, B: Body, out: [Contact, Contact] = tmp): number {
  if (A.shape.kind === "circle" || B.shape.kind === "circle") return 0;
  const sepA = maxSeparation(A, B);
  if (sepA > PHYS.margin) return 0;
  const edgeA = edgeOut[0];
  const sepB = maxSeparation(B, A);
  if (sepB > PHYS.margin) return 0;
  const edgeB = edgeOut[0];
  let ref = A, inc = B, refEdge = edgeA;
  let flip = false;
  if (sepB > sepA + 0.0008) {
    ref = B;
    inc = A;
    refEdge = edgeB;
    flip = true;
  }
  const rn = ref.wn;
  const rnx = rn[2 * refEdge], rny = rn[2 * refEdge + 1];
  // Incident edge: the one on the other polygon most facing the reference face.
  let incEdge = 0;
  let minDot = Infinity;
  for (let j = 0; j < inc.nv; j++) {
    const d = rnx * inc.wn[2 * j] + rny * inc.wn[2 * j + 1];
    if (d < minDot) {
      minDot = d;
      incEdge = j;
    }
  }
  const i2 = (incEdge + 1) % inc.nv;
  clipIn[0] = inc.wv[2 * incEdge];
  clipIn[1] = inc.wv[2 * incEdge + 1];
  clipIn[2] = inc.wv[2 * i2];
  clipIn[3] = inc.wv[2 * i2 + 1];
  const r2 = (refEdge + 1) % ref.nv;
  const v1x = ref.wv[2 * refEdge], v1y = ref.wv[2 * refEdge + 1];
  const v2x = ref.wv[2 * r2], v2y = ref.wv[2 * r2 + 1];
  let tx = v2x - v1x;
  let ty = v2y - v1y;
  const tl = Math.hypot(tx, ty) || 1;
  tx /= tl;
  ty /= tl;
  if (clipLine(clipA, clipIn, -tx, -ty, -(tx * v1x + ty * v1y)) < 2) return 0;
  if (clipLine(clipB, clipA, tx, ty, tx * v2x + ty * v2y) < 2) return 0;
  const front = rnx * v1x + rny * v1y;
  let n = 0;
  for (let k = 0; k < 2; k++) {
    const px = clipB[2 * k], py = clipB[2 * k + 1];
    const sep = rnx * px + rny * py - front;
    if (sep <= PHYS.margin) {
      const c = out[n++];
      c.sep = sep;
      c.nx = flip ? -rnx : rnx;
      c.ny = flip ? -rny : rny;
      c.x = px - sep * rnx;
      c.y = py - sep * rny;
      c.feature = (flip ? 4096 : 0) | (refEdge << 8) | (incEdge << 4) | k;
    }
  }
  return n;
}

/** Clip a 2-point segment to the half-plane dot(n, p) <= offset. Returns the number of points kept. */
function clipLine(out: number[], inp: number[], nx: number, ny: number, offset: number): number {
  let n = 0;
  const d0 = nx * inp[0] + ny * inp[1] - offset;
  const d1 = nx * inp[2] + ny * inp[3] - offset;
  if (d0 <= 0) {
    out[0] = inp[0];
    out[1] = inp[1];
    n++;
  }
  if (d1 <= 0) {
    out[2 * n] = inp[2];
    out[2 * n + 1] = inp[3];
    n++;
  }
  if (d0 * d1 < 0 && n < 2) {
    const t = d0 / (d0 - d1);
    out[2 * n] = inp[0] + t * (inp[2] - inp[0]);
    out[2 * n + 1] = inp[1] + t * (inp[3] - inp[1]);
    n++;
  }
  return n;
}

/** Convex polygon (A) vs circle (B). Normal from A to B. */
export function collidePolyCircle(A: Body, B: Body, out: [Contact, Contact] = tmp): number {
  if (A.shape.kind === "circle" || B.shape.kind !== "circle") return 0;
  const r = B.shape.r;
  const { wv, wn, nv } = A;
  let best = -Infinity;
  let bi = 0;
  for (let i = 0; i < nv; i++) {
    const s = wn[2 * i] * (B.x - wv[2 * i]) + wn[2 * i + 1] * (B.y - wv[2 * i + 1]);
    if (s > r + PHYS.margin) return 0;
    if (s > best) {
      best = s;
      bi = i;
    }
  }
  const j = (bi + 1) % nv;
  const ax = wv[2 * bi], ay = wv[2 * bi + 1], bx = wv[2 * j], by = wv[2 * j + 1];
  const k = out[0];
  k.feature = bi;
  if (best < 1e-9) {
    // Centre inside the polygon: push out through the nearest face.
    k.nx = wn[2 * bi];
    k.ny = wn[2 * bi + 1];
    k.sep = best - r;
    k.x = B.x - k.nx * (r + best / 2);
    k.y = B.y - k.ny * (r + best / 2);
    return 1;
  }
  const u1 = (B.x - ax) * (bx - ax) + (B.y - ay) * (by - ay);
  const u2 = (B.x - bx) * (ax - bx) + (B.y - by) * (ay - by);
  if (u1 <= 0 || u2 <= 0) {
    const cx = u1 <= 0 ? ax : bx;
    const cy = u1 <= 0 ? ay : by;
    const dx = B.x - cx, dy = B.y - cy;
    const d2 = dx * dx + dy * dy;
    const rm = r + PHYS.margin;
    if (d2 > rm * rm) return 0;
    const d = Math.sqrt(d2) || 1e-9;
    k.nx = dx / d;
    k.ny = dy / d;
    k.sep = d - r;
    k.x = cx;
    k.y = cy;
    k.feature = 100 + (u1 <= 0 ? bi : j);
    return 1;
  }
  k.nx = wn[2 * bi];
  k.ny = wn[2 * bi + 1];
  k.sep = best - r;
  k.x = B.x - k.nx * (r + k.sep / 2);
  k.y = B.y - k.ny * (r + k.sep / 2);
  return 1;
}

/** Collide any two bodies; normal from a to b. */
export function collide(a: Body, b: Body, out: [Contact, Contact] = tmp): number {
  const ka = a.shape.kind;
  const kb = b.shape.kind;
  if (ka === "circle" && kb === "circle") return collideCircles(a, b, out);
  if (ka === "box" && kb === "box") return collideBoxes(a, b, out);
  if (ka === "box" && kb === "circle") return collideBoxCircle(a, b, out);
  if (ka === "circle" || kb === "circle") {
    if (ka === "circle") {
      const n = kb === "box" ? collideBoxCircle(b, a, out) : collidePolyCircle(b, a, out);
      for (let i = 0; i < n; i++) {
        out[i].nx = -out[i].nx;
        out[i].ny = -out[i].ny;
      }
      return n;
    }
    return collidePolyCircle(a, b, out);
  }
  return collidePolys(a, b, out);
}

// ---------------------------------------------------------------- the world

const isDynamic = (b: Body) => b.invMass > 0;

export class World {
  bodies: Body[] = [];
  arbiters = new Map<number, Arbiter>();
  gravity = PHYS.gravity;
  iterations = PHYS.iterations;
  /** Arbiters that had an impact impulse above the threshold in the last step. */
  impacts: Arbiter[] = [];
  impactThreshold = 0.25;
  time = 0;
  private nextId = 1;
  private stamp = 0;
  private sorted: Body[] = [];
  private active: Arbiter[] = [];
  private parent = new Int32Array(64);
  private minSleep = new Float64Array(64);

  add(def: BodyDef): Body {
    const b = makeBody(this.nextId++, def);
    this.bodies.push(b);
    this.sorted.push(b);
    return b;
  }

  remove(b: Body) {
    if (b.removed) return;
    b.removed = true;
    for (const [key, arb] of this.arbiters) {
      if (arb.a === b || arb.b === b) {
        const other = arb.a === b ? arb.b : arb.a;
        if (isDynamic(other)) this.wake(other);
        this.arbiters.delete(key);
      }
    }
    this.bodies = this.bodies.filter((x) => x !== b);
    this.sorted = this.sorted.filter((x) => x !== b);
  }

  /** Wake a body and everything resting against it. */
  wake(b: Body) {
    if (!isDynamic(b)) return;
    const stack = [b];
    while (stack.length) {
      const x = stack.pop()!;
      if (x.awake && x !== b) continue;
      const was = x.awake;
      x.awake = true;
      x.sleepTime = 0;
      if (was && x !== b) continue;
      for (const arb of this.arbiters.values()) {
        if (arb.n === 0) continue;
        const o = arb.a === x ? arb.b : arb.b === x ? arb.a : null;
        if (o && isDynamic(o) && !o.awake) stack.push(o);
      }
    }
  }

  applyImpulse(b: Body, jx: number, jy: number, px = b.x, py = b.y) {
    if (!isDynamic(b)) return;
    this.wake(b);
    b.vx += jx * b.invMass;
    b.vy += jy * b.invMass;
    b.w += b.invI * ((px - b.x) * jy - (py - b.y) * jx);
  }

  step(dt = PHYS.dt) {
    const inv = dt > 0 ? 1 / dt : 0;
    this.time += dt;
    this.stamp++;
    this.broadPhase();

    for (const b of this.bodies) {
      if (!isDynamic(b) || !b.awake) continue;
      b.vy += this.gravity * dt;
      const sp2 = b.vx * b.vx + b.vy * b.vy;
      if (sp2 > PHYS.maxSpeed * PHYS.maxSpeed) {
        const k = PHYS.maxSpeed / Math.sqrt(sp2);
        b.vx *= k;
        b.vy *= k;
      }
      b.vx *= 1 / (1 + dt * b.linearDamping);
      b.vy *= 1 / (1 + dt * b.linearDamping);
      b.w *= 1 / (1 + dt * b.angularDamping);
    }

    const act = this.active;
    act.length = 0;
    this.impacts.length = 0;
    for (const arb of this.arbiters.values()) {
      if ((isDynamic(arb.a) && arb.a.awake) || (isDynamic(arb.b) && arb.b.awake)) {
        act.push(arb);
        preStep(arb, inv);
        if (arb.impact > this.impactThreshold) this.impacts.push(arb);
      }
    }
    for (const b of this.bodies) {
      b.bvx = 0;
      b.bvy = 0;
      b.bw = 0;
    }
    for (let it = 0; it < this.iterations; it++) for (let i = 0; i < act.length; i++) applyImpulse(act[i]);

    for (const b of this.bodies) {
      if (!isDynamic(b) || !b.awake) continue;
      b.x += (b.vx + b.bvx) * dt;
      b.y += (b.vy + b.bvy) * dt;
      if (b.w !== 0 || b.bw !== 0) {
        b.a += (b.w + b.bw) * dt;
        b.cos = Math.cos(b.a);
        b.sin = Math.sin(b.a);
      }
    }
    this.updateSleep(dt);
  }

  private broadPhase() {
    const s = this.sorted;
    for (const b of s) if (b.awake && isDynamic(b)) computeAABB(b);
    // Insertion sort by minX: nearly sorted from the last step, so this is cheap.
    for (let i = 1; i < s.length; i++) {
      const b = s[i];
      let j = i - 1;
      while (j >= 0 && s[j].minX > b.minX) {
        s[j + 1] = s[j];
        j--;
      }
      s[j + 1] = b;
    }
    for (let i = 0; i < s.length; i++) {
      const A = s[i];
      for (let j = i + 1; j < s.length; j++) {
        const B = s[j];
        if (B.minX > A.maxX) break;
        if (B.minY > A.maxY || B.maxY < A.minY) continue;
        if (!isDynamic(A) && !isDynamic(B)) continue;
        if (A.group !== 0 && A.group === B.group) continue;
        this.pair(A.id < B.id ? A : B, A.id < B.id ? B : A);
      }
    }
    for (const [key, arb] of this.arbiters) if (arb.stamp !== this.stamp) this.arbiters.delete(key);
  }

  private pair(a: Body, b: Body) {
    const key = a.id * 131072 + b.id;
    const restA = !isDynamic(a) || !a.awake;
    const restB = !isDynamic(b) || !b.awake;
    let arb = this.arbiters.get(key);
    if (restA && restB) {
      // Neither can move: keep what we knew (it links sleeping islands together).
      if (arb) arb.stamp = this.stamp;
      return;
    }
    const n = collide(a, b, tmp);
    if (n === 0) return;
    if (isDynamic(a) && !a.awake) this.wake(a);
    if (isDynamic(b) && !b.awake) this.wake(b);
    if (!arb) {
      arb = {
        a, b, contacts: [newContact(), newContact()], n: 0, stamp: 0, impact: 0, block: false, k11: 0, k12: 0, k22: 0, i11: 0, i12: 0, i22: 0,
        friction: Math.sqrt(a.friction * b.friction), restitution: Math.max(a.restitution, b.restitution),
      };
      this.arbiters.set(key, arb);
    }
    arb.stamp = this.stamp;
    // Carry accumulated impulses over to matching features (warm starting).
    let pn0 = 0, pt0 = 0, pn1 = 0, pt1 = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < arb.n; j++) {
        if (arb.contacts[j].feature === tmp[i].feature) {
          if (i === 0) {
            pn0 = arb.contacts[j].pn;
            pt0 = arb.contacts[j].pt;
          } else {
            pn1 = arb.contacts[j].pn;
            pt1 = arb.contacts[j].pt;
          }
          break;
        }
      }
    }
    for (let i = 0; i < n; i++) {
      const c = arb.contacts[i];
      const t = tmp[i];
      c.x = t.x;
      c.y = t.y;
      c.nx = t.nx;
      c.ny = t.ny;
      c.sep = t.sep;
      c.feature = t.feature;
      c.pn = i === 0 ? pn0 : pn1;
      c.pt = i === 0 ? pt0 : pt1;
    }
    arb.n = n;
  }

  private updateSleep(dt: number) {
    const bodies = this.bodies;
    const n = bodies.length;
    if (this.parent.length < n) {
      this.parent = new Int32Array(n * 2);
      this.minSleep = new Float64Array(n * 2);
    }
    const lin2 = PHYS.sleepLinear * PHYS.sleepLinear;
    const ang2 = PHYS.sleepAngular * PHYS.sleepAngular;
    const parent = this.parent;
    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      b.idx = i;
      parent[i] = i;
      if (!isDynamic(b) || !b.awake) continue;
      if (b.vx * b.vx + b.vy * b.vy > lin2 || b.w * b.w > ang2) b.sleepTime = 0;
      else b.sleepTime += dt;
    }
    const find = (i: number) => {
      while (parent[i] !== i) {
        parent[i] = parent[parent[i]];
        i = parent[i];
      }
      return i;
    };
    for (const arb of this.active) {
      if (arb.n === 0 || !isDynamic(arb.a) || !isDynamic(arb.b) || arb.a.removed || arb.b.removed) continue;
      const ra = find(arb.a.idx);
      const rb = find(arb.b.idx);
      if (ra !== rb) parent[ra] = rb;
    }
    const minSleep = this.minSleep;
    for (let i = 0; i < n; i++) minSleep[i] = Infinity;
    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      if (!isDynamic(b) || !b.awake) continue;
      const r = find(i);
      if (b.sleepTime < minSleep[r]) minSleep[r] = b.sleepTime;
    }
    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      if (!isDynamic(b) || !b.awake) continue;
      if (minSleep[find(i)] >= PHYS.timeToSleep) {
        b.awake = false;
        b.vx = 0;
        b.vy = 0;
        b.w = 0;
      }
    }
  }

  /** True when nothing is moving faster than the given speed. */
  isQuiet(speed = 0.15): boolean {
    const s2 = speed * speed;
    for (const b of this.bodies) {
      if (!isDynamic(b) || !b.awake) continue;
      if (b.vx * b.vx + b.vy * b.vy > s2 || b.w * b.w > s2 * 4) return false;
    }
    return true;
  }
}

function preStep(arb: Arbiter, invDt: number) {
  const a = arb.a;
  const b = arb.b;
  arb.impact = 0;
  arb.block = false;
  for (let i = 0; i < arb.n; i++) {
    const c = arb.contacts[i];
    const nx = c.nx;
    const ny = c.ny;
    const r1x = c.x - a.x, r1y = c.y - a.y, r2x = c.x - b.x, r2y = c.y - b.y;
    c.r1x = r1x; c.r1y = r1y; c.r2x = r2x; c.r2y = r2y;
    const rn1 = r1x * ny - r1y * nx;
    const rn2 = r2x * ny - r2y * nx;
    c.rn1 = rn1;
    c.rn2 = rn2;
    const kN = a.invMass + b.invMass + a.invI * rn1 * rn1 + b.invI * rn2 * rn2;
    c.massN = 1 / kN;
    const tx = ny;
    const ty = -nx;
    const rt1 = r1x * ty - r1y * tx;
    const rt2 = r2x * ty - r2y * tx;
    const kT = a.invMass + b.invMass + a.invI * rt1 * rt1 + b.invI * rt2 * rt2;
    c.massT = 1 / kT;

    const dvx = b.vx - b.w * r2y - a.vx + a.w * r1y;
    const dvy = b.vy + b.w * r2x - a.vy - a.w * r1x;
    const vn = dvx * nx + dvy * ny;
    const closing = vn < -PHYS.impactSpeed && (c.sep <= 0 || -vn / invDt > c.sep);
    c.impact = closing ? (-vn - PHYS.impactSpeed) * c.massN : 0;
    arb.impact += c.impact;

    let bias = -PHYS.baumgarte * invDt * Math.min(0, c.sep + PHYS.slop);
    if (bias > PHYS.maxBias) bias = PHYS.maxBias;
    c.bias = bias;
    c.bounce = c.sep > 0 ? -c.sep * invDt : vn < -PHYS.restitutionThreshold ? -arb.restitution * vn : 0;
    c.pnb = 0;
  }
  if (arb.n === 2) {
    // The two normal constraints are solved together (a 2x2 block) so boxes sit flat instead of rocking.
    const c0 = arb.contacts[0];
    const c1 = arb.contacts[1];
    const mS = a.invMass + b.invMass;
    const k11 = mS + a.invI * c0.rn1 * c0.rn1 + b.invI * c0.rn2 * c0.rn2;
    const k22 = mS + a.invI * c1.rn1 * c1.rn1 + b.invI * c1.rn2 * c1.rn2;
    const k12 = mS + a.invI * c0.rn1 * c1.rn1 + b.invI * c0.rn2 * c1.rn2;
    if (k11 * k11 < 1000 * (k11 * k22 - k12 * k12)) {
      const det = 1 / (k11 * k22 - k12 * k12);
      arb.k11 = k11;
      arb.k12 = k12;
      arb.k22 = k22;
      arb.i11 = k22 * det;
      arb.i12 = -k12 * det;
      arb.i22 = k11 * det;
      arb.block = true;
    }
  }
  // Warm start with last step's impulses.
  for (let i = 0; i < arb.n; i++) {
    const c = arb.contacts[i];
    const nx = c.nx;
    const ny = c.ny;
    const px = c.pn * nx + c.pt * ny;
    const py = c.pn * ny - c.pt * nx;
    a.vx -= a.invMass * px;
    a.vy -= a.invMass * py;
    a.w -= a.invI * (c.r1x * py - c.r1y * px);
    b.vx += b.invMass * px;
    b.vy += b.invMass * py;
    b.w += b.invI * (c.r2x * py - c.r2y * px);
  }
}

function applyImpulse(arb: Arbiter) {
  const a = arb.a;
  const b = arb.b;
  const n = arb.n;
  // Friction first, limited by the normal impulses from the previous iteration.
  for (let i = 0; i < n; i++) {
    const c = arb.contacts[i];
    const nx = c.nx;
    const ny = c.ny;
    const r1x = c.r1x, r1y = c.r1y, r2x = c.r2x, r2y = c.r2y;
    const dvx = b.vx - b.w * r2y - a.vx + a.w * r1y;
    const dvy = b.vy + b.w * r2x - a.vy - a.w * r1x;
    const tx = ny;
    const ty = -nx;
    const vt = dvx * tx + dvy * ty;
    let dPt = c.massT * -vt;
    const maxPt = arb.friction * c.pn;
    const pt0 = c.pt;
    c.pt = Math.max(-maxPt, Math.min(maxPt, pt0 + dPt));
    dPt = c.pt - pt0;
    const px = dPt * tx;
    const py = dPt * ty;
    a.vx -= a.invMass * px;
    a.vy -= a.invMass * py;
    a.w -= a.invI * (r1x * py - r1y * px);
    b.vx += b.invMass * px;
    b.vy += b.invMass * py;
    b.w += b.invI * (r2x * py - r2y * px);
  }

  if (arb.block) {
    const c0 = arb.contacts[0];
    const c1 = arb.contacts[1];
    const nx = c0.nx;
    const ny = c0.ny;
    const a0 = c0.pn;
    const a1 = c1.pn;
    const vn0 = (b.vx - b.w * c0.r2y - a.vx + a.w * c0.r1y) * nx + (b.vy + b.w * c0.r2x - a.vy - a.w * c0.r1x) * ny;
    const vn1 = (b.vx - b.w * c1.r2y - a.vx + a.w * c1.r1y) * nx + (b.vy + b.w * c1.r2x - a.vy - a.w * c1.r1x) * ny;
    const { k11, k12, k22, i11, i12, i22 } = arb;
    const b0 = vn0 - c0.bounce - (k11 * a0 + k12 * a1);
    const b1 = vn1 - c1.bounce - (k12 * a0 + k22 * a1);
    let x0 = -(i11 * b0 + i12 * b1);
    let x1 = -(i12 * b0 + i22 * b1);
    let ok = x0 >= 0 && x1 >= 0;
    if (!ok) {
      x0 = -c0.massN * b0;
      x1 = 0;
      ok = x0 >= 0 && k12 * x0 + b1 >= 0;
    }
    if (!ok) {
      x0 = 0;
      x1 = -c1.massN * b1;
      ok = x1 >= 0 && k12 * x1 + b0 >= 0;
    }
    if (!ok) {
      x0 = 0;
      x1 = 0;
      ok = b0 >= 0 && b1 >= 0;
    }
    if (ok) {
      const d0 = x0 - a0;
      const d1 = x1 - a1;
      c0.pn = x0;
      c1.pn = x1;
      const p0x = d0 * nx, p0y = d0 * ny, p1x = d1 * nx, p1y = d1 * ny;
      a.vx -= a.invMass * (p0x + p1x);
      a.vy -= a.invMass * (p0y + p1y);
      a.w -= a.invI * (c0.r1x * p0y - c0.r1y * p0x + c1.r1x * p1y - c1.r1y * p1x);
      b.vx += b.invMass * (p0x + p1x);
      b.vy += b.invMass * (p0y + p1y);
      b.w += b.invI * (c0.r2x * p0y - c0.r2y * p0x + c1.r2x * p1y - c1.r2y * p1x);
    }
  } else {
    for (let i = 0; i < n; i++) {
      const c = arb.contacts[i];
      const nx = c.nx;
      const ny = c.ny;
      const dvx = b.vx - b.w * c.r2y - a.vx + a.w * c.r1y;
      const dvy = b.vy + b.w * c.r2x - a.vy - a.w * c.r1x;
      const vn = dvx * nx + dvy * ny;
      let dPn = c.massN * (-vn + c.bounce);
      const pn0 = c.pn;
      c.pn = Math.max(pn0 + dPn, 0);
      dPn = c.pn - pn0;
      const px = dPn * nx;
      const py = dPn * ny;
      a.vx -= a.invMass * px;
      a.vy -= a.invMass * py;
      a.w -= a.invI * (c.r1x * py - c.r1y * px);
      b.vx += b.invMass * px;
      b.vy += b.invMass * py;
      b.w += b.invI * (c.r2x * py - c.r2y * px);
    }
  }

  // Split impulse: push out of penetration with pseudo-velocities that never become real momentum.
  for (let i = 0; i < n; i++) {
    const c = arb.contacts[i];
    if (c.bias <= 0) continue;
    const nx = c.nx;
    const ny = c.ny;
    const bvx = b.bvx - b.bw * c.r2y - a.bvx + a.bw * c.r1y;
    const bvy = b.bvy + b.bw * c.r2x - a.bvy - a.bw * c.r1x;
    let dPb = c.massN * (c.bias - (bvx * nx + bvy * ny));
    const pb0 = c.pnb;
    c.pnb = Math.max(pb0 + dPb, 0);
    dPb = c.pnb - pb0;
    const px = dPb * nx;
    const py = dPb * ny;
    a.bvx -= a.invMass * px;
    a.bvy -= a.invMass * py;
    a.bw -= a.invI * (c.r1x * py - c.r1y * px);
    b.bvx += b.invMass * px;
    b.bvy += b.invMass * py;
    b.bw += b.invI * (c.r2x * py - c.r2y * px);
  }
}
