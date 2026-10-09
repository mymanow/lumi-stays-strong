import { createFileRoute } from "@tanstack/react-router";

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

const ACTIVATE = new Set(["payment.succeeded", "membership.went_valid", "membership.activated"]);
const DEACTIVATE = new Set(["membership.went_invalid", "membership.deactivated", "payment.failed"]);

type WhopEvent = { type?: string; action?: string; data?: Record<string, any> };

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

        const evt = JSON.parse(body) as WhopEvent;
        const type = evt.type ?? evt.action ?? "";
        const d: any = evt.data ?? {};
        const membership = d.membership ?? d;
        const metadata = d.metadata ?? membership.metadata ?? d.checkout_configuration?.metadata ?? {};
        const userId: string | undefined = metadata.supabase_user_id;
        if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) return new Response("ignored", { status: 200 });

        // payment.failed only deactivates when Whop reports no further retries.
        if (type === "payment.failed" && d.will_retry !== false && d.retries_exhausted !== true) return new Response("ok", { status: 200 });
        if (!ACTIVATE.has(type) && !DEACTIVATE.has(type)) return new Response("ignored", { status: 200 });

        const planId: string | undefined = d.plan?.id ?? d.plan_id ?? membership.plan?.id;
        const plan = planId && planId === (process.env["WHOP_PLAN_YEARLY"] ?? "plan_67890") ? "yearly" : "monthly";
        const periodEnd = membership.renewal_period_end ?? membership.expires_at ?? null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("subscriptions").upsert({
          user_id: userId,
          status: ACTIVATE.has(type) ? "active" : "inactive",
          plan,
          whop_membership_id: membership.id?.startsWith?.("mem_") ? membership.id : d.membership_id ?? null,
          whop_user_id: d.user?.id ?? d.user_id ?? null,
          current_period_end: typeof periodEnd === "number" ? new Date(periodEnd * 1000).toISOString() : periodEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        if (error) { console.error("whop webhook upsert", error); return new Response("db error", { status: 500 }); }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
