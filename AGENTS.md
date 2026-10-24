<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Hold architecture
- All UI strings live in src/i18n/{fr,en}.ts; components read them via useI18n() — keeps FR/EN in sync.
- Unsent "vault" messages are stored only in IndexedDB (src/lib/vault.ts) — they must never reach the server.
- Red flags and the photos/voice notes/videos of "Mes rappels" live only in IndexedDB (src/lib/keepsakes.ts), like the vault: never upload them, never send them to the coach.
- Coach AI runs in the /api/coach server route (bearer-verified, quota via ai_usage + subscriptions) — never call AI from the browser.
- Whop: checkout config created in a server function (client sends a plan key, never a variant ID) and rendered with @whop/elements-react inside CheckoutSheet; subscriptions written only by /api/public/whop-webhook (membership.* events, our two variants only) with service role. is_premium is a generated column from status. SQL changes go in hold_supabase_migration.sql.
- Whop webhook uses a local typed contract for external database columns absent from generated integration types; preserve the existing SQL contract without editing generated files or changing the database.
- Onboarding has six breakup questions (situation, last contact range, feelings after, current feelings, hope, goal) saved to owner-only profile columns after each step (see drizzle/migrations/0003_onboarding_v2_answers.sql). Only motivation and situation type reach the coach context; feelings never do.
- After the hope question, onboarding asks "How did you learn about {app}?" (8 options) saved to the owner-only `profiles.acquisition_source` column (drizzle/migrations/0006_acquisition_source.sql). It is for acquisition analytics only and never reaches the coach.

- Onboarding social proof (src/config/reviews.ts): only real reviews with consent and a real rating; never invent reviews, names, ratings or user counts. While there are none, labelled "Exemple" placeholders are shown (SHOW_PLACEHOLDERS); set it to false before launch to skip the screen.
- There is no score or difficulty profile: the indicative score was removed. Do not reintroduce a numeric score without a product decision.
- Last contact is asked as a range; last_contact_at is set to the lowest bound of that range so the counter never overstates progress.
- SOS derives localized reasons from optional own reasons and motivation/situation through a shared helper; own reason editing is shared with Settings to enforce one limit.
- Free trial: TRIAL_DAYS (src/config/whop.ts) must match the Whop pricing options (3 days on quarterly, none on weekly); the paywall only promises a trial on a plan that has one. The webhook stores `subscriptions.trial_ends_at` while the membership is `trialing`; /api/public/trial-reminders (hourly pg_cron, Bearer CRON_SECRET) e-mails the "trial ends in 2 days" reminder via Resend once, after re-checking with Whop that the trial is still running. E-mail addresses are fetched at send time (Whop, then Supabase auth), never stored.
