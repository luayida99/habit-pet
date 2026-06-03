/**
 * The Mystery Egg: spend coins to hatch a random cosmetic. Duplicates refund
 * coins ("shards"), and a pity timer guarantees something good if you've been
 * unlucky — so it's always a treat, never a trap.
 */
import { cosmetics, type Rarity, type ShopItem } from "./shop";
import { weightedPick, type RNG } from "./rng";

export const EGG_PRICE = 120;

/** How many hatches without an epic+ before the next one is guaranteed. */
export const PITY_THRESHOLD = 8;

const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 58,
  rare: 30,
  epic: 10,
  mythic: 2,
};

/** Coins refunded when you hatch a cosmetic you already own. */
export const DUPLICATE_REFUND: Record<Rarity, number> = {
  common: 25,
  rare: 60,
  epic: 130,
  mythic: 280,
};

export interface GachaResult {
  item: ShopItem;
  duplicate: boolean;
  refund: number;
}

/**
 * Roll one egg. `owned` is the set of already-owned cosmetic ids; `sincePity`
 * is how many hatches since the last epic+ (used to force a good pull).
 */
export function rollGacha(owned: Set<string>, sincePity: number, rng: RNG): GachaResult {
  const pool = cosmetics();
  const forceHighRarity = sincePity >= PITY_THRESHOLD - 1;

  const weightOf = (it: ShopItem): number => {
    if (forceHighRarity && it.rarity !== "epic" && it.rarity !== "mythic") return 0;
    return RARITY_WEIGHT[it.rarity];
  };

  const item = weightedPick(pool, weightOf, rng);
  const duplicate = owned.has(item.id);
  return {
    item,
    duplicate,
    refund: duplicate ? DUPLICATE_REFUND[item.rarity] : 0,
  };
}

export const isHighRarity = (r: Rarity): boolean => r === "epic" || r === "mythic";
