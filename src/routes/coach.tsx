import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/hold/AppShell";
import { Lumi } from "@/components/hold/Lumi";
import { SendIcon } from "@/components/hold/Icons";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { supabase } from "@/integrations/supabase/client";
import { detectCrisis, lumiStageForDays } from "@/lib/domain";
import { FREE_COACH_MESSAGES_PER_DAY } from "@/config/app";

const search = z.object({ mode: z.enum(["urge", "relapse", "bad"]).optional() });

export const Route = createFileRoute("/coach")({
  validateSearch: search,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Coach — Hold" },
      { name: "description", content: "Parle à Lumi quand l'envie d'écrire est trop forte." },
      { property: "og:title", content: "Coach — Hold" },
      { property: "og:description", content: "Parle à Lumi quand l'envie d'écrire est trop forte." },
    ],
  }),
  component: () => <AppShell><Coach /></AppShell>,
});

type Msg = { role: "user" | "assistant"; content: string };
type Mode = "urge" | "relapse" | "bad";

function Coach() {
  const { t, lang } = useI18n();
  const { profile, premium, updateProfile, session } = useApp();
  const initial = Route.useSearch().mode;
  const [mode, setMode] = useState<Mode>(initial ?? "urge");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const tone = (profile?.coach_tone ?? "gentle") as "gentle" | "direct";
  const days = profile?.last_contact_at ? Math.floor((Date.now() - new Date(profile.last_contact_at).getTime()) / 86400000) : 0;

  useEffect(() => {
    if (!session) return;
    const day = new Date().toISOString().slice(0, 10);
    supabase.from("ai_usage").select("count").eq("day", day).maybeSingle().then(({ data }) => setRemaining(Math.max(0, FREE_COACH_MESSAGES_PER_DAY - (data?.count ?? 0))));
  }, [session]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);

  const limitReached = !premium && remaining === 0;

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy || limitReached) return;
    if (detectCrisis(content)) setCrisis(true);
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput(""); setBusy(true); setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` },
        body: JSON.stringify({ messages: next.slice(-10), mode, tone, lang }),
      });
      const rem = res.headers.get("X-Remaining");
      if (rem !== null) setRemaining(Number(rem));
      if (res.headers.get("X-Crisis") === "1") setCrisis(true);
      if (res.status === 429) { setRemaining(0); setMessages(next); return; }
      if (!res.ok || !res.body) throw new Error("coach");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: acc }]);
      }
      if (!acc) throw new Error("empty");
    } catch {
      setError(t("coach.error"));
      setMessages(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-[720px] flex-col" style={{ minHeight: "calc(100dvh - 9rem)" }}>
      <header className="mb-4 flex flex-wrap items-center gap-3 border-b border-white/60 pb-4">
        <Lumi size={36} stage={lumiStageForDays(Math.max(days, Math.floor((profile?.best_streak_seconds ?? 0) / 86400)))} />
        <div className="flex-1">
          <h1 className="text-3xl">{t("coach.title")}</h1>
          <p className="text-sm text-muted-foreground">{premium ? t("coach.unlimited") : t("coach.remaining", { n: remaining ?? FREE_COACH_MESSAGES_PER_DAY })}</p>
        </div>
        <div role="radiogroup" aria-label={t("coach.tone")} className="glass inline-flex rounded-full p-1">
          {(["gentle", "direct"] as const).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={tone === k} onClick={() => updateProfile({ coach_tone: k })}
              className={`min-h-9 rounded-full px-4 text-sm ${tone === k ? "bg-white text-[#2e3865]" : "text-muted-foreground"}`}>{t(`coach.${k}`)}</button>
          ))}
        </div>
      </header>

      <div role="radiogroup" aria-label="Mode" className="mb-4 flex flex-wrap gap-2">
        {(["urge", "relapse", "bad"] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
            className={`min-h-11 rounded-full border px-4 text-sm ${mode === m ? "border-white bg-white text-[#2e3865]" : "border-white/70"}`}>{t(`coach.modes.${m}`)}</button>
        ))}
      </div>

      {crisis && (
        <div role="alert" className="mb-4 rounded-[24px] border border-white bg-white/60 p-4">
          <p>{t("crisis.notice")}</p>
          <Link to="/crisis" className="mt-2 inline-flex min-h-11 items-center font-bold text-foreground underline">{t("crisis.see")}</Link>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-4" aria-live="polite">
        {messages.length === 0 && <p className="font-display text-xl text-foreground/90">{t("coach.intro")}</p>}
        {messages.map((m, i) => m.role === "user" ? (
          <div key={i} className="max-w-[85%] self-end whitespace-pre-wrap break-words rounded-[24px] rounded-br-md bg-primary px-4 py-3 text-primary-foreground">{m.content}</div>
        ) : (
          <div key={i} className="flex max-w-[90%] gap-2 self-start">
            <span className="mt-1 shrink-0"><Lumi size={14} stage={3} breathe={false} label="" /></span>
            <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content || <span className="text-muted-foreground">…</span>}</p>
          </div>
        ))}
        {error && <p role="alert" className="font-semibold text-foreground">{error}</p>}
        {limitReached && (
          <div className="glass rounded-[24px] p-4">
            <p>{t("coach.limit")}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link to="/sos" className="inline-flex min-h-11 items-center rounded-full border border-white/80 px-4">SOS</Link>
              <Link to="/subscribe" className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 font-semibold text-primary-foreground">{t("coach.upgrade")}</Link>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="sticky bottom-20 mt-4 md:bottom-4">
        <div className="flex items-end gap-2 glass rounded-[24px] p-2">
          <label htmlFor="coach-input" className="sr-only">{t("coach.placeholder")}</label>
          <textarea id="coach-input" rows={1} value={input} disabled={limitReached} onChange={(e) => setInput(e.target.value)} placeholder={t("coach.placeholder")}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-base outline-none placeholder:text-muted-foreground/70" />
          <button type="submit" aria-label={t("coach.send")} disabled={busy || !input.trim() || limitReached}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"><SendIcon /></button>
        </div>
        <p className="mt-1 text-center text-xs text-muted-foreground">{t("coach.privacy")}</p>
      </form>
    </div>
  );
}
