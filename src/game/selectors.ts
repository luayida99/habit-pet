/**
 * Pure, memo-free derivations from {@link GameState}. Kept separate from the
 * state-mutating engine so they're trivial to unit test and reuse in the UI.
 */
import { EVOLUTION_THRESHOLDS, METER_MAX, xpForLevel } from "./constants";
import { addDays, dayKey } from "./dates";
import type { EvolutionStage, GameState, Habit, Mood } from "./types";

/**
 * Current streak for a habit: the run of consecutive completed days ending
 * today, or — if today isn't done yet — ending yesterday (so an in-progress
 * streak doesn't read as broken before the day is over).
 */
export function habitStreak(habit: Habit, now: number = Date.now()): number {
  const done = new Set([...habit.history, ...(habit.frozen ?? [])]);
  const today = dayKey(now);
  let cursor = done.has(today) ? today : addDays(today, -1);
  if (!done.has(cursor)) return 0;
  let streak = 0;
  while (done.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function habitDoneToday(habit: Habit, now: number = Date.now()): boolean {
  return habit.history.includes(dayKey(now));
}

export function habitBestStreak(habit: Habit): number {
  const all = [...habit.history, ...(habit.frozen ?? [])];
  if (all.length === 0) return 0;
  const sorted = [...new Set(all)].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (addDays(prev, 1) === cur) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

export const activeHabits = (state: GameState): Habit[] =>
  state.habits.filter((h) => !h.archived);

/** Longest *current* streak across all active habits — the headline number. */
export function topStreak(state: GameState, now: number = Date.now()): number {
  return activeHabits(state).reduce((m, h) => Math.max(m, habitStreak(h, now)), 0);
}

export function completedTodayCount(state: GameState, now: number = Date.now()): number {
  return activeHabits(state).filter((h) => habitDoneToday(h, now)).length;
}

export function evolutionStage(longestStreakEver: number): EvolutionStage {
  // Thresholds are ordered high→low; first match wins.
  return (
    EVOLUTION_THRESHOLDS.find((t) => longestStreakEver >= t.minStreak)?.stage ?? "blob"
  );
}

/** Egg only before the very first completion; otherwise derived from streak. */
export function currentStage(state: GameState): EvolutionStage {
  if (state.stats.totalCompletions === 0) return "egg";
  return evolutionStage(state.longestStreakEver);
}

/**
 * Pet mood from its meters and the time of day. Pure function of state so the
 * canvas and copy always agree.
 */
export function petMood(state: GameState, now: number = Date.now()): Mood {
  const { happiness, health, energy } = state.pet;
  if (health < 25) return "sick";
  const hour = new Date(now).getHours();
  const nightish = hour >= 22 || hour < 6;
  if (energy < 22 || (nightish && happiness < 70)) return "sleepy";
  const blended = happiness * 0.62 + health * 0.38;
  if (blended >= 72) return "happy";
  if (blended >= 42) return "content";
  return "sad";
}

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  progress: number; // 0–1
}

export function levelInfo(state: GameState): LevelInfo {
  const xpForNext = xpForLevel(state.level);
  const xpIntoLevel = Math.max(0, Math.min(state.xp, xpForNext));
  return {
    level: state.level,
    xpIntoLevel,
    xpForNext,
    progress: xpForNext === 0 ? 0 : xpIntoLevel / xpForNext,
  };
}

export const clampMeter = (v: number): number =>
  Math.max(0, Math.min(METER_MAX, Math.round(v * 10) / 10));

/** A 0–1 overall vitality score, handy for tinting the scene. */
export function vitality(state: GameState): number {
  const { happiness, health, energy } = state.pet;
  return (happiness + health + energy) / (METER_MAX * 3);
}

/** Milliseconds left on the active adventure (0 if none or finished). */
export function adventureRemainingMs(state: GameState, now: number = Date.now()): number {
  if (!state.adventure) return 0;
  return Math.max(0, state.adventure.endsAt - now);
}

export const adventureReady = (state: GameState, now: number = Date.now()): boolean =>
  state.adventure != null && now >= state.adventure.endsAt;

/** 0–1 progress through the active adventure. */
export function adventureProgress(state: GameState, now: number = Date.now()): number {
  const adv = state.adventure;
  if (!adv) return 0;
  const total = adv.endsAt - adv.startedAt;
  if (total <= 0) return 1;
  return Math.max(0, Math.min(1, (now - adv.startedAt) / total));
}
