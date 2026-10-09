import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  .inputValidator((d) => z.object({ planId: z.string().min(3).max(64), returnUrl: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["WHOP_API_KEY"];
    if (!apiKey) return { sessionId: null as string | null, error: "not_configured" };
    const res = await fetch("https://api.whop.com/api/v1/checkout_configurations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: data.planId, metadata: { supabase_user_id: context.userId }, redirect_url: data.returnUrl }),
    });
    if (!res.ok) {
      console.error("whop checkout", res.status, await res.text().catch(() => ""));
      return { sessionId: null as string | null, error: "whop_error" };
    }
    const body = (await res.json()) as { id?: string };
    return { sessionId: body.id ?? null, error: body.id ? null : "whop_error" };
  });
