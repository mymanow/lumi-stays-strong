export type LumiStage = 1 | 2 | 3 | 4;

/** Stage from days; never decreases because callers pass the best of current and best streak. */
export function lumiStageForDays(days: number): LumiStage {
  if (days >= 90) return 4;
  if (days >= 30) return 3;
  if (days >= 7) return 2;
  return 1;
}

export function splitDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export const MOTIVATIONS = ["win_back", "reconcile", "perspective", "move_on", "unsure"] as const;
export const SITUATIONS = ["breakup", "pulling_away", "going_back", "mixed_signals", "moved_on", "asked_space", "want_space"] as const;
export const DEFAULT_REMINDER_TIME = "21:30";

/** Days since the last contact at the lowest bound of each range, so the counter never overstates progress. */
export const CONTACT_RANGE_DAYS = { today: 0, week: 1, month: 8, m1_3: 31, m3_6: 91, gt_6m: 181 } as const;
/** Days of the no-contact goals offered in onboarding ("open" has none). */
export const GOAL_DAYS: Record<string, number | undefined> = { d7: 7, d14: 14, d30: 30, d60: 60, d90: 90, d180: 180 };
export type ContactRange = keyof typeof CONTACT_RANGE_DAYS;

export function motivationKey(motivation?: string | null) {
  return (MOTIVATIONS as readonly string[]).includes(motivation ?? "") ? motivation! : "unsure";
}
export function situationKey(situation?: string | null) {
  return situation === "going_back" || situation === "moved_on" ? situation : "default";
}

export function commitmentPhraseKeys(motivation?: string | null, situation?: string | null) {
  return [`commit.motivation.${motivationKey(motivation)}`, "commit.always", `commit.situation.${situationKey(situation)}`];
}

const CRISIS_PATTERNS = [
  /suicid/i, /me tuer/i, /me suicider/i, /en finir/i, /mourir/i, /plus envie de vivre/i, /me faire du mal/i, /scarif/i, /automutil/i,
  /kill myself/i, /end it all/i, /want to die/i, /self[- ]?harm/i, /hurt myself/i, /cut myself/i, /no reason to live/i,
];
export function detectCrisis(text: string) {
  return CRISIS_PATTERNS.some((r) => r.test(text));
}

export type CrisisLine = { number: string; tel: string };
export function crisisLineFor(lang: string, locale?: string): CrisisLine {
  if (lang === "fr") return { number: "3114", tel: "3114" };
  const region = (locale ?? "").split("-")[1]?.toUpperCase();
  if (region === "GB" || region === "IE") return { number: "116 123", tel: "116123" };
  return { number: "988", tel: "988" };
}

export function localDateString(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function timeOfDay(hour: number): "morning" | "afternoon" | "evening" | "night" {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "night";
}
