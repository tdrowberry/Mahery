// Small seeded RNG (mulberry32) so engine tests are deterministic.
export interface Rng {
  next(): number;        // [0, 1)
  int(min: number, max: number): number; // inclusive
  chance(p: number): boolean;
  seed: number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    get seed() { return s; },
    set seed(v: number) { s = v >>> 0; },
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
  };
  return rng;
}
