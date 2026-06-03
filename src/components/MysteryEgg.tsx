import { EGG_PRICE, PITY_THRESHOLD } from "../game/gacha";
import { cosmetics } from "../game/shop";
import type { GameState } from "../game/types";

interface Props {
  state: GameState;
  onHatch: () => void;
}

export function MysteryEgg({ state, onHatch }: Props) {
  const all = cosmetics();
  const owned = all.filter((c) => state.ownedItems.includes(c.id)).length;
  const canAfford = state.coins >= EGG_PRICE;
  const untilPity = Math.max(0, PITY_THRESHOLD - state.gachaPity);

  return (
    <div className="egg-card">
      <div className="egg-art">🥚</div>
      <div className="egg-body">
        <div className="egg-title">Mystery Egg</div>
        <p className="egg-blurb">
          Hatch a random cosmetic — including rares you can't buy! Duplicates refund coins.
        </p>
        <div className="egg-meta">
          <span className="chip">🎨 {owned}/{all.length} collected</span>
          <span className="chip" title="Pity timer">✨ Epic+ in {untilPity}</span>
        </div>
        <button
          className={`btn btn-block ${canAfford ? "btn-buy" : "btn-locked"}`}
          disabled={!canAfford}
          onClick={onHatch}
        >
          {canAfford ? `Hatch — 🪙 ${EGG_PRICE}` : `Need 🪙 ${EGG_PRICE}`}
        </button>
      </div>
    </div>
  );
}
