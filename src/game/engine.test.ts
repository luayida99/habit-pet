import { describe, expect, it } from "vitest";
import {
  addHabit,
  applyTick,
  buyItem,
  claimQuest,
  completeOnboarding,
  createInitialState,
  petInteract,
  toggleHabit,
} from "./engine";
import { addDays, dayKey } from "./dates";
import {
  completedTodayCount,
  currentStage,
  evolutionStage,
  habitBestStreak,
  habitStreak,
  levelInfo,
  petMood,
  topStreak,
} from "./selectors";
import type { GameState, Habit } from "./types";

// A fixed reference time keeps day math deterministic regardless of when tests run.
const T0 = new Date(2026, 0, 15, 9, 0, 0).getTime(); // 2026-01-15 09:00 local
const HOUR = 3_600_000;
const DAY = 86_400_000;

function freshGame(now = T0): GameState {
  const s = createInitialState(now);
  return completeOnboarding(s, { name: "Mochi", species: "mint", starters: false }, now);
}

function habitWith(history: string[]): Habit {
  return { id: "h", name: "x", emoji: "💧", color: "#fff", createdAt: T0, history };
}

describe("streak math", () => {
  it("counts a run ending today", () => {
    const h = habitWith([dayKey(T0 - 2 * DAY), dayKey(T0 - DAY), dayKey(T0)]);
    expect(habitStreak(h, T0)).toBe(3);
  });

  it("counts a run ending yesterday as still alive (today not done yet)", () => {
    const h = habitWith([dayKey(T0 - 2 * DAY), dayKey(T0 - DAY)]);
    expect(habitStreak(h, T0)).toBe(2);
  });

  it("is zero once a day was fully missed", () => {
    const h = habitWith([dayKey(T0 - 3 * DAY), dayKey(T0 - 2 * DAY)]);
    expect(habitStreak(h, T0)).toBe(0);
  });

  it("best streak finds the longest historical run", () => {
    const h = habitWith([
      "2026-01-01", "2026-01-02", "2026-01-03", // run of 3
      "2026-01-10", "2026-01-11", // run of 2
    ]);
    expect(habitBestStreak(h)).toBe(3);
  });
});

describe("toggle habit", () => {
  it("awards coins, xp and happiness on completion and reverses on undo", () => {
    const g = addHabit(freshGame(), { name: "Water", emoji: "💧", color: "#4b9bff" }, T0);
    const id = g.habits[0].id;

    const done = toggleHabit(g, id, T0).state;
    expect(done.coins).toBeGreaterThan(g.coins);
    expect(done.xp).toBeGreaterThan(g.xp);
    expect(done.stats.totalCompletions).toBe(1);
    expect(completedTodayCount(done, T0)).toBe(1);

    const undone = toggleHabit(done, id, T0).state;
    expect(undone.stats.totalCompletions).toBe(0);
    expect(completedTodayCount(undone, T0)).toBe(0);
    // Undo claws back the habit reward; permanent achievement payouts stay.
    expect(undone.coins).toBe(done.coins - 8);
  });

  it("fires a streak milestone at 3 days", () => {
    let g = addHabit(freshGame(T0 - 2 * DAY), { name: "Water", emoji: "💧", color: "#4b9bff" }, T0 - 2 * DAY);
    const id = g.habits[0].id;
    g = toggleHabit(g, id, T0 - 2 * DAY).state;
    g = toggleHabit(g, id, T0 - DAY).state;
    const t = toggleHabit(g, id, T0);
    expect(habitStreak(t.state.habits[0], T0)).toBe(3);
    expect(t.events.some((e) => e.kind === "streak")).toBe(true);
  });

  it("tracks the longest streak ever across undo", () => {
    let g = addHabit(freshGame(T0 - DAY), { name: "Water", emoji: "💧", color: "#4b9bff" }, T0 - DAY);
    const id = g.habits[0].id;
    g = toggleHabit(g, id, T0 - DAY).state;
    g = toggleHabit(g, id, T0).state;
    expect(g.longestStreakEver).toBe(2);
  });
});

describe("evolution", () => {
  it("maps longest streak to a stage", () => {
    expect(evolutionStage(0)).toBe("blob");
    expect(evolutionStage(3)).toBe("child");
    expect(evolutionStage(7)).toBe("teen");
    expect(evolutionStage(21)).toBe("grown");
  });

  it("starts as an egg until the first completion", () => {
    const g = freshGame();
    expect(currentStage(g)).toBe("egg");
    const withHabit = addHabit(g, { name: "Water", emoji: "💧", color: "#4b9bff" }, T0);
    const done = toggleHabit(withHabit, withHabit.habits[0].id, T0).state;
    expect(currentStage(done)).toBe("blob");
  });
});

describe("decay tick", () => {
  it("decays happiness over many hours away but never below zero", () => {
    const g = freshGame();
    const later = applyTick(g, T0 + 48 * HOUR).state;
    expect(later.pet.happiness).toBeLessThan(g.pet.happiness);
    expect(later.pet.happiness).toBeGreaterThanOrEqual(0);
  });

  it("does not decay within the grace window", () => {
    const g = freshGame();
    const soon = applyTick(g, T0 + 30 * 60_000).state; // 30 min later
    expect(soon.pet.happiness).toBe(g.pet.happiness);
  });
});

describe("streak freeze", () => {
  it("bridges a single missed day when a token is available", () => {
    // Complete on day -2 and day -1, then jump to today having missed nothing
    // is fine; instead complete only on T0-2DAY then tick across the gap.
    let g = freshGame(T0 - 2 * DAY);
    g = addHabit(g, { name: "Water", emoji: "💧", color: "#4b9bff" }, T0 - 2 * DAY);
    const id = g.habits[0].id;
    // done two days ago and yesterday → streak 2 heading into today
    g = toggleHabit(g, id, T0 - 2 * DAY).state;
    g = toggleHabit(g, id, T0 - DAY).state;
    expect(g.freezes).toBeGreaterThanOrEqual(1);

    // Skip a whole day: jump two days forward without completing.
    const ticked = applyTick(g, T0 + DAY).state; // "today" is T0+DAY, yesterday (T0) was missed
    const frozenDay = dayKey(T0); // the missed day
    expect(ticked.frozenDays).toContain(frozenDay);
    // Streak survives: history -1d/-2d + frozen T0 → still counted to yesterday.
    expect(habitStreak(ticked.habits[0], T0 + DAY)).toBeGreaterThanOrEqual(2);
  });
});

describe("quests", () => {
  it("advances and lets you claim a completion quest", () => {
    let g = freshGame();
    // Force a known quest set containing q-complete with goal 3.
    g = { ...g, quests: { date: dayKey(T0), quests: [{ id: "q-complete", progress: 0, goal: 3, claimed: false }] } };
    for (let i = 0; i < 3; i++) {
      g = addHabit(g, { name: `h${i}`, emoji: "💧", color: "#4b9bff" }, T0);
    }
    for (const h of g.habits) g = toggleHabit(g, h.id, T0).state;
    expect(g.quests.quests[0].progress).toBe(3);
    const claimed = claimQuest(g, "q-complete", T0);
    expect(claimed.state.quests.quests[0].claimed).toBe(true);
    expect(claimed.state.coins).toBeGreaterThan(g.coins);
  });
});

describe("shop", () => {
  it("buys and equips a cosmetic, spending coins once", () => {
    let g = freshGame();
    g = { ...g, coins: 1000 };
    const res = buyItem(g, "color-sunshine");
    expect(res.state.ownedItems).toContain("color-sunshine");
    expect(res.state.equipped.color).toBe("#ffd34d");
    expect(res.state.coins).toBe(1000 - 60);
    // Re-buying an owned item just toggles equip, no extra charge.
    const toggled = buyItem(res.state, "color-sunshine");
    expect(toggled.state.coins).toBe(res.state.coins);
  });

  it("rejects purchases you can't afford", () => {
    const g = { ...freshGame(), coins: 0 };
    const res = buyItem(g, "color-galaxy");
    expect(res.state.coins).toBe(0);
    expect(res.state.ownedItems).not.toContain("color-galaxy");
  });

  it("streak-freeze consumable adds a token", () => {
    const g = { ...freshGame(), coins: 1000, freezes: 0 };
    const res = buyItem(g, "item-freeze");
    expect(res.state.freezes).toBe(1);
  });
});

describe("pet interaction", () => {
  it("raises happiness and counts toward stats", () => {
    const g = { ...freshGame(), pet: { ...freshGame().pet, happiness: 50 } };
    const res = petInteract(g, T0);
    expect(res.state.pet.happiness).toBeGreaterThan(50);
    expect(res.state.stats.petsGiven).toBe(1);
  });
});

describe("derived helpers", () => {
  it("computes mood from meters", () => {
    const g = freshGame();
    expect(petMood({ ...g, pet: { ...g.pet, happiness: 95, health: 95, energy: 95 } }, T0)).toBe("happy");
    expect(petMood({ ...g, pet: { ...g.pet, health: 10, happiness: 50, energy: 50 } }, T0)).toBe("sick");
  });

  it("reports level progress", () => {
    const info = levelInfo(freshGame());
    expect(info.level).toBe(1);
    expect(info.progress).toBeGreaterThanOrEqual(0);
    expect(info.progress).toBeLessThanOrEqual(1);
  });

  it("topStreak reflects the best active streak", () => {
    let g = addHabit(freshGame(T0 - DAY), { name: "Water", emoji: "💧", color: "#4b9bff" }, T0 - DAY);
    const id = g.habits[0].id;
    g = toggleHabit(g, id, T0 - DAY).state;
    g = toggleHabit(g, id, T0).state;
    expect(topStreak(g, T0)).toBe(2);
  });
});

it("addDays / dayKey round trip", () => {
  expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
});
