import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { VARIANT_ID_3MOIS, VARIANT_ID_HEBDO } from "@/config/whop";

// In-memory stand-in for the service-role client: one subscriptions row per user.
const rows = new Map<string, Record<string, unknown>>();
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: (_c: string, uid: string) => ({ maybeSingle: () => ({ overrideTypes: async () => ({ data: rows.get(uid) ?? null }) }) }) }),
      upsert: async (row: Record<string, unknown>) => { rows.set(row["user_id"] as string, { ...rows.get(row["user_id"] as string), ...row }); return { error: null }; },
    }),
  },
}));

const SECRET = "ws_test_secret";
const USER = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
process.env["WHOP_WEBHOOK_SECRET"] = SECRET;

const { Route } = await import("@/routes/api/public/whop-webhook");
const handler = (Route.options as unknown as { server: { handlers: { POST: (a: { request: Request }) => Promise<Response> } } }).server.handlers.POST;

let n = 0;
function send(type: string, data: Record<string, unknown>, secret = SECRET) {
  const body = JSON.stringify({ id: `evt_${++n}`, type, api_version: "v1", data });
  const id = `msg_${n}`, ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", secret).update(`${id}.${ts}.${body}`).digest("base64");
  return handler({ request: new Request("https://x/api/public/whop-webhook", { method: "POST", body, headers: { "webhook-id": id, "webhook-timestamp": ts, "webhook-signature": `v1,${sig}` } }) });
}
const membership = (over: Record<string, unknown> = {}) => ({
  id: "mem_1", status: "active", plan_id: VARIANT_ID_3MOIS, user_id: "user_1", metadata: { supabase_user_id: USER },
  current_period_end: "2027-01-19T00:00:00Z", cancel_at_period_end: false, updated_at: "2026-10-21T10:00:00Z", ...over,
});

describe("whop webhook", () => {
  beforeEach(() => rows.clear());

  it("rejects a bad signature", async () => {
    expect((await send("membership.activated", membership(), "ws_wrong")).status).toBe(401);
    expect(rows.size).toBe(0);
  });

  it("membership.activated turns premium on with the quarterly plan", async () => {
    expect((await send("membership.activated", membership())).status).toBe(200);
    expect(rows.get(USER)).toMatchObject({ status: "active", plan: "quarterly", whop_membership_id: "mem_1", current_period_end: "2027-01-19T00:00:00Z" });
  });

  it("weekly variant maps to weekly", async () => {
    await send("membership.activated", membership({ plan_id: VARIANT_ID_HEBDO }));
    expect(rows.get(USER)?.["plan"]).toBe("weekly");
  });

  it("scheduled cancel keeps access, deactivation removes it", async () => {
    await send("membership.activated", membership());
    await send("membership.cancel_at_period_end_changed", membership({ status: "canceling", cancel_at_period_end: true, updated_at: "2026-10-22T10:00:00Z" }));
    expect(rows.get(USER)).toMatchObject({ status: "active", cancel_at_period_end: true });
    await send("membership.deactivated", membership({ status: "canceled", updated_at: "2027-01-19T00:00:01Z" }));
    expect(rows.get(USER)?.["status"]).toBe("inactive");
  });

  it("ignores an older snapshot delivered late", async () => {
    await send("membership.deactivated", membership({ status: "expired", updated_at: "2026-11-01T00:00:00Z" }));
    await send("membership.updated", membership({ status: "active", updated_at: "2026-10-21T10:00:00Z" }));
    expect(rows.get(USER)?.["status"]).toBe("inactive");
  });

  it("an old membership ending does not switch off a newer one", async () => {
    await send("membership.activated", membership({ id: "mem_new" }));
    await send("membership.deactivated", membership({ id: "mem_old", status: "expired" }));
    expect(rows.get(USER)).toMatchObject({ status: "active", whop_membership_id: "mem_new" });
  });

  it("a trialing membership stores the trial end from renewal_period_end (ISO or Unix seconds)", async () => {
    await send("membership.activated", membership({ status: "trialing", current_period_end: undefined, renewal_period_end: "2026-10-27T10:00:00Z" }));
    expect(rows.get(USER)).toMatchObject({ status: "active", whop_status: "trialing", trial_ends_at: "2026-10-27T10:00:00.000Z", current_period_end: "2026-10-27T10:00:00.000Z" });
    rows.clear();
    await send("membership.activated", membership({ status: "trialing", renewal_period_end: 1793095200 }));
    expect(rows.get(USER)?.["trial_ends_at"]).toBe(new Date(1793095200 * 1000).toISOString());
  });

  it("the trial end and reminder bookkeeping survive the conversion to a paid membership", async () => {
    await send("membership.activated", membership({ status: "trialing", renewal_period_end: "2026-10-27T10:00:00Z" }));
    rows.set(USER, { ...rows.get(USER), trial_reminder_sent_at: "2026-10-25T10:07:00Z" });
    await send("membership.updated", membership({ status: "active", renewal_period_end: "2027-01-27T10:00:00Z", updated_at: "2026-10-27T10:00:05Z" }));
    expect(rows.get(USER)).toMatchObject({ whop_status: "active", trial_ends_at: "2026-10-27T10:00:00.000Z", trial_reminder_sent_at: "2026-10-25T10:07:00Z", current_period_end: "2027-01-27T10:00:00.000Z" });
  });

  it("ignores other products of the store and memberships without a Hold user", async () => {
    await send("membership.activated", membership({ plan_id: "plan_someOtherProduct" }));
    await send("membership.activated", membership({ metadata: {} }));
    await send("payment.succeeded", { id: "pay_1" });
    expect(rows.size).toBe(0);
  });
});
