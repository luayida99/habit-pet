/** A 0..1 random source. Injectable so reward rolls can be tested. */
export type RNG = () => number;

/** Deterministic, well-distributed PRNG (mulberry32). */
export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const defaultRng: RNG = Math.random;

/** Pick a weighted entry from `items` using `rng`. */
export function weightedPick<T>(items: T[], weightOf: (t: T) => number, rng: RNG): T {
  const total = items.reduce((s, it) => s + weightOf(it), 0);
  let r = rng() * total;
  for (const it of items) {
    r -= weightOf(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

export const randInt = (min: number, max: number, rng: RNG): number =>
  Math.floor(rng() * (max - min + 1)) + min;
