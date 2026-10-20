export type PlanKey = "quarterly" | "weekly";

export const WHOP_PLANS: Record<PlanKey, string> = {
  quarterly: (import.meta.env["VITE_WHOP_PLAN_QUARTERLY"] as string | undefined) || "plan_12345",
  weekly: (import.meta.env["VITE_WHOP_PLAN_WEEKLY"] as string | undefined) || "plan_67890",
};

export const WHOP_ACCENT = "#F4B94E";
