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
- profiles: id (uuid = auth.users.id), language, name, last_contact_at (timestamptz, derived from the Q2 range at its lowest bound), last_contact_range ('today'|'week'|'month'|'m1_3'|'m3_6'|'gt_6m'), situation_type ('breakup'|'pulling_away'|'going_back'|'mixed_signals'|'moved_on'|'asked_space'|'want_space'), last_contact_feelings (text[], Q3), current_feelings (text[], Q4), motivation ('win_back'|'reconcile'|'perspective'|'move_on'|'unsure'), no_contact_goal ('d7'|'d14'|'d30'|'d60'|'d90'|'d180'|'open'), no_contact_rules (text[], the user's own rules chosen in onboarding: no_texting, no_stalking, no_old_photos, no_meeting, no_reply_except, no_asking_friends, no_running_into), acquisition_source ('tiktok'|'google'|'word_of_mouth'|'quora'|'app_store'|'instagram_facebook'|'reddit'|'other'), gender ('woman'|'man'|'undisclosed'), age (int, check 18..100), coach_tone ('gentle'|'direct'), reasons (text[], up to 3), commitment_at (timestamptz), reminder_enabled (bool), reminder_time (time), onboarding_completed (bool), created_at. Legacy columns (relationship_duration, ended_by, first_breakup, dominant_emotion, triggers, difficulty_*, score_*) are no longer written.
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

## Companion features (beyond the basics)
- Mes rappels (/reminders): a red flags list (pin the important ones, shown first in SOS) and photos, voice notes (MediaRecorder) and videos. Stored ONLY in IndexedDB (src/lib/keepsakes.ts), 30 MB per file and 200 MB total; wiped on account deletion. Never uploaded, never sent to the coach.
- Parcours (/journey) and the daily task on Home: six phases by days without contact (0-3, 4-14, 15-30, 31-60, 61-90, 91+), hedged general landmarks with no invented statistics; one tip per day, checkable (localStorage).
- Progrès (History tab): current/best streak, attempts, past streaks chart, mood and urge lines (7/30/90 days, gaps stay empty), week-over-week comparison (a trend is only shown with 3+ check-ins in both weeks), most frequent triggers. Derived from existing checkins and contact_events.
- Reset and reflect: the relapse dialog has an optional note saved in contact_events.note; history shows it. Settings can correct the last-contact date.
- Coach tones: gentle, direct and frank ("Cash", blunt but never humiliating; drops to gentle if a crisis is detected).
- Daily reminder: a notification while the app is open (no push server yet, so it cannot wake a closed app); the copy says so.
- Migrations to run: 0004 (no_contact_rules) and 0005 (frank tone, contact_events.note).

## Calming motion
- Slow living background (two glows drifting over 70s, a few stars at night), a halo that breathes every 10s behind the counter, counter digits where only the seconds rise (minutes and hours fade).
- SOS: the overlay fades in, a ring follows the breath (4s in, 6s out), and the daylight layer fades in slowly when the reasons appear. No vibration.
- Milestones (1, 3, 7, 14, 30, 60, 90 days): one soft light and one warm line from Lumi, shown once per streak (src/lib/milestones.ts), never a modal. Past progress of a streak is recorded silently.
- Greeting scene right after the name (onboarding step 1, third screen): Lumi rises out of a dawn glow with a soft squash, rings spread from her feet, fireflies drift up, then "Enchantée, {name} !" and one line of promise appear in sequence. The name is saved when leaving the name screen.
- The commitment hold grows a warm light with the press; a saved check-in sends a small spark to Lumi.
- Everything is transform/opacity only and disabled by prefers-reduced-motion (the check-in then goes straight home).

## Onboarding (one question per screen, thin progress bar over 15 steps, Back button, answers saved as you go)
0. Welcome: logo, language selector (FR/EN) top right, large Lumi, headline "Tiens bon quand l'envie d'écrire revient.", sub "Voici Lumi, elle veille avec toi. Un compteur, un SOS, un coach. Privé, sans compte obligatoire.", primary "Commencer", link "J'ai déjà un compte", small disclaimer "Pas un avis médical. En danger, appelle le 3114." (crisis number localized by language/region).
1. Intro "Personnalisons ton parcours", then "Comment souhaite-tu qu'on t'appelles ?" (first name or nickname).
2. "Qu'est-ce qui t'amène aujourd'hui ?" single choice: rupture récente / j'ai l'impression que l'autre s'éloigne / je continue à revenir / signaux contradictoires / mon ex a tourné la page / on m'a demandé de l'espace / j'ai besoin d'espace pour prendre du recul.
3. "Quand as-tu parlé à ton ex, écrit ou regardé ses réseaux pour la dernière fois ?" single choice: aujourd'hui / dernière semaine / dernier mois / 1 à 3 mois / 3 à 6 mois / plus de 6 mois. The counter starts at the lowest bound of the range.
4. "Et comment tu t'es senti·e après ?" multi-select (7 choices; "Je n'ai pas encore repris contact" is exclusive).
5. "Comment vas-tu en ce moment, vraiment ?" multi-select (7 choices).
6. "Qu'attends-tu du no contact ?" single choice: récupérer mon ex / se réconcilier si c'est la bonne chose / prendre du recul / tourner la page et guérir / je ne sais pas encore. (The "récupérer mon ex" option only adapts the tone; the app never promises or encourages getting the ex back.)
7. "Comment as-tu connu {app} ?" sub "Choisis la plateforme où tu nous as trouvés." single choice: TikTok / Recherche Google / Bouche-à-oreille / Quora / App Store / Instagram / Facebook / Reddit / Autre. Saved to profiles.acquisition_source (owner-only, analytics only, never sent to the coach).
8. "Combien de temps veux-tu tenir sans contact ?" 7 / 14 / 30 / 60 / 90 / 180 jours / sans date de fin. Optional: shown as a 3-column grid of tiles (the "sans date de fin" tile spans the full width) with a text link "Je ferai ça plus tard" under the button that skips the question (no_contact_goal stays null).
9. "Tu es :" sub "Pour adapter notre communication." Une femme / Un homme / Je préfère ne pas dire.
10. (No age question: the age screen was removed.) The app stays for adults only; the terms and privacy policy say so, but the app no longer asks for or checks an age.
   After the gender (step 10), five information screens (not persisted; the fifth is the toolkit screen described below): (1) "{name}, beaucoup de craquages arrivent dans un moment de faiblesse" with Lumi under a rain cloud; (2) "Ce n'est pas toi, c'est ton cerveau" with five hedged cards ("peut…"); (3) "Pas une app de méditation. Pas un journal." comparison and a feature table limited to features Hold really has (8 rows: SOS, coach, breathing, triggers, reasons and red flags, journey, counter, progress; no "community" row since Hold has none); (4) "Ce n'est pas de la magie" with a sketch labelled as illustrative and the real O'Hara et al. (2020) citation with its caveats. No invented statistics, no competitor logos.
   Science screen chart ("Ce n'est pas de la magie"): animated conceptual sketch on the night scene — a glowing dot draws a grey "Contact maintenu" curve over months 0–3.5, then a second dot draws a faster-rising "Sans contact" curve. the hedged finding, caveat and DOI source stay below it. Static final state with prefers-reduced-motion.
   Toolkit screen (fifth information screen, after the science one): "Ta boîte à outils pour les mauvais moments" with a tilted three-column marquee of Hold's own illustrative mini screens (counter, SOS, coach, check-in, progress, red flags, journey, milestone, vault). Columns 1 and 3 scroll up, the middle one scrolls down, seamless loop, soft top/bottom fade; static under prefers-reduced-motion; decorative (aria-hidden) with an sr-only list of the features. No competitor images.
11. No-contact rules page "Fixe tes règles de non-contact" (multi-select, optional, "you can change these later"): no texting or calling, no social media stalking, no old photos or messages, no meeting in person, no replying unless it's about kids or work, no asking friends for updates, no "accidental" run-ins. Saved to profiles.no_contact_rules; they never reach the coach context.
12. Interstitial "Tu n'auras pas à le faire seul·e, {name}": full-screen dusk scene, one white sentence that fades in; moves on by itself after ~3.8s or on tap (a visible Continue button instead of the timer with prefers-reduced-motion). No header, nothing saved beyond the step.
13. Commitment page "Ton engagement.": show 3 short phrases adapted to the answers, then a large circular press-and-hold button with Lumi in the center. The user must press and HOLD for ~2.5 seconds: an SVG ring fills while held, releasing early resets it smoothly, completing makes Lumi light up fully, vibrates briefly if navigator.vibrate exists, saves commitment_at and moves on after a second. Support mouse, touch (no text selection / context menu on long press) and keyboard (hold Space or Enter), announce progress in an aria-live region. Adapted phrases: (a) from motivation: win_back "Je prends ce temps pour moi, sans pression."; reconcile "Je me donne le temps de choisir ce qui est juste, sans pression."; perspective "Je prends du recul pour y voir plus clair."; move_on "Je choisis de tourner la page."; unsure "Je me donne le temps d'y voir clair."; (b) always "Quand l'envie arrive, j'ouvre Lumi avant d'écrire."; (c) from situation_type: going_back "Chaque jour sans contact compte, même quand c'est dur."; moved_on "Son chemin n'est pas le mien : je m'occupe du mien."; default "Je suis capable de traverser ça." Use gender-neutral wording or the user's gender for grammatical agreement when relevant.
14. "Ton plan est prêt.": 4 short confirmation rows (counter started, SOS always at hand, one 30-second check-in a day, Lumi/coach when needed) and an optional daily reminder (default 21:30, one notification per day max, toggle).
15. Optional account: "Garde ta progression en sécurité." (see Auth) with "Plus tard, continuer sans compte".
After step 15, show the Whop paywall page /subscribe (closable, with "Plus tard"), then Home. Onboarding runs once (onboarding_completed).

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
