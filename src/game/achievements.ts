/** Badges unlocked by milestones. Each is a pure predicate over GameState. */
import { activeHabits, habitBestStreak, topStreak } from "./selectors";
import type { GameState } from "./types";

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  desc: string;
  /** Coin reward granted the moment it unlocks. */
  reward: number;
  test: (s: GameState) => boolean;
}

const anyHabitBest = (s: GameState, n: number) =>
  s.habits.some((h) => habitBestStreak(h) >= n);

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-step", name: "First Step", icon: "👣", desc: "Complete your first habit.", reward: 20, test: (s) => s.stats.totalCompletions >= 1 },
  { id: "hatchling", name: "Hatchling", icon: "🐣", desc: "Hatch your pet.", reward: 25, test: (s) => s.stats.totalCompletions >= 1 },
  { id: "streak-3", name: "On a Roll", icon: "🔥", desc: "Reach a 3-day streak.", reward: 40, test: (s) => anyHabitBest(s, 3) },
  { id: "streak-7", name: "Weekly Warrior", icon: "🗓️", desc: "Reach a 7-day streak.", reward: 75, test: (s) => anyHabitBest(s, 7) },
  { id: "streak-30", name: "Unstoppable", icon: "🏆", desc: "Reach a 30-day streak.", reward: 200, test: (s) => anyHabitBest(s, 30) },
  { id: "streak-100", name: "Centurion", icon: "💯", desc: "Reach a 100-day streak.", reward: 500, test: (s) => anyHabitBest(s, 100) },
  { id: "collector", name: "Collector", icon: "🎩", desc: "Own 5 shop items.", reward: 60, test: (s) => s.ownedItems.length >= 5 },
  { id: "busy-bee", name: "Busy Bee", icon: "🐝", desc: "Track 5 habits at once.", reward: 50, test: (s) => activeHabits(s).length >= 5 },
  { id: "perfect-day", name: "Perfect Day", icon: "✨", desc: "Complete every habit in a day.", reward: 60, test: perfectDay },
  { id: "level-5", name: "Growing Up", icon: "🌟", desc: "Reach level 5.", reward: 80, test: (s) => s.level >= 5 },
  { id: "level-10", name: "Seasoned", icon: "🌠", desc: "Reach level 10.", reward: 150, test: (s) => s.level >= 10 },
  { id: "rich", name: "Nest Egg", icon: "💰", desc: "Save up 500 coins.", reward: 0, test: (s) => s.coins >= 500 },
  { id: "devoted", name: "Devoted", icon: "💞", desc: "Pet your friend 25 times.", reward: 40, test: (s) => s.stats.petsGiven >= 25 },
  { id: "marathon", name: "Marathon", icon: "🏅", desc: "Be active 30 different days.", reward: 120, test: (s) => s.stats.activeDays.length >= 30 },
  { id: "evolved", name: "All Grown Up", icon: "🦄", desc: "Evolve your pet to its final form.", reward: 250, test: (s) => topStreak(s) >= 21 || s.longestStreakEver >= 21 },
];

function perfectDay(s: GameState): boolean {
  const habits = activeHabits(s);
  if (habits.length < 2) return false; // a single habit shouldn't trivially win it
  // Look for any day where every currently-active habit was completed.
  const counts = new Map<string, number>();
  for (const h of habits) for (const d of h.history) counts.set(d, (counts.get(d) ?? 0) + 1);
  for (const c of counts.values()) if (c >= habits.length) return true;
  return false;
}

export const achievement = (id: string): Achievement | undefined =>
  ACHIEVEMENTS.find((a) => a.id === id);
