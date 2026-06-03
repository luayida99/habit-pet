/**
 * The HabitPet engine: every game rule expressed as a pure transition over
 * {@link GameState}. The UI never mutates state directly — it dispatches one
 * of these functions and renders the result, which keeps behaviour testable
 * and time-travel/undo friendly.
 *
 * Conventions:
 *  - Functions return a {@link Transition} ({ state, events }) when they can
 *    emit player-facing toasts; simple structural edits return GameState.
 *  - Time is always injected as `now` so tests are deterministic.
 *  - State is treated as immutable; we always return fresh objects.
 */
import {
  ACHIEVEMENTS,
  achievement,
} from "./achievements";
import {
  DECAY_GRACE_MINUTES,
  DECAY_PER_HOUR,
  REWARDS,
  SPECIES,
  STARTER_HABITS,
  STATE_VERSION,
  STREAK_MILESTONES,
  xpForLevel,
} from "./constants";
import { addDays, dayKey, daysBetween } from "./dates";
import { questDef, rollQuests } from "./quests";
import {
  activeHabits,
  clampMeter,
  habitBestStreak,
  habitDoneToday,
  habitStreak,
  topStreak,
} from "./selectors";
import { shopItem } from "./shop";
import type {
  GameEvent,
  GameState,
  Habit,
  PetSpecies,
  Transition,
} from "./types";

let eventSeq = 0;
const uid = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const evt = (kind: GameEvent["kind"], message: string, icon?: string): GameEvent => ({
  id: `e${eventSeq++}`,
  kind,
  message,
  icon,
});

// ───────────────────────────────────────────────────────────── initial state

export function createInitialState(now: number = Date.now()): GameState {
  return {
    version: STATE_VERSION,
    onboarded: false,
    createdAt: now,
    lastTickAt: now,
    pet: {
      name: "",
      species: "mint",
      happiness: 80,
      health: 90,
      energy: 85,
      lastPlayedAt: 0,
    },
    habits: [],
    coins: 30,
    xp: 0,
    level: 1,
    longestStreakEver: 0,
    freezes: 1,
    frozenDays: [],
    ownedItems: [],
    equipped: {},
    achievements: [],
    quests: rollQuests(now),
    settings: { sound: true, reducedMotion: false },
    stats: { totalCompletions: 0, activeDays: [], petsGiven: 0, questsCompleted: 0 },
  };
}

export function completeOnboarding(
  state: GameState,
  opts: { name: string; species: PetSpecies; starters: boolean },
  now: number = Date.now(),
): GameState {
  const habits: Habit[] = opts.starters
    ? STARTER_HABITS.map((h) => makeHabit(h.name, h.emoji, h.color, now))
    : [];
  return {
    ...state,
    onboarded: true,
    pet: { ...state.pet, name: opts.name.trim() || SPECIES[opts.species].label, species: opts.species },
    habits,
    quests: rollQuests(now),
    lastTickAt: now,
  };
}

// ──────────────────────────────────────────────────────────────── progression

/** Re-derive XP→level rollovers and longest-streak record. Pure + idempotent. */
function settleProgression(state: GameState, now: number): Transition {
  const events: GameEvent[] = [];
  let { xp, level } = state;

  // Multi-level rollovers in one go (e.g. a big quest reward).
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
    events.push(evt("levelup", `Level up! You reached level ${level} 🎉`, "⭐"));
  }

  const best = Math.max(state.longestStreakEver, topStreak(state, now));
  let next: GameState = { ...state, xp, level, longestStreakEver: best };

  // Achievements: unlock any newly-satisfied badge and pay out its reward.
  for (const a of ACHIEVEMENTS) {
    if (!next.achievements.includes(a.id) && a.test(next)) {
      next = { ...next, achievements: [...next.achievements, a.id], coins: next.coins + a.reward };
      events.push(
        evt("achievement", `Achievement: ${a.name}${a.reward ? ` (+${a.reward}🪙)` : ""}`, a.icon),
      );
    }
  }
  return { state: next, events };
}

function grant(state: GameState, coins: number, xp: number): GameState {
  return { ...state, coins: state.coins + coins, xp: state.xp + xp };
}

// ───────────────────────────────────────────────────────────────── time tick

/**
 * Advance the world to `now`: decay meters for elapsed real time, spend
 * freeze tokens to bridge missed days, and roll the daily quest set over.
 * Safe to call as often as you like — it's a function of elapsed time.
 */
export function applyTick(state: GameState, now: number = Date.now()): Transition {
  const events: GameEvent[] = [];
  const elapsedMin = (now - state.lastTickAt) / 60_000;

  let pet = state.pet;
  if (elapsedMin > DECAY_GRACE_MINUTES) {
    const hours = (elapsedMin - DECAY_GRACE_MINUTES) / 60;
    pet = {
      ...pet,
      happiness: clampMeter(pet.happiness - hours * DECAY_PER_HOUR.happiness),
      health: clampMeter(pet.health - hours * DECAY_PER_HOUR.health),
      energy: clampMeter(pet.energy - hours * DECAY_PER_HOUR.energy),
    };
  }

  let next: GameState = { ...state, pet };

  // Streak-freeze: bridge any fully-missed days since the last real activity.
  next = applyFreezes(next, now, events);

  // Daily quest rotation.
  const today = dayKey(now);
  if (next.quests.date !== today) {
    next = { ...next, quests: rollQuests(now) };
  }

  next = { ...next, lastTickAt: now };
  const settled = settleProgression(next, now);
  return { state: settled.state, events: [...events, ...settled.events] };
}

function applyFreezes(state: GameState, now: number, events: GameEvent[]): GameState {
  if (state.freezes <= 0) return state;
  const habits = activeHabits(state);
  // Most recent day with a *real* completion across all habits.
  let lastActive = "";
  for (const h of habits) for (const d of h.history) if (d > lastActive) lastActive = d;
  if (!lastActive) return state; // nothing to protect yet

  const today = dayKey(now);
  const gap = daysBetween(today, lastActive);
  if (gap < 2) return state; // no fully-missed day in between

  let next = state;
  // Bridge missed days oldest→newest while tokens last.
  for (let i = 1; i < gap && next.freezes > 0; i++) {
    const missed = addDays(lastActive, i);
    if (next.frozenDays.includes(missed)) continue;
    next = {
      ...next,
      freezes: next.freezes - 1,
      frozenDays: [...next.frozenDays, missed],
      habits: next.habits.map((h) =>
        h.archived ? h : { ...h, frozen: [...(h.frozen ?? []), missed] },
      ),
    };
    events.push(evt("info", "Streak freeze used — your streak is safe! 🧊", "🧊"));
  }
  return next;
}

// ───────────────────────────────────────────────────────────────────── habits

function makeHabit(name: string, emoji: string, color: string, now: number): Habit {
  return { id: uid(), name: name.trim(), emoji, color, createdAt: now, history: [] };
}

export function addHabit(
  state: GameState,
  input: { name: string; emoji: string; color: string },
  now: number = Date.now(),
): GameState {
  const habit = makeHabit(input.name, input.emoji, input.color, now);
  return settleProgression({ ...state, habits: [...state.habits, habit] }, now).state;
}

export function editHabit(
  state: GameState,
  id: string,
  patch: Partial<Pick<Habit, "name" | "emoji" | "color">>,
): GameState {
  return {
    ...state,
    habits: state.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
  };
}

export function archiveHabit(state: GameState, id: string): GameState {
  return {
    ...state,
    habits: state.habits.map((h) => (h.id === id ? { ...h, archived: true } : h)),
  };
}

/**
 * Check (or uncheck) a habit for *today*. Completing pays out coins/XP, feeds
 * the pet, advances quests, and fires streak-milestone celebrations. Unchecking
 * is a clean undo that claws the rewards back so the economy can't be farmed.
 */
export function toggleHabit(state: GameState, id: string, now: number = Date.now()): Transition {
  const today = dayKey(now);
  const habit = state.habits.find((h) => h.id === id);
  if (!habit || habit.archived) return { state, events: [] };

  const isDone = habit.history.includes(today);
  const events: GameEvent[] = [];

  if (isDone) {
    // Undo today's completion and reverse the rewards.
    const habits = state.habits.map((h) =>
      h.id === id ? { ...h, history: h.history.filter((d) => d !== today) } : h,
    );
    let next: GameState = {
      ...state,
      habits,
      coins: Math.max(0, state.coins - REWARDS.habitCoins),
      xp: Math.max(0, state.xp - REWARDS.habitXp),
      pet: {
        ...state.pet,
        happiness: clampMeter(state.pet.happiness - REWARDS.habitHappiness),
      },
      stats: {
        ...state.stats,
        totalCompletions: Math.max(0, state.stats.totalCompletions - 1),
        activeDays: stillActive(habits, today)
          ? state.stats.activeDays
          : state.stats.activeDays.filter((d) => d !== today),
      },
    };
    next = recomputeQuests(next, now);
    return settleProgression(next, now);
  }

  // Complete it.
  const habits = state.habits.map((h) =>
    h.id === id ? { ...h, history: [...h.history, today].sort() } : h,
  );
  const updated = habits.find((h) => h.id === id)!;
  const streak = habitStreak(updated, now);

  let next: GameState = grant(
    {
      ...state,
      habits,
      pet: {
        ...state.pet,
        happiness: clampMeter(state.pet.happiness + REWARDS.habitHappiness),
        health: clampMeter(state.pet.health + REWARDS.habitHealth),
        energy: clampMeter(state.pet.energy + REWARDS.habitEnergy),
      },
      stats: {
        ...state.stats,
        totalCompletions: state.stats.totalCompletions + 1,
        activeDays: state.stats.activeDays.includes(today)
          ? state.stats.activeDays
          : [...state.stats.activeDays, today],
      },
    },
    REWARDS.habitCoins,
    REWARDS.habitXp,
  );

  events.push(evt("coins", `${habit.emoji} ${habit.name} done! +${REWARDS.habitCoins}🪙 +${REWARDS.habitXp}xp`, "✅"));

  if (STREAK_MILESTONES.includes(streak)) {
    next = { ...next, coins: next.coins + REWARDS.streakMilestoneCoins };
    events.push(evt("streak", `${streak}-day streak on ${habit.name}! +${REWARDS.streakMilestoneCoins}🪙`, "🔥"));
  }

  next = recomputeQuests(next, now);
  const settled = settleProgression(next, now);
  return { state: settled.state, events: [...events, ...settled.events] };
}

const stillActive = (habits: Habit[], day: string): boolean =>
  habits.some((h) => !h.archived && h.history.includes(day));

// ──────────────────────────────────────────────────────────── pet interaction

/** Pet/play interaction — free affection that perks the pet up. */
export function petInteract(state: GameState, now: number = Date.now()): Transition {
  const next: GameState = {
    ...state,
    pet: {
      ...state.pet,
      happiness: clampMeter(state.pet.happiness + REWARDS.playHappiness),
      energy: clampMeter(state.pet.energy + REWARDS.playEnergy),
      lastPlayedAt: now,
    },
    stats: { ...state.stats, petsGiven: state.stats.petsGiven + 1 },
  };
  return settleProgression(advancePetQuests(recomputeQuests(next, now)), now);
}

// ─────────────────────────────────────────────────────────────────────── shop

export function buyItem(state: GameState, itemId: string): Transition {
  const item = shopItem(itemId);
  if (!item) return { state, events: [] };
  if (state.coins < item.price) {
    return { state, events: [evt("info", "Not enough coins yet — keep at it!", "🪙")] };
  }

  if (item.slot === "consumable") {
    let next = { ...state, coins: state.coins - item.price };
    if (item.id === "item-freeze") {
      next = { ...next, freezes: next.freezes + 1 };
    } else if (item.id === "item-feast") {
      next = {
        ...next,
        pet: { ...next.pet, happiness: 100, health: 100, energy: clampMeter(next.pet.energy + 30) },
      };
    }
    return { state: next, events: [evt("info", `Bought ${item.name}! ${item.icon}`, item.icon)] };
  }

  if (state.ownedItems.includes(itemId)) {
    return { state: equipItem(state, itemId), events: [] };
  }
  const owned = { ...state, coins: state.coins - item.price, ownedItems: [...state.ownedItems, itemId] };
  const equipped = equipItem(owned, itemId);
  const settled = settleProgression(equipped, Date.now());
  return {
    state: settled.state,
    events: [evt("info", `Unlocked ${item.name}! ${item.icon}`, item.icon), ...settled.events],
  };
}

/** Equip an owned cosmetic (or toggle it off if already worn). */
export function equipItem(state: GameState, itemId: string): GameState {
  const item = shopItem(itemId);
  if (!item || item.slot === "consumable" || !item.value) return state;
  const slot = item.slot as keyof GameState["equipped"];
  const isOn = state.equipped[slot] === item.value;
  return { ...state, equipped: { ...state.equipped, [slot]: isOn ? undefined : item.value } };
}

// ───────────────────────────────────────────────────────────────────── quests

/** Recompute today's quest progress from current state, granting claims later. */
function recomputeQuests(state: GameState, now: number): GameState {
  const today = dayKey(now);
  if (state.quests.date !== today) state = { ...state, quests: rollQuests(now) };

  const completedToday = activeHabits(state).filter((h) => habitDoneToday(h, now)).length;

  const quests = state.quests.quests.map((q) => {
    // Habit-derived quests track today's completion count directly; pet quests
    // (q-pet / q-play) are advanced incrementally in petInteract, so we leave
    // their progress untouched here.
    if (q.id === "q-complete" || q.id === "q-complete-big" || q.id === "q-first") {
      return { ...q, progress: Math.min(completedToday, q.goal) };
    }
    return q;
  });
  return { ...state, quests: { ...state.quests, quests } };
}

/** Bump pet-interaction quests by one. Called from {@link petInteract}. */
function advancePetQuests(state: GameState): GameState {
  const quests = state.quests.quests.map((q) =>
    q.id === "q-pet" || q.id === "q-play"
      ? { ...q, progress: Math.min(q.progress + 1, q.goal) }
      : q,
  );
  return { ...state, quests: { ...state.quests, quests } };
}

export function claimQuest(state: GameState, questId: string, now: number = Date.now()): Transition {
  const q = state.quests.quests.find((x) => x.id === questId);
  const def = questDef(questId);
  if (!q || !def || q.claimed || q.progress < q.goal) return { state, events: [] };

  const quests = state.quests.quests.map((x) =>
    x.id === questId ? { ...x, claimed: true } : x,
  );
  const next: GameState = {
    ...grant({ ...state, quests: { ...state.quests, quests } }, def.reward, def.reward),
    stats: { ...state.stats, questsCompleted: state.stats.questsCompleted + 1 },
  };
  const settled = settleProgression(next, now);
  return {
    state: settled.state,
    events: [evt("quest", `Quest complete: ${def.name}! +${def.reward}🪙 +${def.reward}xp`, def.icon), ...settled.events],
  };
}

export { achievement, habitBestStreak };
