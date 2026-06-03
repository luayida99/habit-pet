import type { EvolutionStage, PetSpecies } from "./types";

export const STATE_VERSION = 2;
export const STORAGE_KEY = "habitpet.save.v1";

/** Habits checked within this window of each other build a combo. */
export const COMBO_WINDOW_MS = 12_000;
/** Bonus coins per combo step beyond the first (combo x2 → +3, x3 → +6 …). */
export const COMBO_BONUS_COINS = 3;

/** Meters live on a 0–100 scale. */
export const METER_MAX = 100;

/** Reward tuning. Generous on purpose — HabitPet rewards showing up. */
export const REWARDS = {
  /** Coins + XP for ticking off a single habit. */
  habitCoins: 8,
  habitXp: 12,
  /** Happiness/health/energy restored per completion. */
  habitHappiness: 14,
  habitHealth: 6,
  habitEnergy: 4,
  /** Bonus coins granted when a habit's streak hits a milestone day. */
  streakMilestoneCoins: 25,
  /** Petting/playing is free affection but light on resources. */
  playHappiness: 8,
  playEnergy: -3,
} as const;

/** Streak lengths that fire a celebratory milestone. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

/**
 * Hourly meter decay applied for real elapsed time while away.
 * Deliberately gentle (Finch-style, no shame): a full day of neglect costs
 * roughly half a bar, never wipes you out.
 */
export const DECAY_PER_HOUR = {
  happiness: 2.2,
  health: 1.1,
  energy: 1.6,
} as const;

/** Decay is ignored for the first grace window so quick revisits feel stable. */
export const DECAY_GRACE_MINUTES = 90;

/** XP required to reach the *next* level from the current one. */
export function xpForLevel(level: number): number {
  return Math.round(80 + level * 45 + level * level * 6);
}

/** Longest-streak thresholds that unlock each evolution stage. */
export const EVOLUTION_THRESHOLDS: { stage: EvolutionStage; minStreak: number }[] = [
  { stage: "grown", minStreak: 21 },
  { stage: "teen", minStreak: 7 },
  { stage: "child", minStreak: 3 },
  { stage: "blob", minStreak: 0 },
];

export const SPECIES: Record<
  PetSpecies,
  { label: string; body: string; belly: string; accent: string; cheek: string }
> = {
  mint: { label: "Mochi", body: "#7fe3c0", belly: "#d8fff1", accent: "#2bbf93", cheek: "#ffb3c7" },
  peach: { label: "Pip", body: "#ffb38a", belly: "#ffe6d6", accent: "#ff8a5c", cheek: "#ff8fae" },
  berry: { label: "Bramble", body: "#c49bff", belly: "#efe3ff", accent: "#9a5cff", cheek: "#ff9ed1" },
  sky: { label: "Nimbus", body: "#8fc7ff", belly: "#dcefff", accent: "#4b9bff", cheek: "#ffadc6" },
};

export const STARTER_HABITS: { name: string; emoji: string; color: string }[] = [
  { name: "Drink water", emoji: "💧", color: "#4b9bff" },
  { name: "Move your body", emoji: "🏃", color: "#ff8a5c" },
  { name: "Read 10 minutes", emoji: "📖", color: "#9a5cff" },
];

export const HABIT_EMOJI_CHOICES = [
  "💧", "🏃", "📖", "🧘", "🥗", "😴", "🦷", "🧹", "✍️", "🎸",
  "💪", "🚶", "🌱", "🧠", "☀️", "💊", "🙏", "📵", "🎨", "🧴",
  "💻", "🪥", "🥦", "🚭", "📝", "🛏️", "🎯", "🫧", "🕯️", "⏰",
];

export const HABIT_COLOR_CHOICES = [
  "#4b9bff", "#2bbf93", "#ff8a5c", "#9a5cff", "#ff5c8a",
  "#ffc24b", "#5cc6ff", "#ff6f6f", "#7ed957", "#b388ff",
];
