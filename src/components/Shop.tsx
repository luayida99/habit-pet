import { useState } from "react";
import { SHOP_ITEMS, type ShopSlot } from "../game/shop";
import type { GameState } from "../game/types";

interface Props {
  state: GameState;
  onBuy: (itemId: string) => void;
}

const TABS: { slot: ShopSlot; label: string; icon: string }[] = [
  { slot: "color", label: "Colors", icon: "🎨" },
  { slot: "hat", label: "Hats", icon: "🎩" },
  { slot: "background", label: "Scenes", icon: "🏞️" },
  { slot: "companion", label: "Friends", icon: "🦋" },
  { slot: "consumable", label: "Items", icon: "🧊" },
];

export function Shop({ state, onBuy }: Props) {
  const [slot, setSlot] = useState<ShopSlot>("color");
  const items = SHOP_ITEMS.filter((i) => i.slot === slot);

  return (
    <section className="shop">
      <div className="section-head">
        <h2>Shop</h2>
        <span className="chip chip-coin">🪙 {state.coins}</span>
      </div>

      <div className="shop-tabs">
        {TABS.map((t) => (
          <button
            key={t.slot}
            className={`shop-tab ${slot === t.slot ? "active" : ""}`}
            onClick={() => setSlot(t.slot)}
          >
            <span>{t.icon}</span>
            <small>{t.label}</small>
          </button>
        ))}
      </div>

      <div className="shop-grid">
        {items.map((item) => {
          const owned = state.ownedItems.includes(item.id);
          const equipped =
            item.value !== undefined &&
            state.equipped[item.slot as keyof GameState["equipped"]] === item.value;
          const afford = state.coins >= item.price;
          const isConsumable = item.slot === "consumable";

          let label: string;
          let cls = "btn-buy";
          if (equipped) { label = "Worn ✓"; cls = "btn-equipped"; }
          else if (owned) { label = "Wear"; cls = "btn-owned"; }
          else if (!afford) { label = `🪙 ${item.price}`; cls = "btn-locked"; }
          else { label = `🪙 ${item.price}`; }

          return (
            <div className={`shop-card ${equipped ? "is-equipped" : ""}`} key={item.id}>
              <div className="shop-card-icon">{item.icon}</div>
              <div className="shop-card-name">{item.name}</div>
              <div className="shop-card-blurb">{item.blurb}</div>
              <button
                className={`btn ${cls}`}
                disabled={!owned && !afford && !isConsumable ? !afford : false}
                onClick={() => onBuy(item.id)}
              >
                {label}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
