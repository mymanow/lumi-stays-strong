import { useQuery } from "@tanstack/react-query";
import { db } from "./db";
import { useApp } from "@/lib/app-state";

export const CREDIT_REFILL_DAYS = 30;
const DAY = 86_400_000;

export type CreditState = {
  balance: number;
  /** When the next subscriber refill can happen (null for free accounts or before the first one). */
  nextRefill: Date | null;
  welcome: number;
  monthly: number;
};

/**
 * What the coach page shows, mirroring coach_credits_sync (SQL): before the first message the balance is the welcome
 * gift; a subscriber whose refill is due sees the monthly amount, which the server applies on the next message.
 * The server stays the only one that changes the balance.
 */
export function creditState(row: { balance: number; premium_refill_at: string | null } | null, rules: { key: string; amount: number }[], premium: boolean, now = Date.now()): CreditState {
  const welcome = rules.find((r) => r.key === "welcome")?.amount ?? 0;
  const monthly = rules.find((r) => r.key === "premium_monthly")?.amount ?? 0;
  const base = row ? row.balance : welcome;
  const refillAt = row?.premium_refill_at ? new Date(row.premium_refill_at).getTime() : null;
  const due = premium && (refillAt === null || refillAt <= now - CREDIT_REFILL_DAYS * DAY);
  return {
    balance: due ? Math.max(base, monthly) : base,
    nextRefill: premium && refillAt !== null && !due ? new Date(refillAt + CREDIT_REFILL_DAYS * DAY) : null,
    welcome,
    monthly,
  };
}

export function useCoachCredits() {
  const { session, premium } = useApp();
  return useQuery({
    queryKey: ["credits", session?.user.id, premium],
    enabled: !!session,
    queryFn: async () => {
      const [{ data: row }, { data: rules }] = await Promise.all([
        db.from("coach_credits").select("balance, premium_refill_at").maybeSingle(),
        db.from("coach_credit_rules").select("key, amount"),
      ]);
      return creditState(row ?? null, rules ?? [], premium);
    },
  });
}
