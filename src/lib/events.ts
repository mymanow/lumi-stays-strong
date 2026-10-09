import { supabase } from "@/integrations/supabase/client";

type PendingEvent = { type: "resistance" | "relapse"; occurred_at: string; trigger?: string | null; previous_streak_seconds?: number | null };
const KEY = "hold_pending_events";

function readPending(): PendingEvent[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

/** Inserts an event; queues it locally when offline and flushes later. */
export async function logEvent(e: PendingEvent) {
  const { data } = await supabase.auth.getSession();
  if (data.session && navigator.onLine) {
    const { error } = await supabase.from("contact_events").insert({ ...e, user_id: data.session.user.id });
    if (!error) return;
  }
  localStorage.setItem(KEY, JSON.stringify([...readPending(), e]));
}

export async function flushPendingEvents() {
  const pending = readPending();
  if (!pending.length || !navigator.onLine) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  const { error } = await supabase.from("contact_events").insert(pending.map((p) => ({ ...p, user_id: data.session!.user.id })));
  if (!error) localStorage.removeItem(KEY);
}
