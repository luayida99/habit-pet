import { describe, expect, it } from "vitest";
import {
  addHabit,
  applyTick,
  buyItem,
  claimDailyReward,
  claimQuest,
  collectAdventure,
  completeOnboarding,
  createInitialState,
  finishMiniGame,
  hatchEgg,
  petInteract,
  startAdventure,
  toggleHabit,
} from "./engine";
import { adventureDef } from "./adventures";
import { nextLoginStreak, weekDay } from "./dailyReward";
import { EGG_PRICE } from "./gacha";
import { scoreToReward, miniGameDef, DAILY_COIN_CAP } from "./minigames";
import { mulberry32 } from "./rng";
import { adventureRemainingMs } from "./selectors";
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

describe("habit combos", () => {
  it("stacks bonus coins for quick successive check-ins", () => {
    let g = freshGame();
    g = addHabit(g, { name: "a", emoji: "💧", color: "#fff" }, T0);
    g = addHabit(g, { name: "b", emoji: "💧", color: "#fff" }, T0);
    g = addHabit(g, { name: "c", emoji: "💧", color: "#fff" }, T0);
    const ids = g.habits.map((h) => h.id);

    const r1 = toggleHabit(g, ids[0], T0);
    expect(r1.state.combo.count).toBe(1);
    const r2 = toggleHabit(r1.state, ids[1], T0 + 1000); // within window
    expect(r2.state.combo.count).toBe(2);
    expect(r2.events.some((e) => e.kind === "combo")).toBe(true);
    const r3 = toggleHabit(r2.state, ids[2], T0 + 2000);
    expect(r3.state.combo.count).toBe(3);

    // Coins reflect base + combo bonus (3 + 0, 3 + 1*3, 3 ... base habitCoins=8)
    // Just assert the 3rd completion granted more than a lone completion would.
    const lone = toggleHabit(freshGameWithHabit(), "h", T0);
    const loneGain = lone.state.coins - freshGameWithHabit().coins;
    const comboGain = r3.state.coins - r2.state.coins;
    expect(comboGain).toBeGreaterThan(loneGain);
  });

  it("resets the combo after the window lapses", () => {
    let g = freshGame();
    g = addHabit(g, { name: "a", emoji: "💧", color: "#fff" }, T0);
    g = addHabit(g, { name: "b", emoji: "💧", color: "#fff" }, T0);
    const ids = g.habits.map((h) => h.id);
    const r1 = toggleHabit(g, ids[0], T0);
    const r2 = toggleHabit(r1.state, ids[1], T0 + 60_000); // > window
    expect(r2.state.combo.count).toBe(1);
  });
});

describe("daily reward", () => {
  it("increments login streak on consecutive days and blocks double-claim", () => {
    const g = freshGame();
    const first = claimDailyReward(g, T0, mulberry32(1));
    expect(first.state.coins).toBeGreaterThan(g.coins);
    expect(first.state.dailyReward.streak).toBe(1);
    // Same day → no-op.
    const again = claimDailyReward(first.state, T0, mulberry32(1));
    expect(again.state.coins).toBe(first.state.coins);
    // Next day → streak 2.
    const next = claimDailyReward(first.state, T0 + DAY, mulberry32(2));
    expect(next.state.dailyReward.streak).toBe(2);
    // Skip a day → reset to 1.
    const skipped = claimDailyReward(next.state, T0 + 3 * DAY, mulberry32(3));
    expect(skipped.state.dailyReward.streak).toBe(1);
  });

  it("day 7 grants a freeze token", () => {
    const g = { ...freshGame(), dailyReward: { lastClaim: dayKey(T0 - DAY), streak: 6 } };
    const before = g.freezes;
    const r = claimDailyReward(g, T0, mulberry32(5));
    expect(weekDay(r.state.dailyReward.streak)).toBe(7);
    expect(r.state.freezes).toBe(before + 1);
  });

  it("nextLoginStreak is pure and correct", () => {
    const g = { ...freshGame(), dailyReward: { lastClaim: dayKey(T0 - DAY), streak: 4 } };
    expect(nextLoginStreak(g, T0)).toBe(5);
  });
});

describe("adventures", () => {
  it("starts only with enough energy and spends it", () => {
    const g = { ...freshGame(), pet: { ...freshGame().pet, energy: 100 } };
    const def = adventureDef("forest")!;
    const r = startAdventure(g, "forest", T0);
    expect(r.state.adventure?.defId).toBe("forest");
    expect(r.state.pet.energy).toBe(100 - def.energyCost);
    expect(adventureRemainingMs(r.state, T0)).toBe(def.durationMin * 60_000);
  });

  it("refuses to start with low energy or when one is active", () => {
    const low = { ...freshGame(), pet: { ...freshGame().pet, energy: 1 } };
    expect(startAdventure(low, "summit", T0).state.adventure).toBeNull();

    const busy = startAdventure({ ...freshGame(), pet: { ...freshGame().pet, energy: 100 } }, "backyard", T0).state;
    const second = startAdventure(busy, "forest", T0);
    expect(second.state.adventure?.defId).toBe("backyard"); // unchanged
  });

  it("won't collect early but pays out + collects discoveries when done", () => {
    const g = { ...freshGame(), pet: { ...freshGame().pet, energy: 100 } };
    const started = startAdventure(g, "backyard", T0).state;
    const early = collectAdventure(started, T0 + 1000, mulberry32(42));
    expect(early.state.adventure).not.toBeNull(); // still exploring

    const def = adventureDef("backyard")!;
    const done = collectAdventure(started, T0 + def.durationMin * 60_000 + 1, mulberry32(42));
    expect(done.state.adventure).toBeNull();
    expect(done.state.coins).toBeGreaterThan(started.coins);
    expect(done.state.stats.adventuresDone).toBe(1);
  });
});

describe("mystery egg", () => {
  it("spends coins and grants a cosmetic (auto-equipped)", () => {
    const g = { ...freshGame(), coins: 1000 };
    const r = hatchEgg(g, T0, mulberry32(7));
    expect(r.state.coins).toBeLessThanOrEqual(1000 - EGG_PRICE + 300); // minus price, plus any refund
    expect(r.state.stats.eggsHatched).toBe(1);
    // Either a new owned cosmetic or a duplicate refund happened.
    const gainedItem = r.state.ownedItems.length > g.ownedItems.length;
    const gotRefund = r.state.coins > 1000 - EGG_PRICE;
    expect(gainedItem || gotRefund).toBe(true);
  });

  it("won't hatch without enough coins", () => {
    const g = { ...freshGame(), coins: 0 };
    const r = hatchEgg(g, T0, mulberry32(7));
    expect(r.state.coins).toBe(0);
    expect(r.state.ownedItems.length).toBe(0);
  });

  it("pity guarantees an epic+ after a dry streak", () => {
    const g = { ...freshGame(), coins: 100000, gachaPity: 7 };
    const r = hatchEgg(g, T0, mulberry32(123));
    // After hitting pity it should reset to 0 (an epic+ was pulled).
    expect(r.state.gachaPity).toBe(0);
  });
});

describe("mini-games", () => {
  it("rewards scale with score and respect the daily cap", () => {
    const def = miniGameDef("treat-catch")!;
    const small = scoreToReward(def, 10, 0);
    expect(small.coins).toBe(10);
    // Past the cap, coins taper to a trickle.
    const capped = scoreToReward(def, 100, DAILY_COIN_CAP);
    expect(capped.coins).toBeLessThan(100);
    expect(capped.coinsTowardCap).toBe(0);
  });

  it("finishMiniGame records a high score and tracks daily coins", () => {
    const g = { ...freshGame(), pet: { ...freshGame().pet, energy: 100 } };
    const r = finishMiniGame(g, "treat-catch", 25, T0);
    expect(r.state.arcade["treat-catch"].highScore).toBe(25);
    expect(r.state.coins).toBeGreaterThan(g.coins);
    expect(r.state.stats.gamesPlayed).toBe(1);
    // A lower later score keeps the previous high.
    const r2 = finishMiniGame(r.state, "treat-catch", 5, T0 + 1000);
    expect(r2.state.arcade["treat-catch"].highScore).toBe(25);
  });
});

function freshGameWithHabit(): GameState {
  let g = freshGame();
  g = { ...addHabit(g, { name: "x", emoji: "💧", color: "#fff" }, T0) };
  // normalize the id to "h" for the lone-completion comparison
  g = { ...g, habits: g.habits.map((h) => ({ ...h, id: "h" })) };
  return g;
}
