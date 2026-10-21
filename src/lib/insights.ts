export type CheckinRow = { date: string; mood: number; urge: number; triggers: string[] | null };
export type EventRow = { type: string; trigger: string | null };

const DAY = 86400000;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);

export type ChartPoint = { date: string; mood: number | null; urge: number | null };

/** One point per day over the last `days` days (oldest first); days without a check-in are null, never invented. */
export function chartSeries(checkins: CheckinRow[], days: number, today = new Date()): ChartPoint[] {
  const byDate = new Map(checkins.map((c) => [c.date, c]));
  return Array.from({ length: days }, (_, i) => {
    const date = iso(addDays(today, i - (days - 1)));
    const c = byDate.get(date);
    return { date, mood: c?.mood ?? null, urge: c?.urge ?? null };
  });
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export type Trend = "up" | "down" | "flat";
export type WeekSummary = { count: number; mood: number | null; urge: number | null; moodTrend: Trend | null; urgeTrend: Trend | null };

function trend(now: number[], before: number[]): Trend | null {
  if (now.length < 3 || before.length < 3) return null; // not enough data to say anything
  const diff = avg(now)! - avg(before)!;
  return Math.abs(diff) < 0.4 ? "flat" : diff > 0 ? "up" : "down";
}

/** Last 7 days against the 7 before. A trend is only reported with at least 3 check-ins in each window. */
export function weekSummary(checkins: CheckinRow[], today = new Date()): WeekSummary {
  const start7 = iso(addDays(today, -6));
  const start14 = iso(addDays(today, -13));
  const last = checkins.filter((c) => c.date >= start7 && c.date <= iso(today));
  const prev = checkins.filter((c) => c.date >= start14 && c.date < start7);
  return {
    count: last.length,
    mood: avg(last.map((c) => c.mood)),
    urge: avg(last.map((c) => c.urge)),
    moodTrend: trend(last.map((c) => c.mood), prev.map((c) => c.mood)),
    urgeTrend: trend(last.map((c) => c.urge), prev.map((c) => c.urge)),
  };
}

/** Triggers named in check-ins and relapses, most frequent first. */
export function topTriggers(checkins: CheckinRow[], events: EventRow[], limit = 4): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of checkins) for (const k of c.triggers ?? []) counts.set(k, (counts.get(k) ?? 0) + 1);
  for (const e of events) if (e.type === "relapse" && e.trigger) counts.set(e.trigger, (counts.get(e.trigger) ?? 0) + 1);
  return [...counts].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)).slice(0, limit);
}

export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY);
