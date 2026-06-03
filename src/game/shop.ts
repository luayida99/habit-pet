/** Cosmetics + consumables the player can buy with coins or win from eggs. */

export type ShopSlot = "color" | "hat" | "background" | "companion" | "consumable";

export type Rarity = "common" | "rare" | "epic" | "mythic";

export interface ShopItem {
  id: string;
  slot: ShopSlot;
  name: string;
  /** Emoji shown in the shop grid. */
  icon: string;
  price: number;
  /** For cosmetics: the value applied to the matching `equipped` slot. */
  value?: string;
  blurb: string;
  rarity: Rarity;
  /** Only obtainable from the Mystery Egg — hidden from the coin shop. */
  gachaOnly?: boolean;
}

export const RARITY_META: Record<Rarity, { label: string; color: string }> = {
  common: { label: "Common", color: "#9a93b0" },
  rare: { label: "Rare", color: "#4b9bff" },
  epic: { label: "Epic", color: "#b06bff" },
  mythic: { label: "Mythic", color: "#ffb13d" },
};

export const SHOP_ITEMS: ShopItem[] = [
  // ── Coat colors ────────────────────────────────────────────────
  { id: "color-sunshine", slot: "color", name: "Sunshine", icon: "🟡", price: 60, value: "#ffd34d", blurb: "A warm buttery glow.", rarity: "common" },
  { id: "color-bubblegum", slot: "color", name: "Bubblegum", icon: "🩷", price: 60, value: "#ff8fc4", blurb: "Sweet and bouncy pink.", rarity: "common" },
  { id: "color-matcha", slot: "color", name: "Matcha", icon: "🟢", price: 60, value: "#9bd47a", blurb: "Calm forest green.", rarity: "common" },
  { id: "color-twilight", slot: "color", name: "Twilight", icon: "🔵", price: 90, value: "#7c83ff", blurb: "Dusky periwinkle.", rarity: "rare" },
  { id: "color-ember", slot: "color", name: "Ember", icon: "🟠", price: 120, value: "#ff6b4a", blurb: "Glowing coal orange.", rarity: "rare" },
  { id: "color-galaxy", slot: "color", name: "Galaxy", icon: "🟣", price: 220, value: "#b06bff", blurb: "Stardust violet.", rarity: "epic" },

  // ── Hats ───────────────────────────────────────────────────────
  { id: "hat-leaf", slot: "hat", name: "Sprout", icon: "🌱", price: 50, value: "leaf", blurb: "A growing sprout.", rarity: "common" },
  { id: "hat-bow", slot: "hat", name: "Ribbon Bow", icon: "🎀", price: 70, value: "bow", blurb: "A dapper little bow.", rarity: "common" },
  { id: "hat-party", slot: "hat", name: "Party Hat", icon: "🎉", price: 80, value: "party", blurb: "Every day's a celebration.", rarity: "common" },
  { id: "hat-crown", slot: "hat", name: "Tiny Crown", icon: "👑", price: 180, value: "crown", blurb: "Royalty of routine.", rarity: "epic" },
  { id: "hat-wizard", slot: "hat", name: "Wizard Hat", icon: "🧙", price: 200, value: "wizard", blurb: "For habit sorcery.", rarity: "epic" },

  // ── Backgrounds ────────────────────────────────────────────────
  { id: "bg-meadow", slot: "background", name: "Meadow", icon: "🌼", price: 110, value: "meadow", blurb: "Sunny rolling hills.", rarity: "common" },
  { id: "bg-night", slot: "background", name: "Starry Night", icon: "🌙", price: 140, value: "night", blurb: "A calm starlit sky.", rarity: "rare" },
  { id: "bg-beach", slot: "background", name: "Beach", icon: "🏖️", price: 140, value: "beach", blurb: "Warm sand & waves.", rarity: "rare" },
  { id: "bg-space", slot: "background", name: "Deep Space", icon: "🪐", price: 260, value: "space", blurb: "Float among the stars.", rarity: "epic" },

  // ── Companions ─────────────────────────────────────────────────
  { id: "buddy-butterfly", slot: "companion", name: "Butterfly", icon: "🦋", price: 130, value: "butterfly", blurb: "Flutters around your pet.", rarity: "rare" },
  { id: "buddy-firefly", slot: "companion", name: "Firefly", icon: "✨", price: 130, value: "firefly", blurb: "A glowing little friend.", rarity: "rare" },

  // ── Mystery-Egg exclusives (not sold for coins) ─────────────────
  { id: "color-rainbow", slot: "color", name: "Prismatic", icon: "🌈", price: 0, value: "rainbow", blurb: "A shifting rainbow coat.", rarity: "mythic", gachaOnly: true },
  { id: "hat-halo", slot: "hat", name: "Halo", icon: "😇", price: 0, value: "halo", blurb: "Pure habit virtue.", rarity: "epic", gachaOnly: true },
  { id: "hat-horns", slot: "hat", name: "Imp Horns", icon: "😈", price: 0, value: "horns", blurb: "A little mischief.", rarity: "rare", gachaOnly: true },
  { id: "hat-flower", slot: "hat", name: "Flower Crown", icon: "🌸", price: 0, value: "flower", blurb: "Bloom where you're planted.", rarity: "rare", gachaOnly: true },
  { id: "bg-aurora", slot: "background", name: "Aurora", icon: "🌌", price: 0, value: "aurora", blurb: "Dancing northern lights.", rarity: "mythic", gachaOnly: true },
  { id: "buddy-ghost", slot: "companion", name: "Boo", icon: "👻", price: 0, value: "ghost", blurb: "A friendly little spook.", rarity: "epic", gachaOnly: true },
  { id: "buddy-star", slot: "companion", name: "Sparkle", icon: "⭐", price: 0, value: "star", blurb: "A twinkling sidekick.", rarity: "rare", gachaOnly: true },

  // ── Consumables ────────────────────────────────────────────────
  { id: "item-freeze", slot: "consumable", name: "Streak Freeze", icon: "🧊", price: 150, blurb: "Protects every streak from ONE missed day.", rarity: "rare" },
  { id: "item-feast", slot: "consumable", name: "Feast", icon: "🍰", price: 40, blurb: "Instantly fills health & happiness.", rarity: "common" },
];

export const shopItem = (id: string): ShopItem | undefined =>
  SHOP_ITEMS.find((i) => i.id === id);

/** Cosmetics that can be earned/bought (everything except consumables). */
export const cosmetics = (): ShopItem[] => SHOP_ITEMS.filter((i) => i.slot !== "consumable");
