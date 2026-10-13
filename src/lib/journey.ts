/** Recovery journey: six phases keyed by days without contact. The wording lives in i18n (journey.stages.*). */
export const JOURNEY_STARTS = [0, 4, 15, 31, 61, 91] as const;
export type JourneyKey = "s1" | "s2" | "s3" | "s4" | "s5" | "s6";
export const JOURNEY_KEYS: JourneyKey[] = ["s1", "s2", "s3", "s4", "s5", "s6"];

export function journeyIndexForDays(days: number): number {
  let index = 0;
  JOURNEY_STARTS.forEach((start, i) => { if (days >= start) index = i; });
  return index;
}

/** One tip per day, cycling through the phase's tips so the same day always shows the same one. */
export function dailyTipIndex(days: number, tipCount: number): number {
  return tipCount > 0 ? Math.max(0, Math.floor(days)) % tipCount : 0;
}

/** Progress inside the current phase, 0..1 (1 for the last, open-ended phase). */
export function journeyProgress(days: number): number {
  const i = journeyIndexForDays(days);
  const next = JOURNEY_STARTS[i + 1];
  if (next === undefined) return 1;
  const start = JOURNEY_STARTS[i]!;
  return Math.min(1, Math.max(0, (days - start) / (next - start)));
}
