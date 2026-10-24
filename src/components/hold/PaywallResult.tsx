import { useEffect, useState } from "react";
import { BellRing, Check, ChevronDown, Crown, Heart, Lock, MessageCircle, PenLine, Star, Zap } from "lucide-react";
import { useI18n } from "@/i18n";
import { Lumi } from "./Lumi";
import { Celebration } from "./Celebration";
import { PrimaryButton } from "./Common";
import { BackIcon } from "./Icons";
import { RATING } from "@/config/reviews";
import { SIMULATE_PAYMENT } from "@/config/app";
import { TRIAL_DAYS, type PlanKey } from "@/config/whop";
import { TRIAL_REMINDER_LEAD_MS } from "@/lib/trial-reminder";

export const TARGET_DAYS = 90;
const CHIP_ICONS = [MessageCircle, Zap, Heart, PenLine];
const LOADING_MS = 2600;
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Today + 90 days, as a readable date in the app language. */
export function targetDate(lang: string, now = new Date()) {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", { dateStyle: "long" }).format(new Date(now.getTime() + TARGET_DAYS * 86400000));
}

/** "[word]" in a translated title is highlighted, "\n" breaks the line. */
function Highlight({ text }: { text: string }) {
  return <>{text.split("\n").map((line, l) => (
    <span key={l} className="block">{line.split(/(\[[^\]]+\])/).map((p, i) => p.startsWith("[") ? <span key={i} className="text-[#D4CBFF]">{p.slice(1, -1)}</span> : <span key={i}>{p}</span>)}</span>
  ))}</>;
}

/**
 * What happens next with the selected plan. With a free trial: access today, the reminder e-mail (sent when
 * 48 h are left, see /api/public/trial-reminders) and the day billing starts. Without one: no trial is promised.
 */
function Journey({ plan }: { plan: PlanKey }) {
  const { t } = useI18n();
  const trial = TRIAL_DAYS[plan];
  const reminderDay = Math.max(0, trial - Math.round(TRIAL_REMINDER_LEAD_MS / 86400000));
  const steps = trial > 0
    ? [
      { Icon: Check, title: t("paywall.journeyToday.title"), sub: t("paywall.journeyToday.sub") },
      { Icon: BellRing, title: t("paywall.journeyReminder.title", { n: reminderDay }), sub: t("paywall.journeyReminder.sub") },
      { Icon: Crown, title: t("paywall.journeyBilling.title", { n: trial }), sub: t("paywall.journeyBilling.sub") },
    ]
    : [
      { Icon: Check, title: t("paywall.journeyToday.title"), sub: t("paywall.journeyToday.sub") },
      { Icon: Crown, title: t("paywall.journeyNoCommit.title"), sub: t("paywall.journeyNoCommit.sub") },
    ];
  return (
    <section className="fade-up mt-7 text-left" style={{ "--d": "360ms" } as React.CSSProperties} aria-labelledby="paywall-journey">
      <div className="flex justify-center">
        <span className="rounded-full border-2 border-white/70 bg-white/10 px-5 py-1.5 text-[17px] font-semibold tracking-wide shadow-[0_0_24px_-6px_rgba(212,203,255,0.7)]">{t("paywall.proPill")}</span>
      </div>
      <h2 id="paywall-journey" className="font-display mt-6 text-[32px] leading-[1.1]"><Highlight text={t("paywall.journeyTitle")} /></h2>
      <p className="mt-3 text-[15px] leading-snug opacity-70">{t("paywall.journeySub")}</p>
      <ol className="mt-6 flex flex-col">
        {steps.map(({ Icon, title, sub }, i) => (
          <li key={title} className="relative flex gap-4 pb-6 last:pb-0">
            {i < steps.length - 1 && <span aria-hidden className={`absolute left-[19px] top-10 h-[calc(100%-26px)] w-1 rounded-full ${i === 0 ? "bg-[#2B2A6B]/70" : "bg-gradient-to-b from-white/35 to-white/10"}`} />}
            <span aria-hidden className={`relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${i === steps.length - 1 ? "bg-white text-[#2B2A6B]" : "bg-[#D9CEFF] text-[#3B3F9E]"}`}><Icon size={19} /></span>
            <span>
              <span className="block text-[17px] font-semibold leading-snug">{title}</span>
              <span className="block text-[15px] leading-snug opacity-60">{sub}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
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
  const trial = TRIAL_DAYS[plan]; // the trial note and button only promise a free trial on a plan that has one
  const toggleMore = () => { if (more && plan === "weekly") onPlan("quarterly"); setMore((m) => !m); }; // never leave a hidden plan selected
  const card = (k: PlanKey) => {
    const on = plan === k;
    return (
      <button key={k} type="button" role="radio" aria-checked={on} onClick={() => onPlan(k)}
        className={`relative flex w-full items-center justify-between gap-3 rounded-[24px] px-5 py-4 text-left transition-colors ${on ? "bg-white text-[#2e3865] shadow-[0_14px_34px_-14px_rgba(0,0,0,0.5)]" : "bg-white/12 text-white ring-1 ring-white/30"}`}>
        {k === "quarterly" && <span className="absolute -top-3 left-4 rounded-full bg-[#7EE3D9] px-3 py-0.5 text-xs font-bold text-[#1f3a4a]">{t("paywall.best")}</span>}
        <span>
          <span className="font-display block text-xl">{t(`paywall.${k}.name`)}</span>
          {TRIAL_DAYS[k] > 0 && <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${on ? "bg-[#E9E6FF] text-[#4B3FA8]" : "bg-white/20 text-white"}`}>{t("paywall.trialBadge", { days: TRIAL_DAYS[k] })}</span>}
          <span className={`block text-sm ${on ? "text-[#5b6390]" : "opacity-80"}`}>{t(`paywall.${k}.billed`, { days: TRIAL_DAYS[k] })}</span>
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

      <Journey plan={plan} />

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
        {trial > 0 && <p className="mb-2 flex items-center justify-center gap-1.5 text-sm font-semibold"><Check size={16} className="text-[#7EE39A]" strokeWidth={3} aria-hidden />{t("paywall.trialNote")}</p>}
        <PrimaryButton onClick={onStart}>{trial > 0 ? t("paywall.ctaTrial", { days: trial }) : t("paywall.cta")}</PrimaryButton>
        <button type="button" onClick={onSkip} className="mt-1 min-h-10 w-full text-sm text-white/85 underline-offset-4 hover:underline">{t("paywall.skip")}</button>
        {SIMULATE_PAYMENT && <button type="button" onClick={onSimulate} className="mt-1 min-h-10 w-full text-sm text-white/70 underline-offset-4 hover:underline">{t("pitch.simulate")}</button>}
      </div>
    </div>
  );
}
