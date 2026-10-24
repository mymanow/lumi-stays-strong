import { describe, expect, it } from "vitest";
import { toIso, trialReminderDue, trialReminderEmail } from "@/lib/trial-reminder";

const now = new Date("2026-10-25T10:00:00Z");
const row = (over = {}) => ({ whop_status: "trialing", trial_ends_at: "2026-10-27T09:00:00Z", trial_reminder_sent_at: null, ...over });

describe("trial reminder", () => {
  it("is due once 48 hours or less are left in a running trial", () => {
    expect(trialReminderDue(row(), now)).toBe(true);
    expect(trialReminderDue(row({ trial_ends_at: "2026-10-27T11:00:00Z" }), now)).toBe(false); // 49 h left: too early
    expect(trialReminderDue(row({ trial_ends_at: "2026-10-25T09:00:00Z" }), now)).toBe(false); // already over
  });

  it("is never sent twice, nor outside a trial", () => {
    expect(trialReminderDue(row({ trial_reminder_sent_at: "2026-10-25T09:07:00Z" }), now)).toBe(false);
    expect(trialReminderDue(row({ whop_status: "active" }), now)).toBe(false);
    expect(trialReminderDue(row({ trial_ends_at: null }), now)).toBe(false);
  });

  it("accepts Whop dates as ISO strings or Unix seconds", () => {
    expect(toIso("2026-10-27T09:00:00Z")).toBe("2026-10-27T09:00:00.000Z");
    expect(toIso(1793095200)).toBe(new Date(1793095200 * 1000).toISOString());
    expect(toIso("1793095200")).toBe(new Date(1793095200 * 1000).toISOString());
    expect(toIso(null)).toBeNull();
    expect(toIso("not a date")).toBeNull();
  });

  it("writes the e-mail in French with the end date in Paris time, the price and the cancel link", () => {
    const mail = trialReminderEmail({ lang: "fr", name: "Alex", endsAt: "2026-10-27T09:00:00Z", manageUrl: "https://whop.com/manage/mem_1" });
    expect(mail.subject).toBe("Ton essai gratuit Hold se termine dans 2 jours");
    expect(mail.text).toContain("Bonjour Alex,");
    expect(mail.text).toContain("essai gratuit de 3 jours se termine le 27 octobre 2026 à 10:00 (heure de Paris)");
    expect(mail.text).toContain("39,00 €");
    expect(mail.text).toContain("https://whop.com/manage/mem_1");
    expect(mail.html).toContain('<a href="https://whop.com/manage/mem_1">');
  });

  it("writes it in English without a name too", () => {
    const mail = trialReminderEmail({ lang: "en", name: null, endsAt: "2026-10-27T09:00:00Z", manageUrl: "https://whop.com/manage/mem_1" });
    expect(mail.subject).toBe("Your Hold free trial ends in 2 days");
    expect(mail.text.startsWith("Hi,")).toBe(true);
    expect(mail.text).toContain("€39.00");
  });
});
