/**
 * Adventures: send your pet on a timed expedition. It resolves in real time
 * (even while the app is closed) and returns with coins, XP, and — the fun part
 * — randomized **Discoveries** to collect. Higher tiers cost more energy and
 * take longer, but bring rarer loot.
 */
import type { Rarity } from "./shop";
import { randInt, weightedPick, type RNG } from "./rng";

export interface AdventureDef {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  durationMin: number;
  energyCost: number;
  tier: number; // 1..4
  coins: [number, number]; // min/max
  xp: [number, number];
}

export const ADVENTURES: AdventureDef[] = [
  { id: "backyard", name: "Backyard Stroll", icon: "🌳", blurb: "A quick wander for treats.", durationMin: 15, energyCost: 10, tier: 1, coins: [15, 30], xp: [10, 20] },
  { id: "forest", name: "Forest Trek", icon: "🌲", blurb: "Deeper woods, better finds.", durationMin: 60, energyCost: 18, tier: 2, coins: [40, 70], xp: [25, 45] },
  { id: "tidepools", name: "Tide Pools", icon: "🏖️", blurb: "Salty air and shiny shells.", durationMin: 120, energyCost: 26, tier: 3, coins: [80, 130], xp: [50, 80] },
  { id: "summit", name: "Summit Climb", icon: "⛰️", blurb: "A long haul for rare treasure.", durationMin: 240, energyCost: 34, tier: 4, coins: [150, 240], xp: [90, 150] },
];

export const adventureDef = (id: string): AdventureDef | undefined =>
  ADVENTURES.find((a) => a.id === id);

export interface Discovery {
  id: string;
  name: string;
  icon: string;
  rarity: Rarity;
  blurb: string;
}

export const DISCOVERIES: Discovery[] = [
  // common
  { id: "d-shell", name: "Spiral Shell", icon: "🐚", rarity: "common", blurb: "Hold it to your ear for the sea." },
  { id: "d-acorn", name: "Lucky Acorn", icon: "🌰", rarity: "common", blurb: "Mighty oaks from tiny habits grow." },
  { id: "d-feather", name: "Soft Feather", icon: "🪶", rarity: "common", blurb: "Lighter than a skipped excuse." },
  { id: "d-mushroom", name: "Glowcap", icon: "🍄", rarity: "common", blurb: "Faintly luminous. Probably safe." },
  { id: "d-pebble", name: "Heart Stone", icon: "🪨", rarity: "common", blurb: "Worn smooth into a little heart." },
  { id: "d-clover", name: "Four-Leaf Clover", icon: "🍀", rarity: "common", blurb: "Luck favors the consistent." },
  // rare
  { id: "d-map", name: "Torn Map", icon: "🗺️", rarity: "rare", blurb: "X marks a spot you'll find someday." },
  { id: "d-compass", name: "Bent Compass", icon: "🧭", rarity: "rare", blurb: "Always points toward tomorrow." },
  { id: "d-coral", name: "Coral Bit", icon: "🪸", rarity: "rare", blurb: "A blush of the reef." },
  { id: "d-key", name: "Old Key", icon: "🗝️", rarity: "rare", blurb: "Opens something, surely." },
  // epic
  { id: "d-marble", name: "Cloud Marble", icon: "🔮", rarity: "epic", blurb: "A storm sleeps inside the glass." },
  { id: "d-fossil", name: "Mystery Fossil", icon: "🦴", rarity: "epic", blurb: "A relic of an ancient streak." },
  // mythic
  { id: "d-star", name: "Fallen Star", icon: "💫", rarity: "mythic", blurb: "Still warm. Make a wish." },
  { id: "d-relic", name: "Tiny Relic", icon: "🏺", rarity: "mythic", blurb: "Older than time itself." },
];

export const discovery = (id: string): Discovery | undefined =>
  DISCOVERIES.find((d) => d.id === id);

/** Rarity weights for discoveries, by adventure tier. Higher tier → rarer. */
const TIER_WEIGHTS: Record<number, Record<Rarity, number>> = {
  1: { common: 80, rare: 18, epic: 2, mythic: 0 },
  2: { common: 55, rare: 35, epic: 9, mythic: 1 },
  3: { common: 35, rare: 42, epic: 18, mythic: 5 },
  4: { common: 18, rare: 40, epic: 30, mythic: 12 },
};

export interface AdventureLoot {
  coins: number;
  xp: number;
  discoveryId: string | null;
  /** Bonus streak-freeze token on a lucky high-tier run. */
  freeze: boolean;
}

/** Roll the rewards for a completed adventure. Pure given `rng`. */
export function rollAdventureLoot(def: AdventureDef, rng: RNG): AdventureLoot {
  const coins = randInt(def.coins[0], def.coins[1], rng);
  const xp = randInt(def.xp[0], def.xp[1], rng);

  // Most runs bring back a discovery; chance scales with tier.
  const findChance = 0.6 + def.tier * 0.1;
  let discoveryId: string | null = null;
  if (rng() < findChance) {
    const weights = TIER_WEIGHTS[def.tier];
    const picked = weightedPick(DISCOVERIES, (d) => weights[d.rarity], rng);
    discoveryId = picked.id;
  }

  // Small chance of a freeze token on tier 3+.
  const freeze = def.tier >= 3 && rng() < 0.15;

  return { coins, xp, discoveryId, freeze };
}
