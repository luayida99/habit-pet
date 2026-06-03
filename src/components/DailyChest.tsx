import { WEEK_LEN, canClaimDaily, nextLoginStreak, weekDay } from "../game/dailyReward";
import type { GameState } from "../game/types";

interface Props {
  state: GameState;
  onClaim: () => void;
}

export function DailyChest({ state, onClaim }: Props) {
  const claimable = canClaimDaily(state);
  const effectiveStreak = claimable ? nextLoginStreak(state) : state.dailyReward.streak;
  const day = weekDay(effectiveStreak);

  return (
    <div className={`chest-card ${claimable ? "ready" : ""}`}>
      <div className="chest-head">
        <span className="chest-title">🎁 Daily Reward</span>
        {state.dailyReward.streak > 0 && (
          <span className="chest-streak">🔥 {state.dailyReward.streak}-day login</span>
        )}
      </div>
      <div className="chest-track">
        {Array.from({ length: WEEK_LEN }, (_, i) => {
          const slot = i + 1;
          const done = claimable ? slot < day : slot <= day;
          const current = claimable && slot === day;
          return (
            <div key={slot} className={`chest-slot ${done ? "done" : ""} ${current ? "current" : ""}`}>
              {slot === WEEK_LEN ? "🧊" : done ? "✓" : slot}
            </div>
          );
        })}
      </div>
      {claimable ? (
        <button className="btn btn-primary btn-block chest-claim" onClick={onClaim}>
          Claim day {day} 🎁
        </button>
      ) : (
        <p className="chest-back">Come back tomorrow for day {weekDay(state.dailyReward.streak + 1)}!</p>
      )}
    </div>
  );
}
