export type StreakEvent = { type: string; occurred_at: string; previous_streak_seconds: number | null };
export type PastStreak = { endedAt: string; seconds: number };
export type StreakStats = {
  currentSeconds: number;
  bestSeconds: number;
  /** Number of attempts so far: every relapse starts a new one. */
  attempts: number;
  resistances: number;
  relapses: number;
  /** Streaks that ended with a relapse, newest first. */
  past: PastStreak[];
};

/** Current streak, best streak and history, derived from the events the app already records. */
export function streakStats(events: StreakEvent[], lastContactAt: string | null | undefined, profileBestSeconds = 0, now = Date.now()): StreakStats {
  const currentSeconds = lastContactAt ? Math.max(0, (now - new Date(lastContactAt).getTime()) / 1000) : 0;
  const relapses = events.filter((e) => e.type === "relapse");
  const past = relapses
    .filter((e) => (e.previous_streak_seconds ?? 0) > 0)
    .map((e) => ({ endedAt: e.occurred_at, seconds: e.previous_streak_seconds as number }))
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  const bestSeconds = Math.max(profileBestSeconds, currentSeconds, ...past.map((p) => p.seconds));
  return {
    currentSeconds,
    bestSeconds,
    attempts: relapses.length + 1,
    resistances: events.filter((e) => e.type === "resistance").length,
    relapses: relapses.length,
    past,
  };
}
