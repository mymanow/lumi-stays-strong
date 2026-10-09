import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useI18n } from "@/i18n";
import { flushPendingEvents } from "./events";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfilePatch = Database["public"]["Tables"]["profiles"]["Update"];

type Ctx = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  isAnonymous: boolean;
  premium: boolean;
  updateProfile: (p: ProfilePatch) => Promise<void>;
  reload: () => Promise<void>;
  error: string | null;
};
const AppCtx = createContext<Ctx | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { setLang } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [premium, setPremium] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (uid: string) => {
    let { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (!data) {
      const stored = localStorage.getItem("hold_lang") ?? "fr";
      const ins = await supabase.from("profiles").upsert({ id: uid, language: stored }).select("*").single();
      data = ins.data;
    }
    setProfile(data);
    if (data) localStorage.setItem("hold_reasons", JSON.stringify(data.reasons ?? []));
    void flushPendingEvents();
    if (data?.language === "fr" || data?.language === "en") setLang(data.language);
    const sub = await supabase.from("subscriptions").select("status").eq("user_id", uid).maybeSingle();
    setPremium(sub.data?.status === "active");
  }, [setLang]);

  useEffect(() => {
    let cancelled = false;
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setSession(s);
      if (s) void loadProfile(s.user.id);
    });
    (async () => {
      try {
        let { data } = await supabase.auth.getSession();
        if (!data.session) {
          const res = await supabase.auth.signInAnonymously();
          if (res.error) throw res.error;
          data = { session: res.data.session };
        }
        if (cancelled) return;
        setSession(data.session);
        if (data.session) await loadProfile(data.session.user.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "auth");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; listener.subscription.unsubscribe(); };
  }, [loadProfile]);

  const updateProfile = useCallback(async (patch: ProfilePatch) => {
    if (!session) return;
    setProfile((p) => (p ? { ...p, ...patch } as Profile : p));
    const { data } = await supabase.from("profiles").update(patch).eq("id", session.user.id).select("*").single();
    if (data) setProfile(data);
  }, [session]);

  const reload = useCallback(async () => { if (session) await loadProfile(session.user.id); }, [session, loadProfile]);

  return (
    <AppCtx.Provider value={{ ready, session, profile, isAnonymous: !!session?.user.is_anonymous, premium, updateProfile, reload, error }}>
      {children}
    </AppCtx.Provider>
  );
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}
