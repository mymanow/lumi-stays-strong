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
- The onboarding hardship answer is kept locally under a profile-scoped key; this presentation-only question does not alter the server profile or coach context.
