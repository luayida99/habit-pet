import { useState } from "react";
import { HABIT_COLOR_CHOICES, HABIT_EMOJI_CHOICES } from "../game/constants";
import { activeHabits, habitBestStreak, habitDoneToday, habitStreak } from "../game/selectors";
import type { GameState, Habit } from "../game/types";

interface Props {
  state: GameState;
  onToggle: (id: string) => void;
  onAdd: (input: { name: string; emoji: string; color: string }) => void;
  onEdit: (id: string, patch: Partial<Pick<Habit, "name" | "emoji" | "color">>) => void;
  onArchive: (id: string) => void;
}

export function HabitList({ state, onToggle, onAdd, onEdit, onArchive }: Props) {
  const habits = activeHabits(state);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const doneCount = habits.filter((h) => habitDoneToday(h)).length;

  return (
    <section className="habits">
      <div className="section-head">
        <h2>Today's habits</h2>
        {habits.length > 0 && (
          <span className="section-count">{doneCount}/{habits.length} done</span>
        )}
      </div>

      <div className="habit-rows">
        {habits.map((h) =>
          editingId === h.id ? (
            <HabitForm
              key={h.id}
              initial={h}
              onCancel={() => setEditingId(null)}
              onSubmit={(input) => {
                onEdit(h.id, input);
                setEditingId(null);
              }}
              onArchive={() => {
                onArchive(h.id);
                setEditingId(null);
              }}
            />
          ) : (
            <HabitItem
              key={h.id}
              habit={h}
              onToggle={() => onToggle(h.id)}
              onEdit={() => setEditingId(h.id)}
            />
          ),
        )}
      </div>

      {adding ? (
        <HabitForm onCancel={() => setAdding(false)} onSubmit={(input) => { onAdd(input); setAdding(false); }} />
      ) : (
        <button className="btn btn-add" onClick={() => setAdding(true)}>+ Add habit</button>
      )}

      {habits.length === 0 && !adding && (
        <p className="empty-hint">No habits yet — add your first one to hatch your pet! 🥚</p>
      )}
    </section>
  );
}

function HabitItem({ habit, onToggle, onEdit }: { habit: Habit; onToggle: () => void; onEdit: () => void }) {
  const done = habitDoneToday(habit);
  const streak = habitStreak(habit);
  const best = habitBestStreak(habit);
  return (
    <div className={`habit-row ${done ? "done" : ""}`} style={{ ["--accent" as string]: habit.color }}>
      <button className="habit-check" onClick={onToggle} aria-label={done ? "Mark not done" : "Mark done"}>
        <span className="habit-emoji">{habit.emoji}</span>
        {done && <span className="habit-tick">✓</span>}
      </button>
      <button className="habit-main" onClick={onToggle}>
        <span className="habit-name">{habit.name}</span>
        <span className="habit-sub">
          {streak > 0 ? <span className="flame">🔥 {streak}</span> : <span className="muted">no streak yet</span>}
          {best > 0 && <span className="muted"> · best {best}</span>}
        </span>
      </button>
      <button className="habit-edit" onClick={onEdit} aria-label="Edit habit">⋯</button>
    </div>
  );
}

function HabitForm({
  initial,
  onSubmit,
  onCancel,
  onArchive,
}: {
  initial?: Habit;
  onSubmit: (input: { name: string; emoji: string; color: string }) => void;
  onCancel: () => void;
  onArchive?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? HABIT_EMOJI_CHOICES[0]);
  const [color, setColor] = useState(initial?.color ?? HABIT_COLOR_CHOICES[0]);

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), emoji, color });
  };

  return (
    <div className="habit-form" style={{ ["--accent" as string]: color }}>
      <input
        className="text-input"
        placeholder="e.g. Drink water"
        value={name}
        autoFocus
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <div className="picker-label">Icon</div>
      <div className="emoji-picker">
        {HABIT_EMOJI_CHOICES.map((e) => (
          <button
            key={e}
            className={`emoji-opt ${emoji === e ? "selected" : ""}`}
            onClick={() => setEmoji(e)}
            type="button"
          >
            {e}
          </button>
        ))}
      </div>
      <div className="picker-label">Color</div>
      <div className="color-picker">
        {HABIT_COLOR_CHOICES.map((c) => (
          <button
            key={c}
            className={`color-opt ${color === c ? "selected" : ""}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
            type="button"
            aria-label={`color ${c}`}
          />
        ))}
      </div>
      <div className="habit-form-actions">
        {onArchive && (
          <button className="btn btn-danger" type="button" onClick={onArchive}>Delete</button>
        )}
        <span className="spacer" />
        <button className="btn btn-ghost" type="button" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" type="button" onClick={submit} disabled={!name.trim()}>
          {initial ? "Save" : "Add"}
        </button>
      </div>
    </div>
  );
}
