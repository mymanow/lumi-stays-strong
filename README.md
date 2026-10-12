# Hold On

Build a responsive web app (works great on phones, tablets and desktop; mobile-first) called "Hold" (working name, keep it in one config constant APP_NAME) with a companion character called "Lumi" (constant COMPANION_NAME). It is a no-contact breakup recovery companion. Stack: React + TypeScript + Tailwind + shadcn/ui, Supabase (auth, Postgres, Edge Functions), Whop for payments. Default UI language: French, with English as a second language (i18n with a language switcher; ALL UI strings, option labels and Lumi phrases live in translation files, provide FR and EN).

## Product goal
Help a user keep no contact with an ex. The core moment is the urge to write to the ex: the SOS flow must be reachable in one tap from every main screen.

## Design system ("crépuscule": periwinkle gradients, calm, premium)
- Colors as tokens (src/styles.css). Three scene tones swapped via CSS variables with `<Stage tone="light|dusk|night">`: light gradient (#C6D0F6 → #BCB2F0) with navy text #2E3865; dusk (#5450AA → #4560AE) and night (#2F3873 → #4B4A9E) with white text. Glass cards (translucent white + blur), primary accent amber #F4B94E (pill CTAs, navy text inside for WCAG AA), soft reset #F2998D (non-punitive), subtle grain overlay.
- Fonts: DM Serif Display (headings, counter, big numbers) and Figtree (body, UI), loaded from Google Fonts with fallbacks.
- Large tap targets (min 44px), generous spacing, rounded corners (20-28px, pill buttons), no clutter, no gamified guilt, no dark patterns, no emoji in the UI (use inline SVG icons).
- Respect prefers-reduced-motion and keep contrast accessible (WCAG AA). Real buttons, labels and aria attributes everywhere.

## Responsive layout
- Phones (<768px): single column, bottom tab bar (Accueil, Historique, Coach, Réglages), SOS button always visible on Home.
- Tablet/desktop (≥768px): onboarding and flows in a centered column (max-width ~480px) on the calm background; the main app uses a left sidebar (same 4 destinations + a prominent SOS button) and a content area; Home becomes two columns (counter + SOS on the left; check-in card, milestones and Lumi on the right); Coach chat max-width ~720px.
- The SOS flow opens as a full-screen takeover on all sizes, with a large centered column.
- Installable (web manifest). The SOS flow must work offline (cache its assets with a service worker if feasible).

## Auth (Supabase)
- Anonymous sign-in on first launch, so the user starts with NO signup form.
- The optional account step (end of onboarding, and in Settings "Sauvegarder mon compte") links an email via magic link; show Apple and Google buttons only if those providers are configured.
- Row Level Security on every table: a user can only read/write their own rows (user_id = auth.uid()).
- "J'ai déjà un compte" on the welcome screen opens sign-in (magic link) for returning users.

## Database (tables, RLS, migrations)
- profiles: id (uuid = auth.users.id), language, last_contact_at (timestamptz), triggers (text[]: evening, social_media, loneliness, alcohol, argument, anniversary, other), relationship_duration ('lt_6m'|'6_12m'|'1_3y'|'gt_3y'), ended_by ('me'|'them'|'mutual'), first_breakup (bool), situation_type ('infidelity_healing'|'one_sided_love'|'toxic'|'blocked_ghosted'|'divorce_long_term'|'breakup'|'situationship_ended'|'mutual_breakup'|'ex_moved_on'|'first_love'|'on_off'|'long_relationship_ended'), motivation ('take_back_control'|'win_back'|'move_on'|'unsure'), dominant_emotion ('calm'|'disgust'|'joy'|'anger'|'fear'|'sadness'), gender ('woman'|'man'|'undisclosed'), age (int, check 18..100), coach_tone ('gentle'|'direct'), reasons (text[], up to 3), commitment_at (timestamptz), reminder_enabled (bool), reminder_time (time), onboarding_completed (bool), created_at.
- contact_events: id, user_id, type ('relapse'|'resistance'), occurred_at, trigger (text, nullable), mood (int 1-5, nullable), previous_streak_seconds (bigint, only for relapse), created_at.
- checkins: id, user_id, date (unique per user per day), mood (1-5), urge (1-5), triggers (text[]), note (text, max 500), created_at.
- subscriptions: user_id, status ('active'|'inactive'), plan ('monthly'|'yearly'), whop_membership_id, whop_user_id, current_period_end (nullable), updated_at. Writable ONLY by the service role (Whop webhook), readable by the owner.
- ai_usage: user_id, day (date), count (int). Writable only by the Edge Function.
- IMPORTANT: unsent messages (the "vault") are NEVER sent to Supabase. Store them only in the browser (IndexedDB), on this device.
- Save onboarding answers progressively (after each step) so a refresh resumes where the user left off.

## Lumi, the companion
- A friendly blob character, drawn in SVG as a reusable <Lumi size stage emotion interactive /> component: periwinkle gradient body, white outline, 5 expressions (neutral, happy, support, proud, tired), a 3s levitation, squash & stretch on tap / expression change (400ms), and stars + halo that only increase with the 4 stages. All motion is disabled with prefers-reduced-motion.
- Stage depends on days without contact: day 1 (small spark), day 7 (stronger), day 30 (lights up around), day 90 (shines fully). It only grows brighter over time.
- Rules: Lumi NEVER punishes. After a relapse she does not go out and never looks sad: she stays, and the copy says "On repart ensemble." She never tells the user to contact the ex, and her messages bring the user back to the SOS flow, their own reasons and their real friends or family; she accompanies, she does not replace people.
- Where she appears: welcome screen (large), Home (small, with one short line like "Ce soir, je reste avec toi." chosen from a local list by time of day), SOS breathing (Lumi expands for 4s and shrinks for 6s to guide breathing), commitment screen, coach header (the coach speaks AS Lumi), and a /lumi page in Settings showing the 4 stages and the rule "Si tu craques, Lumi ne t'en veut pas. On repart ensemble."
- Short phrases are fixed local text (no AI call).

## Onboarding (one question per screen, thin progress bar over 13 steps, Back button, answers saved as you go)
0. Welcome: logo, language selector (FR/EN) top right, large Lumi, headline "Tiens bon quand l'envie d'écrire revient.", sub "Voici Lumi, elle veille avec toi. Un compteur, un SOS, un coach. Privé, sans compte obligatoire.", primary "Commencer", link "J'ai déjà un compte", small disclaimer "Pas un avis médical. En danger, appelle le 3114." (crisis number localized by language/region).
1. "Quand as-tu parlé à ton ex pour la dernière fois ?" date + time (default: now), plus multi-select "Qu'est-ce qui te donne le plus envie d'écrire ?": Le soir, Les réseaux, La solitude, L'alcool, Une dispute, Un anniversaire, Autre.
2. "Combien de temps étiez-vous ensemble ?" single choice: 0 à 6 mois / 6 à 12 mois / 1 à 3 ans / Plus de 3 ans.
3. "Qui a mis fin à la relation ?" Moi / Lui / Elle / Décision mutuelle.
4. "Est-ce votre première rupture ?" Oui, c'est notre première rupture / Non, nous nous sommes déjà séparés.
5. "Quel type de situation ?" scrollable single-choice list: Guérir d'une infidélité; Amour à sens unique; Relation toxique; Bloqué·e / ghosté·e; Divorce / longue durée; Rupture; Situationship terminée; Rupture mutuelle; Mon ex est passé à autre chose; Premier amour / première rupture; On / off; Longue relation terminée.
6. "Pourquoi as-tu décidé de commencer le no contact ?" sub "Pour t'envoyer des rappels qui te motivent." Reprendre le contrôle de ma vie / Essayer de récupérer mon ex / Tourner la page / Je ne sais pas encore. (Keep the "récupérer mon ex" option: it only adapts the tone; the app never promises or encourages getting the ex back.)
7. "Quelle émotion dominante revient le plus souvent ?" Calme / Dégoût / Joie / Colère / Peur / Tristesse. If a very low mood is expressed anywhere later, surface the crisis resources.
8. "Tu es :" sub "Pour adapter notre communication." Une femme / Un homme / Je préfère ne pas dire.
9. "Quel âge as-tu ?" sub "De 18 à 100 ans." Scroll-wheel style picker from 18 to 100. The app is for adults only (state it in the terms).
10. "Pourquoi tu fais ça ?" three personal reasons (short text inputs, the first one required).
11. Commitment page "Ton engagement.": show 3 short phrases adapted to the answers, then a large circular press-and-hold button with Lumi in the center. The user must press and HOLD for ~2.5 seconds: an SVG ring fills while held, releasing early resets it smoothly, completing makes Lumi light up fully, vibrates briefly if navigator.vibrate exists, saves commitment_at and moves on after a second. Support mouse, touch (no text selection / context menu on long press) and keyboard (hold Space or Enter), announce progress in an aria-live region. Adapted phrases: (a) from motivation: take_back_control "Je choisis de reprendre le contrôle de ma vie."; move_on "Je choisis de tourner la page."; win_back "Je prends ce temps pour moi, sans pression."; unsure "Je me donne le temps d'y voir clair."; (b) always "Quand l'envie arrive, j'ouvre Lumi avant d'écrire."; (c) from situation_type: toxic "Je mérite une relation qui me fait du bien."; one_sided_love "Mon amour pour moi compte aussi."; default "Je suis capable de traverser ça." Use gender-neutral wording or the user's gender for grammatical agreement when relevant.
12. "Ton plan est prêt.": 4 short confirmation rows (counter started, SOS always at hand, one 30-second check-in a day, Lumi/coach when needed) and an optional daily reminder (default 21:30, one notification per day max, toggle).
13. Optional account: "Garde ta progression en sécurité." (see Auth) with "Plus tard, continuer sans compte".
After step 13, show the Whop paywall page /subscribe (closable, with "Plus tard"), then Home. Onboarding runs once (onboarding_completed).

## Main screens
1. Home: big live counter (days, hours, minutes, seconds) since last_contact_at inside a ring with the current Lumi stage nearby, best streak, milestone dots at 1, 3, 7, 14, 30, 60, 90 days, a "Check-in du jour" card, a prominent "J'ai envie de lui écrire" SOS button always visible, and a secondary "J'ai craqué" link (confirmation dialog with a kind message, inserts a relapse event with previous_streak_seconds, resets last_contact_at, keeps history and best streak, optionally asks the trigger).
2. SOS flow (works offline, no AI): step 1 guided breathing 60s led by Lumi (can be skipped); step 2 show the user's reasons large and a Lumi line, plus "Écris-lui ici, sans l'envoyer" saved locally only; choices "Je garde" (local vault), "Je supprime", "Je parle au coach"; final "Résistance gagnée" screen and a resistance event. A "Besoin d'aide urgente ? Appelle le 3114" link is visible throughout (localized).
3. Check-in (once a day, editable the same day): mood 1-5, urge 1-5, triggers multi-select, optional note (max 500 chars).
4. History: tabs Check-ins, Events (relapses and resistances, counts), Vault (local unsent messages, delete).
5. Coach (AI, speaks as Lumi): header with Lumi avatar and the remaining free messages, a "Ton : doux / direct" toggle (initialized from onboarding), 3 entry modes ("J'ai envie d'écrire", "Je viens de rechuter", "Je vais mal"), chat UI with streaming. Free plan: 3 user messages per day; premium unlimited (with a high server cap). Conversation lives only in client state.
6. Crisis resources screen (from SOS, coach, Settings): France 3114; US 988; UK/Ireland Samaritans 116 123; link to findahelpline.com for other countries; tappable tel: links.
7. Settings: language, reminder, "Sauvegarder mon compte", Lumi page, delete all my data and account (confirmation), privacy policy, terms, crisis resources, subscription status with "Gérer mon abonnement" linking to https://whop.com/@me/settings/memberships/.

## Payments (Whop.com), paywall on /subscribe (do NOT use Stripe)
- Install `@whop/checkout` (React component `WhopCheckoutEmbed`, import from "@whop/checkout/react") and `@whop/sdk` in Edge Functions. If an import fails, check docs.whop.com ("Embed checkout", "Accept payments") and adapt.
- /subscribe: clean calm layout matching the design system. Title "Un coach quand l'envie est trop forte.", 3 benefit rows (messages illimités avec le coach, ton doux ou direct, il connaît tes raisons et ton avancée), a reminder "Reste gratuit : compteur, SOS, journal, historique et 3 messages de coach par jour", monthly/yearly toggle with clear prices, the embedded Whop checkout below, a visible close button and "Plus tard". Pass theme "system" and themeOptions.accentColor = #E8A55B so it blends in. No countdowns, no guilt copy.
- Plan IDs in src/config/whop.ts with placeholders: monthly "plan_12345", yearly "plan_67890" (override via VITE_WHOP_PLAN_MONTHLY / VITE_WHOP_PLAN_YEARLY).
- `<WhopCheckoutEmbed planId sessionId returnUrl={origin + "/subscribe/success"} prefill={{ email }} />` with a skeleton while loading and a friendly error state plus "Réessayer" (expected while placeholder IDs are used).
- If the user is still anonymous, first ask them to link an email (keeps premium across devices) and prefill it.
- Edge Function `create-whop-checkout`: authenticated; creates a checkout configuration server-side for the chosen plan with metadata { supabase_user_id }, returns the session id. Whop API key in Supabase secrets only.
- Edge Function `whop-webhook`: public, verifies Whop's signature; on `payment.succeeded` and `membership.went_valid` upsert subscriptions as 'active' using metadata.supabase_user_id; on the membership-ended event (check the exact name in Whop's docs, e.g. membership.went_invalid) and `payment.failed` after retries set 'inactive'. Service role, idempotent.
- /subscribe/success: poll the subscriptions row for a few seconds, then thank the user and link back to the coach.
- Premium = active subscription row, re-checked server-side by the coach function. NEVER block the user's own data (counter, check-ins, history, vault, SOS, crisis resources); only the unlimited coach is premium.

## Coach Edge Function (Supabase)
- Called with the user's JWT; never call the AI provider from the browser; provider key in Supabase secrets.
- Verify user, enforce the daily quota (ai_usage + subscriptions), cap response length (~300 tokens) and send only the last ~10 messages.
- Context sent to the model: mode, coach_tone, reasons, motivation, situation_type, gender (wording only), days since last contact, last relapse date. Nothing else (no age, no vault content).
- System prompt: speak as Lumi in first person, warm, short, practical, in the user's language; no diagnosis or therapy claims; never suggest contacting the ex or help write messages to the ex; never promise getting the ex back; encourage breathing, delay, reaching out to a trusted person; if the user expresses suicidal thoughts, self-harm or severe distress, respond with care and surface the crisis resources immediately. Add keyword-based crisis detection on client and server.

## Notifications
- Optional daily reminder (max one per day, user-chosen time), neutral wording. Web push only if feasible; otherwise disable the toggle with "bientôt disponible".

## Legal and safety
- Privacy policy and terms (editable placeholders): adults only (18+), not a medical or therapeutic service, no promise of getting an ex back, what is sent to the AI (list above), unsent messages never leave the device, Whop named as payment processor.

## Out of scope for this version
Native widgets, social media blocking, pattern analytics, community, extra exercises, Face ID, Apple Watch.

## Acceptance criteria
- A new user finishes the 13 onboarding steps with no signup; a refresh resumes at the same step.
- The commitment button needs a sustained press, resets on early release and works with mouse, touch and keyboard.
- The SOS flow completes in under 90 seconds, works offline, and logs a resistance.
- The counter reflects last_contact_at after refresh; a relapse resets it but keeps history and best streak; Lumi never dims or looks sad after a relapse.
- Layout adapts: bottom tabs on phones, sidebar and two-column Home on desktop, no horizontal scrolling at any width.
- RLS prevents cross-user access; unsent messages are never written to Supabase.
- /subscribe renders the Whop embed (or the friendly error state with placeholder IDs) styled like the app; a successful payment activates the subscription via the webhook and unlocks the unlimited coach.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://lumi-stays-strong.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b9c32f53-20c3-4b97-b7f4-8083de0a2f72).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
