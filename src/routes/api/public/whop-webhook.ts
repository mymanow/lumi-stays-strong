import { createFileRoute } from "@tanstack/react-router";
import { planKeyForVariant } from "@/config/whop";
import type { Database } from "@/integrations/supabase/types";

// The external database includes the Whop columns from hold_supabase_migration.sql.
// Keep this contract local: the generated integration types must not be edited.
type WhopSubscriptionSnapshot = {
  status: string;
  whop_membership_id: string | null;
  whop_synced_at: string | null;
};
type WhopSubscriptionInsert = Database["public"]["Tables"]["subscriptions"]["Insert"] & {
  whop_status: string | null;
  cancel_at_period_end: boolean;
  whop_synced_at: string;
};

// Standard Webhooks verification: HMAC-SHA256 over `${id}.${timestamp}.${body}` keyed with the literal secret bytes.
async function verify(secret: string, id: string, ts: string, body: string, sigHeader: string) {
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(ts)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
  let bin = ""; for (const b of mac) bin += String.fromCharCode(b);
  const expected = btoa(bin);
  return sigHeader.split(" ").some((part) => {
    const [, sig] = part.split(",");
    if (!sig || sig.length !== expected.length) return false;
    let diff = 0; for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}

// Whop API v1 membership events. "Created / paid" arrives as membership.activated, "canceled / expired" as
// membership.deactivated; membership.updated repeats both and covers renewals. The payload is always the full
// membership, so its `status` is the source of truth whatever the event name.
const MEMBERSHIP_EVENTS = new Set(["membership.activated", "membership.deactivated", "membership.updated", "membership.cancel_at_period_end_changed"]);
// `canceling` = cancellation scheduled at period end, `past_due` = Whop's retry grace period: access is kept.
const ACCESS_STATUSES = new Set(["active", "trialing", "past_due", "canceling", "completed"]);

type WhopMembership = {
  id?: string;
  status?: string;
  plan_id?: string;
  user_id?: string | null;
  metadata?: Record<string, unknown> | null;
  current_period_end?: string | null;
  expires_at?: string | null;
  cancel_at_period_end?: boolean;
  updated_at?: string;
};
type WhopEvent = { id?: string; type?: string; data?: WhopMembership };

const ok = (msg = "ok") => new Response(msg, { status: 200 });

export const Route = createFileRoute("/api/public/whop-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["WHOP_WEBHOOK_SECRET"];
        if (!secret) return new Response("not configured", { status: 500 });
        const body = await request.text();
        const id = request.headers.get("webhook-id") ?? "";
        const ts = request.headers.get("webhook-timestamp") ?? "";
        const sig = request.headers.get("webhook-signature") ?? "";
        if (!id || !ts || !sig || !(await verify(secret, id, ts, body, sig))) return new Response("invalid signature", { status: 401 });

        let evt: WhopEvent;
        try { evt = JSON.parse(body) as WhopEvent; } catch { return new Response("bad json", { status: 400 }); }
        const type = evt.type ?? "";
        const m = evt.data ?? {};
        if (!MEMBERSHIP_EVENTS.has(type)) return ok("ignored");

        // Only our two variants unlock Hold: the Whop store may sell other products.
        const plan = planKeyForVariant(m.plan_id);
        if (!plan) return ok("ignored: other variant");

        const userId = m.metadata?.["supabase_user_id"];
        if (typeof userId !== "string" || !/^[0-9a-f-]{36}$/i.test(userId)) {
          console.warn("whop webhook: membership without supabase_user_id", m.id, type);
          return ok("ignored: no user");
        }

        const isActive = m.status ? ACCESS_STATUSES.has(m.status) : type === "membership.activated";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Retries and replays can arrive out of order: never let an older snapshot overwrite a newer one,
        // and never let an old membership ending switch off a newer one (re-subscription after a cancel).
        const { data: current } = await supabaseAdmin.from("subscriptions")
          .select("status, whop_membership_id, whop_synced_at").eq("user_id", userId).maybeSingle()
          .overrideTypes<WhopSubscriptionSnapshot | null, { merge: false }>();
        if (current) {
          const sameMembership = current.whop_membership_id === m.id;
          if (sameMembership && current.whop_synced_at && m.updated_at && new Date(m.updated_at) <= new Date(current.whop_synced_at)) return ok("stale");
          if (!sameMembership && !isActive && current.status === "active") return ok("ignored: older membership");
        }

        const subscription: WhopSubscriptionInsert = {
          user_id: userId,
          status: isActive ? "active" : "inactive",
          plan,
          whop_status: m.status ?? null,
          whop_membership_id: m.id ?? null,
          whop_user_id: m.user_id ?? null,
          current_period_end: m.current_period_end ?? m.expires_at ?? null,
          cancel_at_period_end: m.cancel_at_period_end ?? false,
          whop_synced_at: m.updated_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabaseAdmin.from("subscriptions")
          .upsert<Database["public"]["Tables"]["subscriptions"]["Insert"]>(subscription, { onConflict: "user_id" });
        if (error) { console.error("whop webhook upsert", error); return new Response("db error", { status: 500 }); }
        return ok();
      },
    },
  },
});
