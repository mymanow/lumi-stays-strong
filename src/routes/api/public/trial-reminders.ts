import { createFileRoute } from "@tanstack/react-router";
import { MANAGE_SUBSCRIPTION_URL } from "@/config/app";
import { TRIAL_REMINDER_LEAD_MS, trialReminderDue, trialReminderEmail, type TrialRow } from "@/lib/trial-reminder";

// Called every hour by Supabase pg_cron (see hold_supabase_migration.sql, 0010_trial_reminder) with
// `Authorization: Bearer <CRON_SECRET>`. Sends the "your trial ends in 2 days" e-mail promised on the bell screen,
// once per subscription, as soon as 48 hours or less are left in the trial.
//
// The e-mail address comes from Whop (the checkout collects it; Hold sessions are often anonymous), with the
// Supabase account e-mail as a fallback. It is never stored. Whop is also asked whether the trial is still running,
// so a membership cancelled or already converted is never reminded.

type Row = TrialRow & { user_id: string; whop_membership_id: string | null };
type WhopMembership = { status?: string; manage_url?: string | null; user?: { email?: string | null } | null };

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function sameSecret(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/trial-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        const whopKey = process.env["WHOP_API_KEY"];
        const resendKey = process.env["RESEND_API_KEY"];
        const from = process.env["RESEND_FROM"];
        if (!secret || !whopKey || !resendKey || !from) return json(500, { error: "not_configured" });
        const auth = request.headers.get("authorization") ?? "";
        if (!sameSecret(auth, `Bearer ${secret}`)) return json(401, { error: "unauthorized" });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date();
        // The external database has these columns (hold_supabase_migration.sql); generated types are not edited.
        const db = supabaseAdmin as unknown as {
          from: (t: string) => {
            select: (c: string) => { eq: (c: string, v: string) => { is: (c: string, v: null) => { lte: (c: string, v: string) => { gt: (c: string, v: string) => Promise<{ data: Row[] | null; error: unknown }> } } } };
            update: (v: Record<string, unknown>) => { eq: (c: string, v: string) => { is: (c: string, v: null) => Promise<{ error: unknown }> } };
          };
        };
        const { data, error } = await db.from("subscriptions")
          .select("user_id, whop_membership_id, whop_status, trial_ends_at, trial_reminder_sent_at")
          .eq("whop_status", "trialing").is("trial_reminder_sent_at", null)
          .lte("trial_ends_at", new Date(now.getTime() + TRIAL_REMINDER_LEAD_MS).toISOString())
          .gt("trial_ends_at", now.toISOString());
        if (error) { console.error("trial reminders select", error); return json(500, { error: "db_error" }); }

        let sent = 0, skipped = 0;
        for (const row of (data ?? []).filter((r) => trialReminderDue(r, now))) {
          if (!row.whop_membership_id) { skipped++; continue; }
          const res = await fetch(`https://api.whop.com/api/v1/memberships/${encodeURIComponent(row.whop_membership_id)}`, { headers: { Authorization: `Bearer ${whopKey}` } });
          if (!res.ok) { console.error("trial reminders whop", res.status, row.whop_membership_id); skipped++; continue; }
          const m = (await res.json()) as WhopMembership;
          if (m.status !== "trialing") { skipped++; continue; } // cancelled or converted since: nothing to remind

          let email = m.user?.email ?? null;
          if (!email) {
            const { data: u } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
            email = u?.user?.email ?? null;
          }
          if (!email) { console.warn("trial reminders: no e-mail for", row.whop_membership_id); skipped++; continue; }

          const { data: profile } = await supabaseAdmin.from("profiles").select("name, language").eq("id", row.user_id).maybeSingle();
          const mail = trialReminderEmail({
            lang: profile?.language ?? "fr", name: profile?.name ?? null,
            endsAt: row.trial_ends_at!, manageUrl: m.manage_url || MANAGE_SUBSCRIPTION_URL,
          });
          const out = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json", "Idempotency-Key": `trial-reminder-${row.whop_membership_id}` },
            body: JSON.stringify({ from, to: [email], subject: mail.subject, text: mail.text, html: mail.html }),
          });
          if (!out.ok) { console.error("trial reminders resend", out.status, await out.text().catch(() => "")); skipped++; continue; }

          // Mark it only once sent; the IS NULL guard keeps two overlapping runs from both counting it.
          await db.from("subscriptions").update({ trial_reminder_sent_at: new Date().toISOString() }).eq("user_id", row.user_id).is("trial_reminder_sent_at", null);
          sent++;
        }
        return json(200, { sent, skipped });
      },
    },
  },
});
