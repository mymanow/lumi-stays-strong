import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { useApp, type ProfilePatch } from "@/lib/app-state";
import { Lumi } from "@/components/hold/Lumi";
import { ChoiceList, FullLoader, LangSwitch, PrimaryButton, Stage, useCrisisLine } from "@/components/hold/Common";
import { BackIcon } from "@/components/hold/Icons";
import { Greeting } from "@/components/hold/Greeting";
import { InfoBody, INFO_KINDS, INFO_TONE } from "@/components/hold/OnboardingInfo";
import { AloneScreen } from "@/components/hold/AloneScreen";
import { ReviewsScreen, reviewsAvailable } from "@/components/hold/ReviewsScreen";
import { PlanReady } from "@/components/hold/PlanReady";
import { CompanionShowcase } from "@/components/hold/CompanionShowcase";
import { SHOW_ONBOARDING_INTRO, SHOW_PLAN_PITCH, SIMULATE_PAYMENT } from "@/config/app";
import { PaywallResult } from "@/components/hold/PaywallResult";
import { PlanPitch } from "@/components/hold/PlanPitch";
import type { PlanKey } from "@/config/whop";
import { NotifyPermission } from "@/components/hold/NotifyPermission";
import { notifyScreenApplicable } from "@/lib/notify";
import { ReminderIntro } from "@/components/hold/ReminderIntro";
import { PhoneShowcase } from "@/components/hold/PhoneShowcase";
import { PlanBuilding } from "@/components/hold/PlanBuilding";
import { APP_NAME } from "@/config/app";
import { CONTACT_RANGE_DAYS, DEFAULT_REMINDER_TIME, MOTIVATIONS, SITUATIONS, type ContactRange } from "@/lib/domain";

// Loaded only when the checkout button is pressed (keeps the payment code out of the onboarding bundle).
const CheckoutSheet = lazy(() => import("@/components/hold/CheckoutSheet").then((m) => ({ default: m.CheckoutSheet })));

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Bienvenue — Hold" },
      { name: "description", content: "Commence ton no contact avec Lumi, en quelques questions." },
      { property: "og:title", content: "Bienvenue — Hold" },
      { property: "og:description", content: "Commence ton no contact avec Lumi, en quelques questions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

const TOTAL = 20;
const LAST_CONTACT = ["today", "week", "month", "m1_3", "m3_6", "gt_6m"] as const;
const AFTER = ["worse", "ignored", "nothing_changed", "saw_upsetting", "argued", "cold", "not_yet"] as const;
const NOW = ["devastated", "angry", "hoping", "guilty", "confused", "lonely", "okay"] as const;
const GOALS = ["d7", "d14", "d30", "d60", "d90", "d180", "open"] as const;
const RULES = ["no_texting", "no_stalking", "no_old_photos", "no_meeting", "no_reply_except", "no_asking_friends", "no_running_into"] as const;
const SOURCES = ["tiktok", "google", "word_of_mouth", "quora", "app_store", "instagram_facebook", "reddit", "other"] as const;

const AUTO_NEXT_MS = 350;

const only = <T extends string>(list: readonly T[], value?: string | null) => (list.some((v) => v === value) ? (value as string) : "");
const onlyMany = <T extends string>(list: readonly T[], values?: string[] | null) => (values ?? []).filter((v) => list.some((x) => x === v));

function Question({ id, title, sub }: { id: string; title: string; sub?: string }) {
  return (
    <div className="fade-up mb-6">
      <h1 id={id} className="text-[32px] leading-tight md:text-4xl">{title}</h1>
      {sub && <p className="mt-2 text-muted-foreground">{sub}</p>}
    </div>
  );
}

const prefersReducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function Onboarding() {
  const { t, tl, lang } = useI18n();
  const { ready, profile, updateProfile } = useApp();
  const navigate = useNavigate();
  const crisis = useCrisisLine();
  const [step, setStep] = useState(0);
  const [subStep, setSubStep] = useState(SHOW_ONBOARDING_INTRO ? 0 : 1); // within step 1: 0 intro (hidden unless SHOW_ONBOARDING_INTRO), 1 name, 2 greeting
  const [init, setInit] = useState(false);
  const [name, setName] = useState("");
  const [situation, setSituation] = useState("");
  const [lastContact, setLastContact] = useState("");
  const [after, setAfter] = useState<string[]>([]);
  const [now, setNow] = useState<string[]>([]);
  const [hope, setHope] = useState("");
  const [source, setSource] = useState("");
  const [goal, setGoal] = useState("");
  const [rules, setRules] = useState<string[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false); // Whop checkout sheet opened by the paywall result button
  const [celebrateResult, setCelebrateResult] = useState(false); // confetti on the paywall result, only when arriving forward from the pitch
  const [celebrate, setCelebrate] = useState(false); // play the plan-ready celebration once, only when arriving forward
  const [leaving, setLeaving] = useState<"fwd" | "back" | null>(null);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [infoStep, setInfoStep] = useState(1); // within step 9: the information screens (1..INFO_KINDS.length)
  const [plan, setPlan] = useState<PlanKey>("quarterly"); // plan highlighted on the pitch page (the pitch page itself has no payment button; the paywall result screen after it does)
  const [reminder, setReminder] = useState({ enabled: false, time: DEFAULT_REMINDER_TIME });

  useEffect(() => {
    if (!ready || !profile || init) return;
    if (profile.onboarding_completed) { navigate({ to: "/" }); return; }
    const saved = profile.onboarding_step ?? 0;
    setStep(!SHOW_PLAN_PITCH && saved === 19 ? 20 : saved); // a hidden pitch step resumes on the paywall result
    if (profile.name) { setName(profile.name); setSubStep(1); }
    setSituation(only(SITUATIONS, profile.situation_type));
    setLastContact(only(LAST_CONTACT, profile.last_contact_range));
    setAfter(onlyMany(AFTER, profile.last_contact_feelings));
    setNow(onlyMany(NOW, profile.current_feelings));
    setHope(only(MOTIVATIONS, profile.motivation));
    setSource(only(SOURCES, profile.acquisition_source));
    setGoal(only(GOALS, profile.no_contact_goal));
    setRules(onlyMany(RULES, profile.no_contact_rules));
    setInit(true);
  }, [ready, profile, init, navigate]);

  /** Fade the current screen out (160ms), then run the change; the next screen fades in. Instant with reduced motion. */
  const transition = (action: () => void, direction: "fwd" | "back" = "fwd") => {
    if (leaving) return;
    setDir(direction);
    if (prefersReducedMotion()) { action(); return; }
    setLeaving(direction);
    window.setTimeout(() => { action(); setLeaving(null); }, 160);
  };
  const outClass = leaving ? `screen-out-${leaving}` : `screen-in-${dir}`;

  // Single-choice questions that move on by themselves once an answer is picked: a short pause shows the selection,
  // then the same step change as the Continue button. A newer pick (or leaving the screen) cancels a pending one.
  const autoTimer = useRef<number | null>(null);
  const autoNext = (action: () => void) => {
    if (autoTimer.current) window.clearTimeout(autoTimer.current);
    autoTimer.current = window.setTimeout(() => { autoTimer.current = null; transition(action); }, AUTO_NEXT_MS);
  };
  useEffect(() => () => { if (autoTimer.current) window.clearTimeout(autoTimer.current); autoTimer.current = null; }, [step]);

  const go = async (target: number, patch: ProfilePatch = {}) => {
    const next = !SHOW_PLAN_PITCH && target === 19 ? 20 : target; // pitch hidden: go straight to the paywall result
    if (next === 20 && target === 19) setCelebrateResult(true); // keep the arrival confetti the pitch used to trigger
    setStep(next);
    window.scrollTo(0, 0);
    await updateProfile({ ...patch, onboarding_step: next });
  };

  // The paywall result is now the last screen: pressing any of its buttons completes the onboarding.
  const complete = () => updateProfile({ onboarding_completed: true, onboarding_step: TOTAL });
  const finish = async () => { await complete(); navigate({ to: "/" }); };

  const opts = <T extends string>(group: string, values: readonly T[]) =>
    values.map((v) => ({ value: v, label: t(`options.${group}.${v}`) }));


  const hasReviews = reviewsAvailable(tl<{ name: string; title: string; body: string }[]>("reviews.examples"));

  if (!ready || !init) return <FullLoader />;


  let body: React.ReactNode = null;
  let canNext = true;
  let tone: "light" | "dusk" | "night" = "light";
  let onNext: () => void = () => go(step + 1);
  let nextLabel = t("common.next");
  let onSkip: (() => void) | null = null; // optional questions: text link under the button
  let skipLabel = t("onb.skip");

  switch (step) {
    case 0:
      return (
        <Stage key="welcome" tone="dusk"><div className={`${outClass} mx-auto flex min-h-svh max-w-[480px] flex-col px-6 pb-8 pt-6`}>
          <div className="flex items-center justify-between">
            <span className="font-display text-2xl">{APP_NAME}</span>
            <LangSwitch onChange={(l) => updateProfile({ language: l })} />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="fade-up"><Lumi size={120} stage={3} emotion="happy" /></div>
            <h1 className="fade-up mt-8 text-4xl leading-tight md:text-5xl" style={{ "--d": "200ms" } as React.CSSProperties}>{t("welcome.headline")}</h1>
            <p className="fade-up mt-4 text-lg text-muted-foreground" style={{ "--d": "350ms" } as React.CSSProperties}>{t("welcome.sub")}</p>
          </div>
          <PrimaryButton onClick={() => transition(() => go(1, { language: lang }))}>{t("welcome.start")}</PrimaryButton>
          <button type="button" onClick={() => navigate({ to: "/signin" })} className="mt-3 min-h-11 text-foreground underline-offset-4 hover:underline">{t("welcome.haveAccount")}</button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <a href={`tel:${crisis.tel}`} className="underline-offset-4 hover:underline">{t("crisis.disclaimer", { number: crisis.number })}</a>
          </p>
        </div></Stage>
      );
    case 1:
      if (subStep === 0) {
        return (
          <Stage key="intro" tone="dusk"><div className={`${outClass} mx-auto flex min-h-svh max-w-[480px] flex-col px-6 pb-6 pt-6`}>
            <div>
              <button type="button" onClick={() => transition(() => go(0), "back")} aria-label={t("common.back")} className="glass flex h-11 w-11 items-center justify-center rounded-full text-foreground"><BackIcon /></button>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="fade-up"><Lumi size={120} stage={3} emotion="happy" /></div>
              <h1 className="fade-up mt-8 text-4xl leading-tight md:text-5xl" style={{ "--d": "200ms" } as React.CSSProperties}>{t("onb.introTitle")}</h1>
              <p className="fade-up mt-4 text-lg text-muted-foreground" style={{ "--d": "350ms" } as React.CSSProperties}>{t("onb.introSub")}</p>
            </div>
            <div className="sticky bottom-0 pb-2 pt-3">
              <PrimaryButton onClick={() => transition(() => { setSubStep(1); window.scrollTo(0, 0); })}>{t("common.next")}</PrimaryButton>
            </div>
          </div></Stage>
        );
      }
      if (subStep === 2) {
        return (
          <Stage key="greeting" tone="dusk"><div className={`${outClass} mx-auto flex min-h-svh max-w-[480px] flex-col px-6 pb-6 pt-6`}>
            <div>
              <button type="button" onClick={() => transition(() => setSubStep(1), "back")} aria-label={t("common.back")} className="glass flex h-11 w-11 items-center justify-center rounded-full text-foreground"><BackIcon /></button>
            </div>
            <Greeting name={name.trim()} />
            <div className="fade-up sticky bottom-0 pb-2 pt-3" style={{ "--d": "3300ms" } as React.CSSProperties}>
              <PrimaryButton onClick={() => transition(() => go(2))}>{t("onb.greet.cta")}</PrimaryButton>
            </div>
          </div></Stage>
        );
      }
      body = (<>
        <Question id="q-name" title={t("onb.nameTitle")} />
        <input value={name} maxLength={40} aria-label={t("onb.nameTitle")} placeholder={t("onb.namePh")}
          onChange={(e) => setName(e.target.value)}
          className="glass min-h-14 w-full rounded-[28px] px-5 text-base text-foreground placeholder:text-muted-foreground/70" />
      </>);
      canNext = name.trim().length > 0;
      onNext = async () => { setSubStep(2); window.scrollTo(0, 0); await updateProfile({ name: name.trim() }); };
      break;
    case 2:
      body = (<><Question id="q2" title={t("onb.situationTitle")} sub={t("onb.situationSub")} />
        <ChoiceList labelledBy="q2" options={opts("situation", SITUATIONS)} details={Object.fromEntries(SITUATIONS.map((v) => [v, t(`options.situationInfo.${v}`)]))} value={situation ? [situation] : []} onChange={(v) => setSituation(v[0] ?? "")} /></>);
      canNext = !!situation; onNext = () => go(3, { situation_type: situation });
      break;
    case 3: {
      const saveLastContact = (range: string) => {
        const days = CONTACT_RANGE_DAYS[range as ContactRange] ?? 0;
        void go(4, { last_contact_range: range, last_contact_at: new Date(Date.now() - days * 86400000).toISOString() });
      };
      body = (<><Question id="q3" title={t("onb.lastContactTitle")} />
        <ChoiceList labelledBy="q3" options={opts("lastContact", LAST_CONTACT)} value={lastContact ? [lastContact] : []}
          onChange={(v) => { const range = v[0] ?? ""; setLastContact(range); if (range) autoNext(() => saveLastContact(range)); }} /></>);
      canNext = !!lastContact;
      onNext = () => saveLastContact(lastContact);
      break;
    }
    case 4:
      body = (<><Question id="q4" title={t("onb.afterTitle")} sub={t("onb.multiSub")} />
        <ChoiceList multi labelledBy="q4" options={opts("after", AFTER)} value={after}
          onChange={(v) => setAfter(v.includes("not_yet") && !after.includes("not_yet") ? ["not_yet"] : v.filter((x) => x !== "not_yet" || v.length === 1))} /></>);
      canNext = after.length > 0; onNext = () => go(5, { last_contact_feelings: after });
      break;
    case 5:
      body = (<><Question id="q5" title={t("onb.nowTitle")} sub={t("onb.multiSub")} />
        <ChoiceList multi labelledBy="q5" options={opts("now", NOW)} value={now} onChange={setNow} /></>);
      canNext = now.length > 0; onNext = () => go(6, { current_feelings: now });
      break;
    case 6:
      body = (<><Question id="q6" title={t("onb.hopeTitle")} sub={t("onb.hopeSub")} />
        <ChoiceList labelledBy="q6" options={opts("motivation", MOTIVATIONS)} details={Object.fromEntries(MOTIVATIONS.map((v) => [v, t(`options.motivationInfo.${v}`)]))} value={hope ? [hope] : []} onChange={(v) => setHope(v[0] ?? "")} /></>);
      canNext = !!hope; onNext = () => go(7, { motivation: hope });
      break;
    case 7:
      body = (<><Question id="q7" title={t("onb.sourceTitle")} sub={t("onb.sourceSub")} />
        <ChoiceList labelledBy="q7" options={opts("source", SOURCES)} value={source ? [source] : []}
          onChange={(v) => { const picked = v[0] ?? ""; setSource(picked); if (picked) autoNext(() => void go(8, { acquisition_source: picked })); }} /></>);
      canNext = !!source; onNext = () => go(8, { acquisition_source: source });
      break;
    case 8:
      body = (<><Question id="q8" title={t("onb.goalTitle")} sub={t("onb.goalSub")} />
        <ChoiceList grid labelledBy="q8" options={opts("goal", GOALS)} value={goal ? [goal] : []} onChange={(v) => setGoal(v[0] ?? "")} /></>);
      canNext = !!goal; onNext = () => { setInfoStep(1); void go(9, { no_contact_goal: goal }); };
      onSkip = () => { setGoal(""); setInfoStep(1); void go(9, { no_contact_goal: null }); };
      break;
    case 9:
      {
        const kind = INFO_KINDS[infoStep - 1]!;
        body = <InfoBody kind={kind} name={name.trim()} />;
        tone = INFO_TONE[kind];
        onNext = () => {
          window.scrollTo(0, 0);
          if (infoStep < INFO_KINDS.length) setInfoStep(infoStep + 1);
          else go(10);
        };
      }
      break;
    case 10:
      body = (<><Question id="q10" title={t("onb.rulesTitle")} sub={t("onb.rulesSub")} />
        <ChoiceList multi labelledBy="q10" options={opts("rules", RULES)} value={rules} onChange={setRules} /></>);
      onNext = () => go(11, { no_contact_rules: rules });
      break;
    case 11:
      return (
        <Stage key="flow" tone="dusk">
          <AloneScreen key="alone" name={name.trim()} onDone={() => go(hasReviews ? 12 : 13)} />
        </Stage>
      );
    case 12:
      body = <ReviewsScreen />;
      tone = "dusk";
      break;
    case 13:
      return (
        <Stage key="flow" tone="light">
          <PlanBuilding key="build" onDone={() => { setCelebrate(true); void go(14); }} />
        </Stage>
      );
    case 14:
      body = <PlanReady name={name.trim()} goal={goal} celebrate={celebrate} onCelebrated={() => setCelebrate(false)} />;
      tone = "dusk";
      nextLabel = t("ready.start");
      break;
    case 15:
      body = <PhoneShowcase />;
      tone = "dusk";
      break;
    case 16:
      body = <CompanionShowcase />;
      tone = "dusk";
      break;
    case 17:
      body = <ReminderIntro />;
      nextLabel = t("reminderIntro.cta");
      onNext = () => go(notifyScreenApplicable() ? 18 : 19); // no notification support and not an iPhone: skip the permission screen
      break;
    case 18:
      body = <NotifyPermission onEnabled={() => setReminder((r) => ({ ...r, enabled: true }))} />;
      onNext = () => go(19, { reminder_enabled: reminder.enabled, reminder_time: reminder.time }); // the plan/reminder screen is gone: save the choice here
      break;
    case 20:
      return (
        <Stage key="flow" tone="dusk">
          <div className={`${outClass} mx-auto flex min-h-svh max-w-[480px] flex-col px-6 pb-4 pt-3`}>
            <PaywallResult plan={plan} onPlan={setPlan} celebrate={celebrateResult} onCelebrated={() => setCelebrateResult(false)} onBack={() => transition(() => go(SHOW_PLAN_PITCH ? 19 : notifyScreenApplicable() ? 18 : 17), "back")}
              onStart={() => { void complete(); setCheckoutOpen(true); }}
              onSkip={() => void finish()}
              onSimulate={() => { void complete(); navigate({ to: "/subscribe/success", search: { simulate: "1" } }); }} />
          </div>
          {checkoutOpen && <Suspense fallback={null}><CheckoutSheet open={checkoutOpen} onOpenChange={setCheckoutOpen} plan={plan} /></Suspense>}
        </Stage>
      );
    case 19:
      body = <PlanPitch value={plan} onChange={setPlan} />;
      tone = "dusk";
      onNext = () => { setCelebrateResult(true); void go(20); };
      if (SIMULATE_PAYMENT) {
        // Preview only: jump to the post-payment screen without paying or creating any subscription.
        skipLabel = t("pitch.simulate");
        onSkip = () => { void complete(); navigate({ to: "/subscribe/success", search: { simulate: "1" } }); };
      }
      break;
  }

  return (
    <Stage key="flow" tone={tone}>
    <div className="mx-auto flex min-h-svh max-w-[480px] flex-col px-6 pb-8 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => transition(() => {
          if (step === 9 && infoStep > 1) { setInfoStep(infoStep - 1); window.scrollTo(0, 0); }
          else if (step === 1 && subStep > (SHOW_ONBOARDING_INTRO ? 0 : 1)) setSubStep(subStep - 1); // intro hidden: back from the name returns to the welcome
          else if (step === 14) go(hasReviews ? 12 : 10); // skip the loading scene
          else if (step === 13) go(hasReviews ? 12 : 10);
          else if (step === 12) go(10);
          else if (step === 19) go(notifyScreenApplicable() ? 18 : 17);
          else go(step - 1);
        }, "back")} aria-label={t("common.back")} className="glass flex h-11 w-11 items-center justify-center rounded-full text-foreground"><BackIcon /></button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/50" role="progressbar" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={step} aria-label={t("onb.progress", { n: step, total: TOTAL })}>
          <div className="h-full rounded-full bg-[var(--progress)] transition-all" style={{ width: `${((step + (step === 9 ? (infoStep - 1) / INFO_KINDS.length : 0)) / TOTAL) * 100}%` }} />
        </div>
      </div>
      <div key={`${step}-${subStep}-${infoStep}`} className={`${outClass} flex flex-1 flex-col`}>
        <div className="flex-1">{body}</div>
      {(canNext || step !== 21) && (
        <div className="fade-up sticky bottom-0 mt-8 pb-2 pt-3" style={{ "--d": "450ms" } as React.CSSProperties}>
          <PrimaryButton disabled={!canNext} onClick={() => transition(onNext)}>{nextLabel}</PrimaryButton>
          {onSkip && (
            <button type="button" onClick={() => transition(onSkip!)} className="mt-2 min-h-11 w-full text-sm text-muted-foreground underline-offset-4 hover:underline">{skipLabel}</button>
          )}
        </div>
      )}
      </div>
    </div>
    </Stage>
  );
}
