/**
 * Daily reward: a once-per-day chest on a 7-day login track. Coins grow through
 * the week and day 7 drops a Streak Freeze, then the track loops. Missing a day
 * resets the login streak but never punishes you — you just start the week over.
 */
import { dayKey } from "./dates";
import { randInt, type RNG } from "./rng";
import type { GameState } from "./types";

export const WEEK_LEN = 7;

export function canClaimDaily(state: GameState, now: number = Date.now()): boolean {
  return state.dailyReward.lastClaim !== dayKey(now);
}

/** The login streak the player *would* be on if they claimed right now. */
export function nextLoginStreak(state: GameState, now: number = Date.now()): number {
  const today = dayKey(now);
  const last = state.dailyReward.lastClaim;
  if (!last) return 1;
  // Yesterday → continue; anything older → reset.
  const yesterday = dayKey(now - 86_400_000);
  if (last === yesterday) return state.dailyReward.streak + 1;
  if (last === today) return state.dailyReward.streak; // already claimed
  return 1;
}

/** 1..7 position within the current weekly track for a given streak. */
export const weekDay = (streak: number): number => ((streak - 1) % WEEK_LEN) + 1;

export interface DailyRewardLoot {
  coins: number;
  freeze: number;
  streak: number;
  day: number; // 1..7
}

export function rollDailyReward(streak: number, rng: RNG): DailyRewardLoot {
  const day = weekDay(streak);
  const coins = 15 + day * 5 + randInt(0, 10, rng);
  const freeze = day === WEEK_LEN ? 1 : 0;
  return { coins, freeze, streak, day };
}
