import { MILESTONE_DAYS } from "@/config/app";

export type MilestoneRecord = { start: string; seen: number };
const KEY = "hold_milestone_seen";

/** Highest milestone reached (≤ days) that is above the last one already seen, or null. */
export function milestoneToCelebrate(days: number, seen: number): number | null {
  const reached = MILESTONE_DAYS.filter((d) => d <= days && d > seen);
  return reached.length ? reached[reached.length - 1]! : null;
}

/** Highest milestone already reached, used to start a record silently (no celebration for past progress). */
export function highestReached(days: number): number {
  return MILESTONE_DAYS.filter((d) => d <= days).at(-1) ?? 0;
}

export function readMilestoneRecord(): MilestoneRecord | null {
  try { const r = JSON.parse(localStorage.getItem(KEY) ?? "null"); return r && typeof r.start === "string" && typeof r.seen === "number" ? r : null; } catch { return null; }
}
export function writeMilestoneRecord(r: MilestoneRecord) {
  try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* storage unavailable */ }
}

/**
 * Decides whether to celebrate now. A record belongs to one streak (identified by its start date):
 * the first time a streak is seen, past progress is recorded silently; later milestones are celebrated once.
 */
export function checkMilestone(start: string, days: number): number | null {
  const rec = readMilestoneRecord();
  if (!rec || rec.start !== start) { writeMilestoneRecord({ start, seen: highestReached(days) }); return null; }
  const m = milestoneToCelebrate(days, rec.seen);
  if (m !== null) writeMilestoneRecord({ start, seen: m });
  return m;
}
