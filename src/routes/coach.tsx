import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/hold/AppShell";
import { Lumi } from "@/components/hold/Lumi";
import { SendIcon } from "@/components/hold/Icons";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { supabase } from "@/integrations/supabase/client";
import { detectCrisis, lumiStageForDays } from "@/lib/domain";
import { useCoachCredits } from "@/lib/credits";
import type { PlanKey } from "@/config/whop";

// Loaded only when "subscribe" is pressed.
const CheckoutSheet = lazy(() => import("@/components/hold/CheckoutSheet").then((m) => ({ default: m.CheckoutSheet })));

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
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<PlanKey>("quarterly");
  const { t, tl, lang } = useI18n();
  const { profile, premium, updateProfile } = useApp();
  const mode: Mode = Route.useSearch().mode ?? "urge";
  const qc = useQueryClient();
  const credits = useCoachCredits();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const tone = (["gentle", "direct", "frank"].includes(profile?.coach_tone ?? "") ? profile!.coach_tone : "gentle") as "gentle" | "direct" | "frank";
  const days = profile?.last_contact_at ? Math.floor((Date.now() - new Date(profile.last_contact_at).getTime()) / 86400000) : 0;

  // The server's answer (X-Credits) wins over the cached balance until the query is refreshed.
  const balance = left ?? credits.data?.balance ?? null;
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);

  const limitReached = balance === 0;

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
      const rem = res.headers.get("X-Credits");
      if (rem !== null && rem !== "") setLeft(Number(rem));
      if (res.headers.get("X-Crisis") === "1") setCrisis(true);
      if (res.status === 402) { setLeft(0); setMessages(messages); setInput(content); return; }
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
      void qc.invalidateQueries({ queryKey: ["credits"] });
    }
  };
  const name = profile?.name?.trim();
  const creditLabel = balance === null ? "…" : balance === 1 ? t("coach.credit") : t("coach.credits", { n: balance });

  return (
    <div className="mx-auto flex max-w-[720px] flex-col" style={{ minHeight: "calc(100dvh - 9rem)" }}>
      <header className="mb-3 flex items-center gap-3 border-b border-white/60 pb-4">
        <Lumi size={36} stage={lumiStageForDays(Math.max(days, Math.floor((profile?.best_streak_seconds ?? 0) / 86400)))} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[23px] leading-tight">{t("coach.title")}</h1>
          <p className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-white/60 px-2.5 py-0.5 text-xs font-semibold text-[#1d6b4f]">
            <span aria-hidden className="h-2 w-2 rounded-full bg-[#2fb37d]" />{t("coach.online")}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 text-sm font-bold text-[#2e3865]" title={t("coach.creditsHint")} aria-live="polite">
          <Zap aria-hidden className="h-4 w-4 text-[#e8a33a]" fill="#f4b94e" strokeWidth={1.5} />{creditLabel}
        </span>
      </header>

      <div role="radiogroup" aria-label={t("coach.tone")} className="mb-4 flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{t("coach.tone")}</span>
        <div className="glass inline-flex rounded-full p-1">
          {(["gentle", "direct", "frank"] as const).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={tone === k} onClick={() => updateProfile({ coach_tone: k })}
              className={`min-h-9 rounded-full px-3.5 ${tone === k ? "bg-white text-[#2e3865]" : "text-muted-foreground"}`}>{t(`coach.${k}`)}</button>
          ))}
        </div>
      </div>

      {crisis && (
        <div role="alert" className="mb-4 rounded-[24px] border border-white bg-white/60 p-4">
          <p>{t("crisis.notice")}</p>
          <Link to="/crisis" className="mt-2 inline-flex min-h-11 items-center font-bold text-foreground underline">{t("crisis.see")}</Link>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-4" aria-live="polite">
        <div className="flex max-w-[90%] gap-2 self-start">
          <span className="mt-1 shrink-0"><Lumi size={14} stage={3} breathe={false} label="" /></span>
          <p className="rounded-[22px] rounded-tl-md bg-white/70 px-4 py-3 leading-relaxed text-[#2e3865]">{name ? t("coach.hello", { name }) : t("coach.helloNoName")}</p>
        </div>
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
            <p>{premium && credits.data?.nextRefill
              ? t("coach.limitPremium", { date: credits.data.nextRefill.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long" }) })
              : t("coach.limit")}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link to="/sos" className="inline-flex min-h-11 items-center rounded-full border border-white/80 px-4">SOS</Link>
              {!premium && <button type="button" onClick={() => setCheckoutOpen(true)} className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 font-semibold text-primary-foreground">{t("coach.upgrade", { n: credits.data?.monthly ?? 300 })}</button>}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="sticky bottom-24 mt-4 md:bottom-4">
        {!limitReached && (
          <div className="-mx-5 mb-2 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
            {tl<string[]>("coach.suggestions").map((q) => (
              <button key={q} type="button" disabled={busy} onClick={() => void send(q)}
                className="glass min-h-10 shrink-0 rounded-full px-4 text-sm font-medium disabled:opacity-50">{q}</button>
            ))}
          </div>
        )}
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
      {checkoutOpen && <Suspense fallback={null}><CheckoutSheet open={checkoutOpen} onOpenChange={setCheckoutOpen} plan={checkoutPlan} onPlan={setCheckoutPlan} /></Suspense>}
    </div>
  );
}
