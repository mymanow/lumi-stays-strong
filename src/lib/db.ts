import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/*
 * Local typed contract for the columns and tables added by hold_supabase_migration.sql (0012_post_login_pages)
 * that the generated integration types do not know yet. The generated file must not be edited: this type extends it.
 */
type Pub = Database["public"];
type T = Pub["Tables"];

type CheckinErp = { emotions: string[]; relational: string[]; physical: string[]; day_outcome: DayOutcome | null };
export type DayOutcome = "stayed" | "resisted" | "broke";
/** Mood and urge are no longer asked (0013_checkin_sheet): nullable. */
type CheckinScores = { mood: number | null; urge: number | null };
type ProfileExtra = { timezone: string | null };

export type CoachCreditsRow = { user_id: string; balance: number; welcome_granted_at: string | null; premium_refill_at: string | null; updated_at: string };
export type CoachCreditRuleRow = { key: "welcome" | "premium_monthly"; amount: number; description: string; updated_at: string };
export type CoachCreditLedgerRow = { id: number; user_id: string; delta: number; reason: "welcome" | "premium_refill" | "message" | "refund" | "purchase" | "admin"; balance_after: number; created_at: string };

type ReadOnly<R> = { Row: R; Insert: Partial<R>; Update: Partial<R>; Relationships: [] };

export type HoldDatabase = Omit<Database, "public"> & {
  public: Omit<Pub, "Tables" | "Functions"> & {
    Tables: Omit<T, "checkins" | "profiles"> & {
      checkins: {
        Row: Omit<T["checkins"]["Row"], "mood" | "urge"> & CheckinScores & CheckinErp;
        Insert: Omit<T["checkins"]["Insert"], "mood" | "urge"> & Partial<CheckinScores> & Partial<CheckinErp>;
        Update: Omit<T["checkins"]["Update"], "mood" | "urge"> & Partial<CheckinScores> & Partial<CheckinErp>;
        Relationships: T["checkins"]["Relationships"];
      };
      profiles: {
        Row: T["profiles"]["Row"] & ProfileExtra;
        Insert: T["profiles"]["Insert"] & Partial<ProfileExtra>;
        Update: T["profiles"]["Update"] & Partial<ProfileExtra>;
        Relationships: T["profiles"]["Relationships"];
      };
      coach_credits: ReadOnly<CoachCreditsRow>;
      coach_credit_rules: ReadOnly<CoachCreditRuleRow>;
      coach_credit_ledger: ReadOnly<CoachCreditLedgerRow>;
    };
    Functions: Pub["Functions"] & {
      coach_credits_sync: { Args: { _user: string }; Returns: number };
      coach_credit_spend: { Args: { _user: string }; Returns: number };
      coach_credit_refund: { Args: { _user: string }; Returns: number };
    };
  };
};

/** The browser client, typed with the columns and tables above. Same instance as `supabase`. */
export const db = supabase as unknown as SupabaseClient<HoldDatabase>;
