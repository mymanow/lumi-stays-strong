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
- Coach AI runs in the /api/coach server route (bearer-verified, quota via ai_usage + subscriptions) — never call AI from the browser.
- Whop: checkout config created in a server function; subscriptions written only by /api/public/whop-webhook with service role.
- Onboarding has six breakup questions (situation, last contact range, feelings after, current feelings, hope, goal) saved to owner-only profile columns after each step (see supabase/migrations). Only motivation and situation type reach the coach context; feelings never do.

- There is no score or difficulty profile: the indicative score was removed. Do not reintroduce a numeric score without a product decision.
- Last contact is asked as a range; last_contact_at is set to the lowest bound of that range so the counter never overstates progress.
- SOS derives localized reasons from optional own reasons and motivation/situation through a shared helper; own reason editing is shared with Settings to enforce one limit.
