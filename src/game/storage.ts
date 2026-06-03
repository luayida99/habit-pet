import { STATE_VERSION, STORAGE_KEY } from "./constants";
import { createInitialState } from "./engine";
import type { GameState } from "./types";

/**
 * Load persisted state, migrating older versions forward. Any corruption or
 * schema gap falls back to a fresh game rather than throwing — losing a save
 * is bad, but a white screen is worse.
 */
export function loadState(now: number = Date.now()): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState(now);
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return migrate(parsed, now);
  } catch {
    return createInitialState(now);
  }
}

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked (private mode) — degrade to in-memory play.
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Fill in any fields missing from an older/partial save with defaults. */
function migrate(saved: Partial<GameState>, now: number): GameState {
  const base = createInitialState(now);
  const merged: GameState = {
    ...base,
    ...saved,
    version: STATE_VERSION,
    pet: { ...base.pet, ...saved.pet },
    equipped: { ...base.equipped, ...saved.equipped },
    settings: { ...base.settings, ...saved.settings },
    stats: { ...base.stats, ...saved.stats },
    quests: saved.quests ?? base.quests,
    habits: (saved.habits ?? []).map((h) => ({ ...h, history: [...(h.history ?? [])] })),
    frozenDays: saved.frozenDays ?? [],
    ownedItems: saved.ownedItems ?? [],
    achievements: saved.achievements ?? [],
  };
  return merged;
}

/** Export the current save as a shareable JSON string (for backup). */
export const exportState = (state: GameState): string => JSON.stringify(state, null, 2);

export function importState(json: string, now: number = Date.now()): GameState {
  const parsed = JSON.parse(json) as Partial<GameState>;
  return migrate(parsed, now);
}
