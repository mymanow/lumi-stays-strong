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
