import { fr } from "@/i18n/fr";
import { en } from "@/i18n/en";
import { APP_NAME } from "@/config/app";
import { TRIAL_DAYS } from "@/config/whop";

/** The reminder goes out once, as soon as 48 hours or less are left in the trial ("2 days before it ends"). */
export const TRIAL_REMINDER_LEAD_MS = 48 * 3600 * 1000;

export type TrialRow = { whop_status: string | null; trial_ends_at: string | null; trial_reminder_sent_at: string | null };

/** True when this subscription is still in its trial, ends within 48 h, and was not reminded yet. */
export function trialReminderDue(row: TrialRow, now = new Date()): boolean {
  if (row.whop_status !== "trialing" || !row.trial_ends_at || row.trial_reminder_sent_at) return false;
  const left = new Date(row.trial_ends_at).getTime() - now.getTime();
  return left > 0 && left <= TRIAL_REMINDER_LEAD_MS;
}

/** Whop documents its period dates as ISO strings but describes them as Unix timestamps: accept both. */
export function toIso(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const d = typeof value === "number" || /^\d+$/.test(value) ? new Date(Number(value) * 1000) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String({ app: APP_NAME, ...vars }[k] ?? `{${k}}`));

/** The reminder e-mail, in the user's language. Trial end shown in Paris time, the app's market. */
export function trialReminderEmail(opts: { lang: string; name: string | null; endsAt: string; manageUrl: string }) {
  const d = opts.lang === "en" ? en.trialEmail : fr.trialEmail;
  const date = new Intl.DateTimeFormat(opts.lang === "en" ? "en-GB" : "fr-FR", {
    dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris",
  }).format(new Date(opts.endsAt)) + ` (${d.tz})`;
  const vars = { date, days: TRIAL_DAYS.quarterly, name: opts.name?.trim() ?? "" };
  const lines = [
    vars.name ? fill(d.hello, vars) : d.helloNoName,
    fill(d.body, vars),
    d.keep,
    `${fill(d.cancel, vars)} ${opts.manageUrl}`,
    fill(d.sign, vars),
  ];
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const html = [
    `<p>${esc(lines[0]!)}</p>`,
    `<p>${esc(lines[1]!)}</p>`,
    `<p>${esc(d.keep)}</p>`,
    `<p>${esc(fill(d.cancel, vars))} <a href="${esc(opts.manageUrl)}">${esc(opts.manageUrl)}</a></p>`,
    `<p>${esc(lines[4]!)}</p>`,
  ].join("\n");
  return { subject: fill(d.subject, vars), text: lines.join("\n\n"), html };
}
