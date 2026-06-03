/** Rotating daily quests. The pool is deterministic per local day. */
import { dayKey } from "./dates";
import type { DailyQuests, QuestProgress } from "./types";

export interface QuestDef {
  id: string;
  name: string;
  icon: string;
  goal: number;
  reward: number;
  /** Renders e.g. "Complete 3 habits" from the goal. */
  describe: (goal: number) => string;
}

export const QUEST_POOL: QuestDef[] = [
  { id: "q-complete", name: "Get it done", icon: "✅", goal: 3, reward: 30, describe: (g) => `Complete ${g} habits today` },
  { id: "q-complete-big", name: "On fire", icon: "🔥", goal: 5, reward: 50, describe: (g) => `Complete ${g} habits today` },
  { id: "q-pet", name: "Show love", icon: "💞", goal: 3, reward: 20, describe: (g) => `Pet your friend ${g} times` },
  { id: "q-first", name: "Early bird", icon: "🌅", goal: 1, reward: 15, describe: () => `Complete your first habit of the day` },
  { id: "q-play", name: "Playtime", icon: "🎾", goal: 2, reward: 20, describe: (g) => `Play with your pet ${g} times` },
];

export const questDef = (id: string): QuestDef | undefined =>
  QUEST_POOL.find((q) => q.id === id);

/** Stable hash so the same day always yields the same quest selection. */
function hashDay(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Pick `count` quests for a given day, deterministically. */
export function rollQuests(now: number = Date.now(), count = 3): DailyQuests {
  const date = dayKey(now);
  const seed = hashDay(date);
  const pool = [...QUEST_POOL];
  const picked: QuestDef[] = [];
  let s = seed;
  while (picked.length < count && pool.length > 0) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const idx = s % pool.length;
    picked.push(pool.splice(idx, 1)[0]);
  }
  const quests: QuestProgress[] = picked.map((q) => ({
    id: q.id,
    progress: 0,
    goal: q.goal,
    claimed: false,
  }));
  return { date, quests };
}
