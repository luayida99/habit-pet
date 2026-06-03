/**
 * Mini-game definitions and the score→reward conversion. The playable canvas
 * lives in the components; this module is the pure economy layer so rewards are
 * consistent and testable, with a daily soft cap that keeps coins meaningful.
 */
export interface MiniGameDef {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  energyCost: number;
  /** Coins per unit of score. */
  coinsPerScore: number;
  xpPerScore: number;
}

export const MINIGAMES: MiniGameDef[] = [
  {
    id: "treat-catch",
    name: "Treat Catch",
    icon: "🍬",
    blurb: "Catch falling treats — dodge the bombs!",
    energyCost: 8,
    coinsPerScore: 1,
    xpPerScore: 1,
  },
  {
    id: "pet-says",
    name: "Pet Says",
    icon: "🎵",
    blurb: "Repeat your pet's growing tune.",
    energyCost: 6,
    coinsPerScore: 6,
    xpPerScore: 5,
  },
];

export const miniGameDef = (id: string): MiniGameDef | undefined =>
  MINIGAMES.find((g) => g.id === id);

/** Coins earned from arcade games per day before rewards taper off. */
export const DAILY_COIN_CAP = 80;

export interface MiniGameReward {
  coins: number;
  xp: number;
  happiness: number;
  /** Coins counted toward today's cap (for persistence). */
  coinsTowardCap: number;
}

/**
 * Convert a finished game's score into a reward, applying the daily coin cap.
 * `coinsToday` is how many arcade coins have already been earned today.
 */
export function scoreToReward(
  def: MiniGameDef,
  score: number,
  coinsToday: number,
): MiniGameReward {
  const rawCoins = Math.round(score * def.coinsPerScore);
  const remaining = Math.max(0, DAILY_COIN_CAP - coinsToday);
  const fullCoins = Math.min(rawCoins, remaining);
  // Past the cap you still earn a 25% trickle so playing is never pointless.
  const overflow = Math.round((rawCoins - fullCoins) * 0.25);
  const coins = fullCoins + overflow;

  return {
    coins,
    xp: Math.round(score * def.xpPerScore),
    happiness: Math.min(20, 6 + Math.round(score / 4)),
    coinsTowardCap: fullCoins,
  };
}
