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

export function commitmentPhraseKeys(motivation?: string | null, situation?: string | null) {
  const mot = ["take_back_control", "move_on", "win_back", "unsure"].includes(motivation ?? "") ? motivation! : "unsure";
  const sit = situation === "toxic" || situation === "one_sided_love" ? situation : "default";
  return [`commit.motivation.${mot}`, "commit.always", `commit.situation.${sit}`];
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
