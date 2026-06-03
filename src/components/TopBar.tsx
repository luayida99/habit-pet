import { levelInfo, topStreak } from "../game/selectors";
import type { GameState } from "../game/types";

interface Props {
  state: GameState;
  onSettings: () => void;
}

export function TopBar({ state, onSettings }: Props) {
  const info = levelInfo(state);
  const streak = topStreak(state);
  return (
    <header className="topbar">
      <div className="topbar-level" title={`${info.xpIntoLevel} / ${info.xpForNext} XP`}>
        <div className="level-badge">{info.level}</div>
        <div className="level-bar">
          <div className="level-bar-fill" style={{ width: `${Math.round(info.progress * 100)}%` }} />
        </div>
      </div>
      <div className="topbar-stats">
        <span className="chip chip-streak" title="Longest current streak">🔥 {streak}</span>
        {state.freezes > 0 && <span className="chip" title="Streak freezes available">🧊 {state.freezes}</span>}
        <span className="chip chip-coin" title="Coins">🪙 {state.coins}</span>
        <button className="icon-btn" aria-label="Settings" onClick={onSettings}>⚙️</button>
      </div>
    </header>
  );
}
