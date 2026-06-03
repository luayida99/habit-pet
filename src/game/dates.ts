import type { DateKey } from "./types";

/** Local-time day key, `YYYY-MM-DD`. Uses local tz so "today" matches the user. */
export function dayKey(ts: number | Date = Date.now()): DateKey {
  const d = typeof ts === "number" ? new Date(ts) : ts;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a `YYYY-MM-DD` key back into a local Date at midnight. */
export function parseDayKey(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Day key `n` days before the given key (n may be negative). */
export function addDays(key: DateKey, n: number): DateKey {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** Whole-day difference `a - b` (a later than b → positive). */
export function daysBetween(a: DateKey, b: DateKey): number {
  const ms = parseDayKey(a).getTime() - parseDayKey(b).getTime();
  return Math.round(ms / 86_400_000);
}

export function isToday(key: DateKey, now: number = Date.now()): boolean {
  return key === dayKey(now);
}
