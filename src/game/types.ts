/**
 * Core domain types for HabitPet.
 *
 * The persisted shape is {@link GameState}. Everything derived (streaks, mood,
 * evolution stage, quest progress) is computed from it on demand so that the
 * saved state stays small and is the single source of truth.
 */

/** A local calendar day, formatted `YYYY-MM-DD`. */
export type DateKey = string;

export type Mood = "happy" | "content" | "sad" | "sick" | "sleepy";

export type EvolutionStage = "egg" | "blob" | "child" | "teen" | "grown";

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  /** Accent color used in the list + contributes to the pet's vibe. */
  color: string;
  createdAt: number;
  /** Sorted list of local day keys on which the habit was completed. */
  history: DateKey[];
  /** Days bridged by a streak-freeze token — count toward streaks, not stats. */
  frozen?: DateKey[];
  /** Soft-deleted habits are hidden but their history is retained for stats. */
  archived?: boolean;
}

export interface PetState {
  name: string;
  /** Base palette + silhouette family. */
  species: PetSpecies;
  happiness: number; // 0–100
  health: number; // 0–100
  energy: number; // 0–100
  /** Used for the "you just interacted" affection bounce. */
  lastPlayedAt: number;
}

export type PetSpecies = "mint" | "peach" | "berry" | "sky";

export interface EquippedCosmetics {
  color?: string;
  hat?: string;
  background?: string;
  companion?: string;
}

export interface QuestProgress {
  id: string;
  /** How far along the player is, clamped to `goal`. */
  progress: number;
  goal: number;
  claimed: boolean;
}

export interface DailyQuests {
  date: DateKey;
  quests: QuestProgress[];
}

export interface GameSettings {
  sound: boolean;
  reducedMotion: boolean;
}

export interface GameStats {
  totalCompletions: number;
  /** Days on which at least one habit was completed. */
  activeDays: DateKey[];
  petsGiven: number;
  questsCompleted: number;
  gamesPlayed: number;
  adventuresDone: number;
  eggsHatched: number;
}

/** Daily-reward login streak tracking. */
export interface DailyRewardState {
  lastClaim: DateKey | null;
  streak: number;
}

/** A pet expedition in progress; resolves in real time even while away. */
export interface ActiveAdventure {
  defId: string;
  startedAt: number;
  endsAt: number;
}

/** Per-mini-game records and per-day coin earnings (for the soft cap). */
export interface ArcadeStat {
  highScore: number;
  lastPlayed: DateKey | null;
  coinsToday: number;
}

/** Short-lived combo when several habits are checked in quick succession. */
export interface ComboState {
  count: number;
  lastAt: number;
}

export interface GameState {
  version: number;
  onboarded: boolean;
  createdAt: number;
  /** Real timestamp of the last decay tick — drives offline mood decay. */
  lastTickAt: number;

  pet: PetState;
  habits: Habit[];

  coins: number;
  xp: number;
  level: number;
  longestStreakEver: number;
  /** Streak-freeze tokens that absorb a single missed day. */
  freezes: number;

  /** Days already paid for with a freeze token, to avoid double-spending. */
  frozenDays: DateKey[];

  ownedItems: string[];
  equipped: EquippedCosmetics;
  achievements: string[];
  quests: DailyQuests;
  settings: GameSettings;
  stats: GameStats;

  // ── "Play & Discover" systems ──────────────────────────────────
  dailyReward: DailyRewardState;
  adventure: ActiveAdventure | null;
  /** Collected discovery ids (from adventures). */
  discoveries: string[];
  /** Critter ids caught in the Critter Safari minigame. */
  crittersCaught: string[];
  /** Per-game stats keyed by mini-game id. */
  arcade: Record<string, ArcadeStat>;
  /** Hatches since the last epic+ pull, for the gacha pity timer. */
  gachaPity: number;
  /** Transient habit-combo tracker. */
  combo: ComboState;
}

/** A user-visible event produced by the engine, surfaced as a toast. */
export interface GameEvent {
  id: string;
  kind:
    | "coins"
    | "xp"
    | "levelup"
    | "evolve"
    | "achievement"
    | "quest"
    | "streak"
    | "info"
    | "chest"
    | "adventure"
    | "gacha"
    | "combo";
  message: string;
  icon?: string;
}

/** Result of a pure engine transition: the next state plus emitted events. */
export interface Transition {
  state: GameState;
  events: GameEvent[];
}
