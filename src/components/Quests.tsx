import { questDef } from "../game/quests";
import type { GameState } from "../game/types";

interface Props {
  state: GameState;
  onClaim: (questId: string) => void;
}

export function Quests({ state, onClaim }: Props) {
  const quests = state.quests.quests;
  if (quests.length === 0) return null;
  return (
    <section className="quests">
      <div className="section-head">
        <h2>Daily quests</h2>
        <span className="section-count">resets tomorrow</span>
      </div>
      <div className="quest-rows">
        {quests.map((q) => {
          const def = questDef(q.id);
          if (!def) return null;
          const ready = q.progress >= q.goal && !q.claimed;
          const pct = Math.min(100, (q.progress / q.goal) * 100);
          return (
            <div className={`quest-row ${q.claimed ? "claimed" : ""}`} key={q.id}>
              <span className="quest-icon">{def.icon}</span>
              <div className="quest-body">
                <span className="quest-name">{def.describe(q.goal)}</span>
                <div className="quest-track">
                  <div className="quest-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
              {q.claimed ? (
                <span className="quest-done">✓</span>
              ) : ready ? (
                <button className="btn btn-claim" onClick={() => onClaim(q.id)}>+{def.reward}🪙</button>
              ) : (
                <span className="quest-prog">{q.progress}/{q.goal}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
