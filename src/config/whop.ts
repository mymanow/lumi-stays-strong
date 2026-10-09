export type PlanKey = "monthly" | "yearly";

export const WHOP_PLANS: Record<PlanKey, string> = {
  monthly: (import.meta.env["VITE_WHOP_PLAN_MONTHLY"] as string | undefined) || "plan_12345",
  yearly: (import.meta.env["VITE_WHOP_PLAN_YEARLY"] as string | undefined) || "plan_67890",
};

export const WHOP_ACCENT = "#E8A55B";
