export const APP_NAME = "Hold";
export const COMPANION_NAME = "Lumi";
export const FREE_COACH_MESSAGES_PER_DAY = 3;
export const PREMIUM_COACH_DAILY_CAP = 200;
export const MILESTONE_DAYS = [1, 3, 7, 14, 30, 60, 90] as const;
export const MANAGE_SUBSCRIPTION_URL = "https://whop.com/@me/settings/memberships/";

/** TEST ONLY: shows a "simulate payment" button on the plan pitch page to preview the post-payment screens without paying.
 *  It never writes a subscription. Set to false before launch. */
export const SIMULATE_PAYMENT = true;

/** Shows the "Ton rétablissement commence maintenant" plan pitch (onboarding step 19) before the paywall result.
 *  false: the reminder screens lead straight to the paywall result (step 20). */
export const SHOW_PLAN_PITCH = false;

/** Shows the "Personnalisons ton parcours" intro (onboarding step 1, before the name question).
 *  false: the welcome screen leads straight to the name question. */
export const SHOW_ONBOARDING_INTRO = false;

/** The app is shown in French only for now: English stays in src/i18n/en.ts but is never selected.
 *  true brings back the FR/EN switch (welcome, sign-in, settings) and the saved language. */
export const SHOW_LANGUAGE_SWITCH = false;

/** Shows "Tu n'es pas seul·e dans ça" (onboarding step 16) after the paywall intro.
 *  false: the paywall intro leads straight to the trial reminder (step 17). */
export const SHOW_COMPANION_SHOWCASE = false;
