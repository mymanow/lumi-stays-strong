import { useEffect, useState } from "react";
import { ChevronDown, Heart, Lock, MessageCircle, PenLine, Star, Zap } from "lucide-react";
import { useI18n } from "@/i18n";
import { Lumi } from "./Lumi";
import { Celebration } from "./Celebration";
import { PrimaryButton } from "./Common";
import { BackIcon } from "./Icons";
import { RATING } from "@/config/reviews";
import { SIMULATE_PAYMENT } from "@/config/app";
import type { PlanKey } from "@/config/whop";

export const TARGET_DAYS = 90;
const CHIP_ICONS = [MessageCircle, Zap, Heart, PenLine];
const LOADING_MS = 2600;
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Today + 90 days, as a readable date in the app language. */
export function targetDate(lang: string, now = new Date()) {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", { dateStyle: "long" }).format(new Date(now.getTime() + TARGET_DAYS * 86400000));
}

/**
 * Post-quiz result + price grid: a 2-3 s "calculating your calendar" animation, then the plan-ready header with the
 * dynamic target date (today + 90 days), reassurance (slogan, feature chips, stars only with a real rating) and the
 * two plans. The CTA goes to the checkout of the selected plan.
 */
export function PaywallResult({ plan, onPlan, onStart, onSimulate, onSkip, onBack, celebrate = false, onCelebrated }: { plan: PlanKey; onPlan: (p: PlanKey) => void; onStart: () => void; onSimulate: () => void; onSkip: () => void; onBack: () => void; celebrate?: boolean; onCelebrated?: (() => void) | undefined }) {
  const { t, tl, lang } = useI18n();
  const [loaded, setLoaded] = useState(() => reduced());
  const [more, setMore] = useState(false); // the weekly plan stays hidden until "show more plans"
  useEffect(() => {
    if (loaded) return;
    const id = window.setTimeout(() => setLoaded(true), LOADING_MS);
    return () => window.clearTimeout(id);
  }, [loaded]);

  if (!loaded) {
    return (
      <div role="status" className="flex min-h-[70svh] flex-1 flex-col items-center justify-center text-center text-white">
        <div className="paywall-calc"><Lumi size={96} stage={2} emotion="neutral" label="" /></div>
        <p className="font-display mt-8 max-w-[300px] text-2xl leading-snug">{t("paywall.loading")}</p>
        <span aria-hidden className="mt-6 flex gap-2">{[0, 1, 2].map((i) => <span key={i} className="paywall-dot h-2.5 w-2.5 rounded-full bg-white" style={{ animationDelay: `${i * 0.2}s` }} />)}</span>
      </div>
    );
  }

  const chips = tl<string[]>("paywall.chips");
  const toggleMore = () => { if (more && plan === "weekly") onPlan("quarterly"); setMore((m) => !m); }; // never leave a hidden plan selected
  const card = (k: PlanKey) => {
    const on = plan === k;
    return (
      <button key={k} type="button" role="radio" aria-checked={on} onClick={() => onPlan(k)}
        className={`relative flex w-full items-center justify-between gap-3 rounded-[24px] px-5 py-4 text-left transition-colors ${on ? "bg-white text-[#2e3865] shadow-[0_14px_34px_-14px_rgba(0,0,0,0.5)]" : "bg-white/12 text-white ring-1 ring-white/30"}`}>
        {k === "quarterly" && <span className="absolute -top-3 left-4 rounded-full bg-[#7EE3D9] px-3 py-0.5 text-xs font-bold text-[#1f3a4a]">{t("paywall.best")}</span>}
        <span>
          <span className="font-display block text-xl">{t(`paywall.${k}.name`)}</span>
          <span className={`block text-sm ${on ? "text-[#5b6390]" : "opacity-80"}`}>{t(`paywall.${k}.billed`)}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="font-display block text-[26px] leading-none">{t(`paywall.${k}.price`)}</span>
          <span className={`block text-sm ${on ? "text-[#5b6390]" : "opacity-80"}`}>{t("paywall.perWeek")}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-1 flex-col text-center text-white">
      <div className="fade-up relative flex justify-center">
        <button type="button" onClick={onBack} aria-label={t("common.back")} className="glass absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full text-foreground"><BackIcon /></button>
        {celebrate && <Celebration onDone={onCelebrated} rise={0.3} fall={2.4} />}
        <div className={celebrate ? "ready-hop" : ""}><Lumi size={52} stage={2} emotion="happy" label="" /></div>
      </div>
      <h1 id="q20p" className="fade-up font-display mt-2 text-[28px] leading-tight" style={{ "--d": "80ms" } as React.CSSProperties}>{t("paywall.title")}</h1>
      <p className="fade-up mx-auto mt-2 max-w-[340px] text-[15px] leading-snug opacity-85" style={{ "--d": "160ms" } as React.CSSProperties}>{t("paywall.sub")}</p>
      <div className="fade-up mt-3 flex justify-center" style={{ "--d": "240ms" } as React.CSSProperties}>
        <span className={`rounded-full border-2 border-white/60 bg-white/15 px-7 py-2.5 text-xl font-semibold ${celebrate ? "date-shine" : ""}`} data-testid="target-date">{targetDate(lang)}</span>
      </div>

      <div className="fade-up mt-4" style={{ "--d": "320ms" } as React.CSSProperties}>
        <p className="font-display text-[18px] leading-snug">{t("paywall.slogan")}</p>
        <p className="mt-1 text-sm tracking-wide opacity-80">{t("paywall.words")}</p>
        {RATING && (
          <p className="mt-3 flex items-center justify-center gap-2 text-sm" aria-label={`${RATING.value} / 5`}>
            <span className="flex gap-0.5 text-[#f4b94e]">{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={16} fill="currentColor" strokeWidth={0} aria-hidden />)}</span>
            {RATING.value} · {RATING.people}
          </p>
        )}
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {chips.map((c, i) => {
            const Icon = CHIP_ICONS[i] ?? Lock;
            return <li key={c} className="glass flex items-center justify-center gap-1.5 rounded-2xl px-2.5 py-2 text-[13px] font-medium leading-tight"><Icon size={14} className="shrink-0" aria-hidden />{c}</li>;
          })}
        </ul>
      </div>

      <div className="fade-up mt-5 pt-3" role="radiogroup" aria-label={t("paywall.plans")} style={{ "--d": "400ms" } as React.CSSProperties}>
        {card("quarterly")}
        <div className="grid transition-[grid-template-rows] duration-500 ease-out" style={{ gridTemplateRows: more ? "1fr" : "0fr" }} aria-hidden={!more} inert={!more}>
          <div className="overflow-hidden">
            <div className={`pt-3.5 transition-[transform,opacity] duration-500 ease-out ${more ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}`}>{card("weekly")}</div>
          </div>
        </div>
      </div>
      <button type="button" onClick={toggleMore} aria-expanded={more} className="mx-auto mt-2 flex min-h-10 items-center gap-1.5 text-[15px]">
        {t(more ? "pitch.hide" : "pitch.more")}
        <ChevronDown size={16} aria-hidden className={`transition-transform duration-300 ${more ? "rotate-180" : ""}`} />
      </button>

      <div className="fade-up sticky bottom-0 mt-4 pb-1 pt-2" style={{ "--d": "480ms" } as React.CSSProperties}>
        <PrimaryButton onClick={onStart}>{t("paywall.cta")}</PrimaryButton>
        <button type="button" onClick={onSkip} className="mt-1 min-h-10 w-full text-sm text-white/85 underline-offset-4 hover:underline">{t("paywall.skip")}</button>
        {SIMULATE_PAYMENT && <button type="button" onClick={onSimulate} className="mt-1 min-h-10 w-full text-sm text-white/70 underline-offset-4 hover:underline">{t("pitch.simulate")}</button>}
      </div>
    </div>
  );
}
