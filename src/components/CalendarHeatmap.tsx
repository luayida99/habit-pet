import { activeHabits } from "../game/selectors";
import { addDays, dayKey } from "../game/dates";
import type { GameState } from "../game/types";

interface Props {
  state: GameState;
  /** Number of weeks to show. */
  weeks?: number;
}

/** GitHub-style contribution grid of how many habits were completed each day. */
export function CalendarHeatmap({ state, weeks = 16 }: Props) {
  const habits = activeHabits(state);
  // Tally completions per day across all (non-archived) habits.
  const tally = new Map<string, number>();
  for (const h of habits) for (const d of h.history) tally.set(d, (tally.get(d) ?? 0) + 1);

  const today = dayKey();
  const totalDays = weeks * 7;
  // Align the grid so the last column ends today; columns are weeks.
  const cells: { key: string; count: number }[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const key = addDays(today, -i);
    cells.push({ key, count: tally.get(key) ?? 0 });
  }

  const max = Math.max(1, ...cells.map((c) => c.count));
  const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));

  // group into columns of 7 (weeks)
  const columns: { key: string; count: number }[][] = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));

  return (
    <div className="heatmap">
      <div className="heatmap-grid">
        {columns.map((col, ci) => (
          <div className="heatmap-col" key={ci}>
            {col.map((c) => (
              <div
                key={c.key}
                className={`heatmap-cell lvl-${level(c.count)}`}
                title={`${c.key}: ${c.count} habit${c.count === 1 ? "" : "s"}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span>less</span>
        {[0, 1, 2, 3, 4].map((l) => <div key={l} className={`heatmap-cell lvl-${l}`} />)}
        <span>more</span>
      </div>
    </div>
  );
}
