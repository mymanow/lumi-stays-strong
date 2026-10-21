import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { WHOP_PLANS } from "@/config/whop";

/** Deletes all of the caller's rows, then the auth user itself. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("checkins").delete().eq("user_id", userId);
    await supabase.from("contact_events").delete().eq("user_id", userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ai_usage").delete().eq("user_id", userId);
    await supabaseAdmin.from("subscriptions").delete().eq("user_id", userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return { ok: true };
  });

/** Creates a Whop checkout configuration for the chosen plan, tagged with the caller's id. */
export const createWhopCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ plan: z.enum(["quarterly", "weekly"]), returnUrl: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["WHOP_API_KEY"];
    if (!apiKey) return { sessionId: null as string | null, error: "not_configured" };
    const res = await fetch("https://api.whop.com/api/v1/checkout_configurations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      // The client only sends the plan key; the variant is resolved here so no other product of the store can be sold.
      // Whop copies `metadata` onto the membership: that is how the webhook finds the user (anonymous sessions included).
      body: JSON.stringify({ plan_id: WHOP_PLANS[data.plan], metadata: { supabase_user_id: context.userId, plan: data.plan }, redirect_url: data.returnUrl }),
    });
    if (!res.ok) {
      console.error("whop checkout", res.status, await res.text().catch(() => ""));
      return { sessionId: null as string | null, error: "whop_error" };
    }
    const body = (await res.json()) as { id?: string };
    return { sessionId: body.id ?? null, error: body.id ? null : "whop_error" };
  });
