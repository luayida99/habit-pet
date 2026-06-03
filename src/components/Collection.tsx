import { DISCOVERIES } from "../game/adventures";
import { RARITY_META, cosmetics } from "../game/shop";
import type { GameState } from "../game/types";

interface Props {
  state: GameState;
}

export function Collection({ state }: Props) {
  const owned = new Set(state.discoveries);
  const cos = cosmetics();
  const ownedCos = cos.filter((c) => state.ownedItems.includes(c.id)).length;

  return (
    <>
      <div className="section-head">
        <h2>🔭 Discoveries</h2>
        <span className="section-count">{owned.size}/{DISCOVERIES.length}</span>
      </div>
      <div className="collect-grid">
        {DISCOVERIES.map((d) => {
          const got = owned.has(d.id);
          return (
            <div
              className={`collect-cell ${got ? "got" : "locked"}`}
              key={d.id}
              style={got ? { borderColor: RARITY_META[d.rarity].color } : undefined}
              title={got ? `${d.name} — ${d.blurb}` : "Undiscovered"}
            >
              <div className="collect-icon">{got ? d.icon : "❔"}</div>
              <div className="collect-name">{got ? d.name : "???"}</div>
              {got && (
                <div className="collect-rarity" style={{ color: RARITY_META[d.rarity].color }}>
                  {RARITY_META[d.rarity].label}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="section-head">
        <h2>🎨 Wardrobe</h2>
        <span className="section-count">{ownedCos}/{cos.length}</span>
      </div>
      <div className="collect-grid">
        {cos.map((c) => {
          const got = state.ownedItems.includes(c.id);
          return (
            <div
              className={`collect-cell ${got ? "got" : "locked"}`}
              key={c.id}
              style={got ? { borderColor: RARITY_META[c.rarity].color } : undefined}
              title={got ? `${c.name} — ${c.blurb}` : `${c.name} (locked)`}
            >
              <div className="collect-icon">{got ? c.icon : "🔒"}</div>
              <div className="collect-name">{got ? c.name : "???"}</div>
              {got && (
                <div className="collect-rarity" style={{ color: RARITY_META[c.rarity].color }}>
                  {RARITY_META[c.rarity].label}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
