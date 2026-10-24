import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory subscriptions + profiles behind the service-role client.
const subs: Record<string, unknown>[] = [];
const updates: Record<string, unknown>[] = [];
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => table === "profiles"
      ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { name: "Alex", language: "fr" } }) }) }) }
      : {
        select: () => ({ eq: () => ({ is: () => ({ lte: () => ({ gt: async () => ({ data: subs, error: null }) }) }) }) }),
        update: (v: Record<string, unknown>) => ({ eq: (_c: string, uid: string) => ({ is: async () => { updates.push({ uid, ...v }); return { error: null }; } }) }),
      },
    auth: { admin: { getUserById: async () => ({ data: { user: { email: "fallback@example.com" } } }) } },
  },
}));

process.env["CRON_SECRET"] = "cron_test";
process.env["WHOP_API_KEY"] = "whop_test";
process.env["RESEND_API_KEY"] = "re_test";
process.env["RESEND_FROM"] = "Hold <bonjour@example.com>";

const { Route } = await import("@/routes/api/public/trial-reminders");
const handler = (Route.options as unknown as { server: { handlers: { POST: (a: { request: Request }) => Promise<Response> } } }).server.handlers.POST;
const call = (auth = "Bearer cron_test") => handler({ request: new Request("https://x/api/public/trial-reminders", { method: "POST", headers: { Authorization: auth } }) });

const inHours = (h: number) => new Date(Date.now() + h * 3600 * 1000).toISOString();
let whopStatus = "trialing";
let whopEmail: string | null = "alex@example.com";
const sentMails: Record<string, unknown>[] = [];

beforeEach(() => {
  subs.length = 0; updates.length = 0; sentMails.length = 0; whopStatus = "trialing"; whopEmail = "alex@example.com";
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url.startsWith("https://api.whop.com/")) return new Response(JSON.stringify({ status: whopStatus, manage_url: "https://whop.com/manage/mem_1", user: { email: whopEmail } }));
    sentMails.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ id: "email_1" }));
  }));
});

describe("trial reminders route", () => {
  it("refuses a call without the cron secret", async () => {
    expect((await call("Bearer wrong")).status).toBe(401);
  });

  it("e-mails a trial ending within 48 h, once, and marks it sent", async () => {
    subs.push({ user_id: "u1", whop_membership_id: "mem_1", whop_status: "trialing", trial_ends_at: inHours(47), trial_reminder_sent_at: null });
    const res = await call();
    expect(await res.json()).toEqual({ sent: 1, skipped: 0 });
    expect(sentMails[0]).toMatchObject({ to: ["alex@example.com"], subject: "Ton essai gratuit Hold se termine dans 2 jours" });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ uid: "u1" });
  });

  it("skips a trial that Whop says is no longer running", async () => {
    whopStatus = "canceled";
    subs.push({ user_id: "u1", whop_membership_id: "mem_1", whop_status: "trialing", trial_ends_at: inHours(40), trial_reminder_sent_at: null });
    expect(await (await call()).json()).toEqual({ sent: 0, skipped: 1 });
    expect(sentMails).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });

  it("falls back to the account e-mail when Whop does not share one", async () => {
    whopEmail = null;
    subs.push({ user_id: "u1", whop_membership_id: "mem_1", whop_status: "trialing", trial_ends_at: inHours(30), trial_reminder_sent_at: null });
    await call();
    expect(sentMails[0]).toMatchObject({ to: ["fallback@example.com"] });
  });
});
