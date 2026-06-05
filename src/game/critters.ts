/**
 * Critter Safari — an original, Pokémon-inspired creature battle + catch game.
 *
 * Everything here is original (no real-world creature names/art): a small roster
 * of emoji critters with elemental types, a rock-paper-scissors-ish type chart,
 * and pure damage / catch-probability math so the battle is deterministic given
 * an RNG and fully unit-testable.
 */
import type { Rarity } from "./shop";
import type { RNG } from "./rng";

export type CritterType = "leaf" | "fire" | "water" | "spark";

export const TYPE_META: Record<CritterType, { label: string; color: string; icon: string }> = {
  leaf: { label: "Leaf", color: "#7ed957", icon: "🍃" },
  fire: { label: "Fire", color: "#ff6b4a", icon: "🔥" },
  water: { label: "Water", color: "#4b9bff", icon: "💧" },
  spark: { label: "Spark", color: "#ffc24b", icon: "⚡" },
};

export interface Critter {
  id: string;
  name: string;
  emoji: string;
  type: CritterType;
  maxHp: number;
  rarity: Rarity;
}

export const CRITTERS: Critter[] = [
  { id: "sprig", name: "Sprig", emoji: "🌱", type: "leaf", maxHp: 60, rarity: "common" },
  { id: "dewdrop", name: "Dewdrop", emoji: "💧", type: "water", maxHp: 60, rarity: "common" },
  { id: "embed", name: "Embor", emoji: "🔥", type: "fire", maxHp: 64, rarity: "common" },
  { id: "zappy", name: "Zappy", emoji: "⚡", type: "spark", maxHp: 58, rarity: "common" },
  { id: "snippy", name: "Snippy", emoji: "🦀", type: "water", maxHp: 72, rarity: "rare" },
  { id: "flutter", name: "Flutterling", emoji: "🦋", type: "leaf", maxHp: 70, rarity: "rare" },
  { id: "buzzle", name: "Buzzle", emoji: "🐝", type: "spark", maxHp: 74, rarity: "rare" },
  { id: "cinder", name: "Cinderpup", emoji: "🐕", type: "fire", maxHp: 78, rarity: "rare" },
  { id: "glimmar", name: "Glimmar", emoji: "✨", type: "spark", maxHp: 92, rarity: "epic" },
  { id: "mossback", name: "Mossback", emoji: "🐢", type: "leaf", maxHp: 96, rarity: "epic" },
  { id: "drakeling", name: "Drakeling", emoji: "🐉", type: "fire", maxHp: 120, rarity: "mythic" },
  { id: "prismaw", name: "Prismaw", emoji: "🦄", type: "water", maxHp: 124, rarity: "mythic" },
];

export const critter = (id: string): Critter | undefined => CRITTERS.find((c) => c.id === id);

export interface Move {
  id: string;
  name: string;
  type: CritterType;
  power: number;
}

/** Your pet's four moves — one of each type, so there's always a strategy. */
export const MOVES: Move[] = [
  { id: "vine", name: "Vine Whip", type: "leaf", power: 20 },
  { id: "ember", name: "Ember", type: "fire", power: 20 },
  { id: "bubble", name: "Bubble", type: "water", power: 20 },
  { id: "zap", name: "Zap", type: "spark", power: 20 },
];

/**
 * Attacker→defender effectiveness. A gentle triangle plus spark as a wildcard:
 *  fire > leaf > water > fire (classic), and spark > water, leaf > spark.
 */
export function effectiveness(attack: CritterType, defend: CritterType): number {
  const strong: Record<CritterType, CritterType[]> = {
    fire: ["leaf"],
    leaf: ["water", "spark"],
    water: ["fire"],
    spark: ["water"],
  };
  const weak: Record<CritterType, CritterType[]> = {
    fire: ["water"],
    leaf: ["fire"],
    water: ["leaf", "spark"],
    spark: ["leaf"],
  };
  if (strong[attack].includes(defend)) return 2;
  if (weak[attack].includes(defend)) return 0.5;
  return 1;
}

export interface DamageResult {
  damage: number;
  effectiveness: number;
}

/** Damage a move deals to a defender type, with a small random spread. */
export function moveDamage(move: Move, defenderType: CritterType, rng: RNG): DamageResult {
  const eff = effectiveness(move.type, defenderType);
  const spread = 0.85 + rng() * 0.15;
  return { damage: Math.max(1, Math.round(move.power * eff * spread)), effectiveness: eff };
}

/** Flat-ish damage the wild critter deals back to your pet. */
export function critterAttack(c: Critter, rng: RNG): number {
  const base = 8 + Math.round(c.maxHp / 12);
  return Math.max(1, Math.round(base * (0.8 + rng() * 0.4)));
}

const RARITY_CATCH_PENALTY: Record<Rarity, number> = {
  common: 0,
  rare: 0.12,
  epic: 0.24,
  mythic: 0.38,
};

/**
 * Probability of a successful catch, 0..1. Lower the critter's HP for a better
 * shot; rarer critters are harder. Always at least a sliver of a chance.
 */
export function catchChance(c: Critter, hp: number): number {
  const missing = 1 - Math.max(0, hp) / c.maxHp;
  const raw = 0.2 + missing * 0.7 - RARITY_CATCH_PENALTY[c.rarity];
  return Math.max(0.05, Math.min(0.95, raw));
}

/** Score awarded for a Safari encounter, used by the coin/XP economy. */
export function safariScore(c: Critter, outcome: "caught" | "ko" | "fled"): number {
  const rarityBonus: Record<Rarity, number> = { common: 4, rare: 8, epic: 16, mythic: 30 };
  const base = outcome === "caught" ? 24 : outcome === "ko" ? 12 : 0;
  return base + (outcome === "fled" ? 0 : rarityBonus[c.rarity]);
}

/** Pick a wild critter, weighting commons higher. Pure given `rng`. */
export function rollWildCritter(rng: RNG): Critter {
  const weight: Record<Rarity, number> = { common: 52, rare: 30, epic: 13, mythic: 5 };
  const total = CRITTERS.reduce((s, c) => s + weight[c.rarity], 0);
  let r = rng() * total;
  for (const c of CRITTERS) {
    r -= weight[c.rarity];
    if (r <= 0) return c;
  }
  return CRITTERS[0];
}

export const PET_MAX_HP = 100;
