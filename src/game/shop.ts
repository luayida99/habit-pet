/** Cosmetics + consumables the player can buy with coins. */

export type ShopSlot = "color" | "hat" | "background" | "companion" | "consumable";

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
}

export const SHOP_ITEMS: ShopItem[] = [
  // ── Coat colors ────────────────────────────────────────────────
  { id: "color-sunshine", slot: "color", name: "Sunshine", icon: "🟡", price: 60, value: "#ffd34d", blurb: "A warm buttery glow." },
  { id: "color-bubblegum", slot: "color", name: "Bubblegum", icon: "🩷", price: 60, value: "#ff8fc4", blurb: "Sweet and bouncy pink." },
  { id: "color-matcha", slot: "color", name: "Matcha", icon: "🟢", price: 60, value: "#9bd47a", blurb: "Calm forest green." },
  { id: "color-twilight", slot: "color", name: "Twilight", icon: "🔵", price: 90, value: "#7c83ff", blurb: "Dusky periwinkle." },
  { id: "color-ember", slot: "color", name: "Ember", icon: "🟠", price: 120, value: "#ff6b4a", blurb: "Glowing coal orange." },
  { id: "color-galaxy", slot: "color", name: "Galaxy", icon: "🟣", price: 220, value: "#b06bff", blurb: "Stardust violet. Rare." },

  // ── Hats ───────────────────────────────────────────────────────
  { id: "hat-party", slot: "hat", name: "Party Hat", icon: "🎉", price: 80, value: "party", blurb: "Every day's a celebration." },
  { id: "hat-crown", slot: "hat", name: "Tiny Crown", icon: "👑", price: 180, value: "crown", blurb: "Royalty of routine." },
  { id: "hat-bow", slot: "hat", name: "Ribbon Bow", icon: "🎀", price: 70, value: "bow", blurb: "A dapper little bow." },
  { id: "hat-leaf", slot: "hat", name: "Sprout", icon: "🌱", price: 50, value: "leaf", blurb: "A growing sprout." },
  { id: "hat-wizard", slot: "hat", name: "Wizard Hat", icon: "🧙", price: 200, value: "wizard", blurb: "For habit sorcery." },

  // ── Backgrounds ────────────────────────────────────────────────
  { id: "bg-meadow", slot: "background", name: "Meadow", icon: "🌼", price: 110, value: "meadow", blurb: "Sunny rolling hills." },
  { id: "bg-night", slot: "background", name: "Starry Night", icon: "🌙", price: 140, value: "night", blurb: "A calm starlit sky." },
  { id: "bg-beach", slot: "background", name: "Beach", icon: "🏖️", price: 140, value: "beach", blurb: "Warm sand & waves." },
  { id: "bg-space", slot: "background", name: "Deep Space", icon: "🪐", price: 260, value: "space", blurb: "Float among the stars. Rare." },

  // ── Companions ─────────────────────────────────────────────────
  { id: "buddy-butterfly", slot: "companion", name: "Butterfly", icon: "🦋", price: 130, value: "butterfly", blurb: "Flutters around your pet." },
  { id: "buddy-firefly", slot: "companion", name: "Firefly", icon: "✨", price: 130, value: "firefly", blurb: "A glowing little friend." },

  // ── Consumables ────────────────────────────────────────────────
  { id: "item-freeze", slot: "consumable", name: "Streak Freeze", icon: "🧊", price: 150, blurb: "Protects every streak from ONE missed day." },
  { id: "item-feast", slot: "consumable", name: "Feast", icon: "🍰", price: 40, blurb: "Instantly fills health & happiness." },
];

export const shopItem = (id: string): ShopItem | undefined =>
  SHOP_ITEMS.find((i) => i.id === id);
