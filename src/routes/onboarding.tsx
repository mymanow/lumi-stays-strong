import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n, interpolate } from "@/i18n";
import { useApp, type ProfilePatch } from "@/lib/app-state";
import { Lumi } from "@/components/hold/Lumi";
import { ChoiceList, FullLoader, LangSwitch, PrimaryButton, Stage, useCrisisLine } from "@/components/hold/Common";
import { BackIcon } from "@/components/hold/Icons";
import { Greeting } from "@/components/hold/Greeting";
import { InfoBody, INFO_KINDS, INFO_TONE } from "@/components/hold/OnboardingInfo";
import { HoldButton } from "@/components/hold/HoldButton";
import { AccountLinker } from "@/components/hold/AccountLinker";
import { APP_NAME } from "@/config/app";
import { commitmentPhraseKeys, CONTACT_RANGE_DAYS, DEFAULT_REMINDER_TIME, MOTIVATIONS, SITUATIONS, type ContactRange } from "@/lib/domain";
import { ReminderControl } from "@/components/hold/ReminderControl";

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

const TOTAL = 13;
const LAST_CONTACT = ["today", "week", "month", "m1_3", "m3_6", "gt_6m"] as const;
const AFTER = ["worse", "ignored", "nothing_changed", "saw_upsetting", "argued", "cold", "not_yet"] as const;
const NOW = ["devastated", "angry", "hoping", "guilty", "confused", "lonely", "okay"] as const;
const GOALS = ["d7", "d14", "d30", "d60", "d90", "d180", "open"] as const;
const RULES = ["no_texting", "no_stalking", "no_old_photos", "no_meeting", "no_reply_except", "no_asking_friends", "no_running_into"] as const;
const GENDERS = ["woman", "man", "undisclosed"] as const;

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
  const [subStep, setSubStep] = useState(0); // within step 1: 0 intro, 1 name, 2 greeting
  const [init, setInit] = useState(false);
  const [name, setName] = useState("");
  const [situation, setSituation] = useState("");
  const [lastContact, setLastContact] = useState("");
  const [after, setAfter] = useState<string[]>([]);
  const [now, setNow] = useState<string[]>([]);
  const [hope, setHope] = useState("");
  const [goal, setGoal] = useState("");
  const [rules, setRules] = useState<string[]>([]);
  const [gender, setGender] = useState("");
  const [leaving, setLeaving] = useState<"fwd" | "back" | null>(null);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [infoStep, setInfoStep] = useState(1); // within step 9: the four information screens (1..4)
  const [reminder, setReminder] = useState({ enabled: false, time: DEFAULT_REMINDER_TIME });

  useEffect(() => {
    if (!ready || !profile || init) return;
    if (profile.onboarding_completed) { navigate({ to: "/" }); return; }
    setStep(profile.onboarding_step ?? 0);
    if (profile.name) { setName(profile.name); setSubStep(1); }
    setSituation(only(SITUATIONS, profile.situation_type));
    setLastContact(only(LAST_CONTACT, profile.last_contact_range));
    setAfter(onlyMany(AFTER, profile.last_contact_feelings));
    setNow(onlyMany(NOW, profile.current_feelings));
    setHope(only(MOTIVATIONS, profile.motivation));
    setGoal(only(GOALS, profile.no_contact_goal));
    setRules(onlyMany(RULES, profile.no_contact_rules));
    setGender(profile.gender ?? "");
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

  const go = async (next: number, patch: ProfilePatch = {}) => {
    setStep(next);
    window.scrollTo(0, 0);
    await updateProfile({ ...patch, onboarding_step: next });
  };

  const finish = async () => {
    await updateProfile({ onboarding_completed: true, onboarding_step: TOTAL });
    navigate({ to: "/subscribe", search: { from: "onboarding" } });
  };

  const opts = <T extends string>(group: string, values: readonly T[]) =>
    values.map((v) => ({ value: v, label: t(`options.${group}.${v}`) }));


  const commitPhrases = useMemo(() => commitmentPhraseKeys(hope, situation).map((k) => t(k)), [hope, situation, t]);

  if (!ready || !init) return <FullLoader />;


  let body: React.ReactNode = null;
  let canNext = true;
  let tone: "light" | "dusk" | "night" = step === 11 ? "night" : "light";
  let onNext: () => void = () => go(step + 1);

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
        <ChoiceList labelledBy="q2" options={opts("situation", SITUATIONS)} value={situation ? [situation] : []} onChange={(v) => setSituation(v[0] ?? "")} /></>);
      canNext = !!situation; onNext = () => go(3, { situation_type: situation });
      break;
    case 3:
      body = (<><Question id="q3" title={t("onb.lastContactTitle")} />
        <ChoiceList labelledBy="q3" options={opts("lastContact", LAST_CONTACT)} value={lastContact ? [lastContact] : []} onChange={(v) => setLastContact(v[0] ?? "")} /></>);
      canNext = !!lastContact;
      onNext = () => {
        const days = CONTACT_RANGE_DAYS[lastContact as ContactRange] ?? 0;
        go(4, { last_contact_range: lastContact, last_contact_at: new Date(Date.now() - days * 86400000).toISOString() });
      };
      break;
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
        <ChoiceList labelledBy="q6" options={opts("motivation", MOTIVATIONS)} value={hope ? [hope] : []} onChange={(v) => setHope(v[0] ?? "")} /></>);
      canNext = !!hope; onNext = () => go(7, { motivation: hope });
      break;
    case 7:
      body = (<><Question id="q7" title={t("onb.goalTitle")} sub={t("onb.goalSub")} />
        <ChoiceList labelledBy="q7" options={opts("goal", GOALS)} value={goal ? [goal] : []} onChange={(v) => setGoal(v[0] ?? "")} /></>);
      canNext = !!goal; onNext = () => go(8, { no_contact_goal: goal });
      break;
    case 8:
      body = (<><Question id="q8" title={t("onb.gender")} sub={t("onb.genderSub")} /><ChoiceList labelledBy="q8" options={opts("gender", GENDERS)} value={gender ? [gender] : []} onChange={(v) => setGender(v[0] ?? "")} /></>);
      canNext = !!gender; onNext = () => { setInfoStep(1); void go(9, { gender }); };
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
      body = (<>
        <Question id="q11" title={t("commit.title")} />
        <ul className="mb-10 flex flex-col gap-3">
          {commitPhrases.map((p) => <li key={p} className="font-display text-xl leading-snug">{p}</li>)}
        </ul>
        <HoldButton onComplete={() => go(12, { commitment_at: new Date().toISOString() })} />
      </>);
      canNext = false;
      break;
    case 12:
      body = (<>
        <Question id="q12" title={t("plan.title")} />
        <ul className="mb-8 flex flex-col gap-3">
          {tl<string[]>("plan.rows").map((r) => (
            <li key={r} className="flex items-center gap-3 glass rounded-[24px] p-4">
              <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg>
              </span>
              {interpolate(r)}
            </li>
          ))}
        </ul>
        <ReminderControl value={reminder} onChange={setReminder} />
      </>);
      onNext = () => go(13, { reminder_enabled: reminder.enabled, reminder_time: reminder.time });
      break;
    case 13:
      body = (<>
        <div className="mb-6 flex justify-center"><Lumi size={64} stage={2} emotion="happy" /></div>
        <Question id="q13" title={t("account.title")} sub={t("account.sub")} />
        <AccountLinker />
        <button type="button" onClick={finish} className="mt-6 min-h-12 w-full text-foreground underline-offset-4 hover:underline">{t("account.skip")}</button>
      </>);
      canNext = false;
      break;
  }

  return (
    <Stage key="flow" tone={tone}>
    <div className="mx-auto flex min-h-svh max-w-[480px] flex-col px-6 pb-8 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => transition(() => {
          if (step === 9 && infoStep > 1) { setInfoStep(infoStep - 1); window.scrollTo(0, 0); }
          else if (step === 1 && subStep > 0) setSubStep(subStep - 1);
          else go(step - 1);
        }, "back")} aria-label={t("common.back")} className="glass flex h-11 w-11 items-center justify-center rounded-full text-foreground"><BackIcon /></button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/50" role="progressbar" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={step} aria-label={t("onb.progress", { n: step, total: TOTAL })}>
          <div className="h-full rounded-full bg-[var(--progress)] transition-all" style={{ width: `${((step + (step === 9 ? (infoStep - 1) / INFO_KINDS.length : 0)) / TOTAL) * 100}%` }} />
        </div>
      </div>
      <div key={`${step}-${subStep}-${infoStep}`} className={`${outClass} flex flex-1 flex-col`}>
        <div className="flex-1">{body}</div>
      {(canNext || ![11, 13].includes(step)) && (
        <div className="fade-up sticky bottom-0 mt-8 pb-2 pt-3" style={{ "--d": "450ms" } as React.CSSProperties}>
          <PrimaryButton disabled={!canNext} onClick={() => transition(onNext)}>{t("common.next")}</PrimaryButton>
        </div>
      )}
      </div>
    </div>
    </Stage>
  );
}
