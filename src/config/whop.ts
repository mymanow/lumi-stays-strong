import type { Appearance } from "@whop/elements-react";

export type PlanKey = "quarterly" | "weekly";

/**
 * Whop variant IDs (prefixed `plan_`) of the "Plan No Contact" product (store nocontactai).
 * Not secret: read in the browser AND on the server, so the server only ever sells / unlocks these two variants.
 */
export const VARIANT_ID_3MOIS = (import.meta.env["VITE_WHOP_VARIANT_3MOIS"] as string | undefined) || "plan_3MOIS_A_REMPLACER";
export const VARIANT_ID_HEBDO = (import.meta.env["VITE_WHOP_VARIANT_HEBDO"] as string | undefined) || "plan_HEBDO_A_REMPLACER";

export const WHOP_PLANS: Record<PlanKey, string> = {
  quarterly: VARIANT_ID_3MOIS,
  weekly: VARIANT_ID_HEBDO,
};

/** Free trial set on the Whop pricing option (3 days on the quarterly plan, none on the weekly plan).
 *  Must match Whop: the paywall, the bell screen and the trial-end reminder all rely on it. */
export const TRIAL_DAYS: Record<PlanKey, number> = { quarterly: 3, weekly: 0 };

/** Reverse lookup used by the webhook: null for any variant that is not ours. */
export function planKeyForVariant(variantId: string | null | undefined): PlanKey | null {
  if (!variantId) return null;
  if (variantId === VARIANT_ID_3MOIS) return "quarterly";
  if (variantId === VARIANT_ID_HEBDO) return "weekly";
  return null;
}

/** Whop frames on the dusk checkout sheet: dark, gold accent (≈ #F4B94E). */
export const WHOP_APPEARANCE: Appearance = {
  theme: { appearance: "dark", accentColor: "amber", grayColor: "slate" },
};
