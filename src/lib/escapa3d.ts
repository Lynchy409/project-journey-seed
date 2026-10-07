// ¡Escapa! 3D — procedural room layouts. Pure data, no rendering.
export const ROOM_LEN = 36;
export const HALF_W = 6;
export const DOOR_X = [-4, 0, 4];
export const START_Z = 2;

export type Crate = { x: number; z: number; w: number; d: number };
export type Laser = { z: number; period: number; offset: number };
export type GuardSpec = { z: number; x: number; speed: number };
export type Bone = { x: number; z: number };
export type Room3D = { crates: Crate[]; lasers: Laser[]; guards: GuardSpec[]; bones: Bone[] };

function rng(seed: number) {
  let s = (seed % 2147483646) + 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

export function makeRoom(lvl: number, qi: number): Room3D {
  const r = rng(lvl * 1013 + qi * 97 + 7);
  const lanes = [-4, 0, 4];
  const crates: Crate[] = [];
  for (const z of [-7, -17, -27]) {
    const gap = Math.floor(r() * 3);
    lanes.forEach((x, i) => { if (i !== gap) crates.push({ x, z, w: 3.4, d: 1.4 }); });
  }
  const laserCount = lvl >= 1 ? 2 : qi >= 3 ? 1 : 0;
  const lasers: Laser[] = [-3.5, -20.5].slice(0, laserCount).map((z) => ({ z, period: 2.6 - lvl * 0.3, offset: r() * 3 }));
  const guardCount = Math.min(3, 1 + lvl + (qi >= 5 ? 1 : 0));
  const guards: GuardSpec[] = [-12, -22, -32].slice(0, guardCount).map((z, i) => ({
    z, x: i % 2 ? 4.5 : -4.5, speed: 2.2 + lvl * 0.5 + qi * 0.08,
  }));
  const bones: Bone[] = [-11, -25].map((z) => ({ z, x: lanes[Math.floor(r() * 3)]! }));
  return { crates, lasers, guards, bones };
}

export function blocked(x: number, z: number, crates: Crate[], rad = 0.45) {
  if (x < -HALF_W + rad || x > HALF_W - rad || z > START_Z + 1.5) return true;
  return crates.some((c) => Math.abs(x - c.x) < c.w / 2 + rad && Math.abs(z - c.z) < c.d / 2 + rad);
}
