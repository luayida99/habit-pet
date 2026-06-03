import { ACHIEVEMENTS } from "../game/achievements";
import { activeHabits, habitBestStreak } from "../game/selectors";
import type { GameState } from "../game/types";
import { CalendarHeatmap } from "./CalendarHeatmap";

interface Props {
  state: GameState;
}

export function Awards({ state }: Props) {
  const unlocked = new Set(state.achievements);
  const longestEver = Math.max(state.longestStreakEver, ...activeHabits(state).map(habitBestStreak), 0);

  const stats: { label: string; value: string | number }[] = [
    { label: "Total check-ins", value: state.stats.totalCompletions },
    { label: "Longest streak", value: `${longestEver}🔥` },
    { label: "Active days", value: state.stats.activeDays.length },
    { label: "Quests done", value: state.stats.questsCompleted },
    { label: "Pets given", value: state.stats.petsGiven },
    { label: "Level", value: state.level },
  ];

  return (
    <section className="awards">
      <div className="section-head"><h2>Your journey</h2></div>
      <div className="stat-cards">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-card-val">{s.value}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="section-head"><h2>Activity</h2></div>
      <CalendarHeatmap state={state} />

      <div className="section-head">
        <h2>Achievements</h2>
        <span className="section-count">{unlocked.size}/{ACHIEVEMENTS.length}</span>
      </div>
      <div className="badge-grid">
        {ACHIEVEMENTS.map((a) => {
          const got = unlocked.has(a.id);
          return (
            <div className={`badge ${got ? "got" : "locked"}`} key={a.id} title={a.desc}>
              <div className="badge-icon">{got ? a.icon : "🔒"}</div>
              <div className="badge-name">{a.name}</div>
              <div className="badge-desc">{a.desc}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
