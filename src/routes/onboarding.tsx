import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n, interpolate } from "@/i18n";
import { useApp, type ProfilePatch } from "@/lib/app-state";
import { Lumi } from "@/components/hold/Lumi";
import { ChoiceList, FullLoader, LangSwitch, PrimaryButton, useCrisisLine } from "@/components/hold/Common";
import { BackIcon } from "@/components/hold/Icons";
import { HoldButton } from "@/components/hold/HoldButton";
import { AccountLinker } from "@/components/hold/AccountLinker";
import { APP_NAME } from "@/config/app";
import { commitmentPhraseKeys } from "@/lib/domain";
import { ReminderControl } from "@/components/hold/ReminderControl";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Bienvenue — Hold" },
      { name: "description", content: "Commence ton no contact avec Lumi, en quelques questions." },
      { property: "og:title", content: "Bienvenue — Hold" },
      { property: "og:description", content: "Commence ton no contact avec Lumi, en quelques questions." },
    ],
  }),
  component: Onboarding,
});

const TOTAL = 13;
const TRIGGERS = ["evening", "social_media", "loneliness", "alcohol", "argument", "anniversary", "other"] as const;
const DURATIONS = ["lt_6m", "6_12m", "1_3y", "gt_3y"] as const;
const SITUATIONS = ["infidelity_healing", "one_sided_love", "toxic", "blocked_ghosted", "divorce_long_term", "breakup", "situationship_ended", "mutual_breakup", "ex_moved_on", "first_love", "on_off", "long_relationship_ended"] as const;
const MOTIVATIONS = ["take_back_control", "win_back", "move_on", "unsure"] as const;
const EMOTIONS = ["calm", "disgust", "joy", "anger", "fear", "sadness"] as const;
const GENDERS = ["woman", "man", "undisclosed"] as const;

function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return { date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, time: `${p(d.getHours())}:${p(d.getMinutes())}` };
}

function Onboarding() {
  const { t, tl, lang } = useI18n();
  const { ready, profile, updateProfile } = useApp();
  const navigate = useNavigate();
  const crisis = useCrisisLine();
  const [step, setStep] = useState(0);
  const [init, setInit] = useState(false);
  const [contact, setContact] = useState(() => toLocalInput(new Date()));
  const [triggers, setTriggers] = useState<string[]>([]);
  type S = { duration: string; endedBy: string; endedChoice?: string | undefined; firstBreakup: string; situation: string; motivation: string; emotion: string; gender: string };
  const [single, setSingle] = useState<S>({ duration: "", endedBy: "", firstBreakup: "", situation: "", motivation: "", emotion: "", gender: "" });
  const [age, setAge] = useState(30);
  const [reasons, setReasons] = useState(["", "", ""]);
  const [reminder, setReminder] = useState({ enabled: false, time: "21:30" });

  useEffect(() => {
    if (!ready || !profile || init) return;
    if (profile.onboarding_completed) { navigate({ to: "/" }); return; }
    setStep(profile.onboarding_step ?? 0);
    if (profile.last_contact_at) setContact(toLocalInput(new Date(profile.last_contact_at)));
    setTriggers(profile.triggers ?? []);
    setSingle({
      duration: profile.relationship_duration ?? "", endedBy: profile.ended_by ?? "",
      firstBreakup: profile.first_breakup == null ? "" : profile.first_breakup ? "yes" : "no",
      situation: profile.situation_type ?? "", motivation: profile.motivation ?? "",
      emotion: profile.dominant_emotion ?? "", gender: profile.gender ?? "",
    });
    if (profile.age) setAge(profile.age);
    if (profile.reasons?.length) setReasons([0, 1, 2].map((i) => profile.reasons[i] ?? ""));
    setInit(true);
  }, [ready, profile, init, navigate]);

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

  const pick = (key: keyof S) => (v: string[]) => setSingle((s) => ({ ...s, [key]: v[0] ?? "" }));

  const commitPhrases = useMemo(() => commitmentPhraseKeys(single.motivation, single.situation).map((k) => t(k)), [single, t]);

  if (!ready || !init) return <FullLoader />;

  const Question = ({ id, title, sub }: { id: string; title: string; sub?: string }) => (
    <div className="mb-6">
      <h1 id={id} className="text-2xl font-semibold leading-snug md:text-3xl">{title}</h1>
      {sub && <p className="mt-2 text-muted-foreground">{sub}</p>}
    </div>
  );

  let body: React.ReactNode = null;
  let canNext = true;
  let onNext: () => void = () => go(step + 1);

  switch (step) {
    case 0:
      return (
        <div className="mx-auto flex min-h-screen max-w-[480px] flex-col px-6 pb-8 pt-6">
          <div className="flex items-center justify-between">
            <span className="font-display text-2xl">{APP_NAME}</span>
            <LangSwitch onChange={(l) => updateProfile({ language: l })} />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <Lumi size={110} stage={3} />
            <h1 className="mt-8 text-3xl font-semibold leading-tight md:text-4xl">{t("welcome.headline")}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{t("welcome.sub")}</p>
          </div>
          <PrimaryButton onClick={() => go(1, { language: lang })}>{t("welcome.start")}</PrimaryButton>
          <button type="button" onClick={() => navigate({ to: "/signin" })} className="mt-3 min-h-11 text-foreground underline-offset-4 hover:underline">{t("welcome.haveAccount")}</button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <a href={`tel:${crisis.tel}`} className="underline-offset-4 hover:underline">{t("crisis.disclaimer", { number: crisis.number })}</a>
          </p>
        </div>
      );
    case 1:
      body = (<>
        <Question id="q1" title={t("onb.lastContact")} />
        <div className="mb-8 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">{t("onb.date")}
            <input type="date" value={contact.date} max={toLocalInput(new Date()).date} onChange={(e) => setContact({ ...contact, date: e.target.value })}
              className="min-h-12 rounded-xl border border-line bg-surface px-3 text-base text-foreground [color-scheme:dark]" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">{t("onb.time")}
            <input type="time" value={contact.time} onChange={(e) => setContact({ ...contact, time: e.target.value })}
              className="min-h-12 rounded-xl border border-line bg-surface px-3 text-base text-foreground [color-scheme:dark]" />
          </label>
        </div>
        <h2 id="q1b" className="mb-4 text-xl font-semibold">{t("onb.triggersTitle")}</h2>
        <ChoiceList multi labelledBy="q1b" options={opts("triggers", TRIGGERS)} value={triggers} onChange={setTriggers} />
      </>);
      canNext = !!contact.date && !!contact.time;
      onNext = () => {
        let d = new Date(`${contact.date}T${contact.time}`);
        if (isNaN(d.getTime()) || d > new Date()) d = new Date();
        go(2, { last_contact_at: d.toISOString(), triggers });
      };
      break;
    case 2:
      body = (<><Question id="q2" title={t("onb.duration")} /><ChoiceList labelledBy="q2" options={opts("duration", DURATIONS)} value={[single.duration]} onChange={pick("duration")} /></>);
      canNext = !!single.duration; onNext = () => go(3, { relationship_duration: single.duration });
      break;
    case 3: {
      const sel = single.endedBy === "them" ? [single.endedChoice ?? "them_him"] : [single.endedChoice ?? single.endedBy];
      body = (<><Question id="q3" title={t("onb.endedBy")} />
        <ChoiceList labelledBy="q3" options={opts("endedBy", ["me", "them_him", "them_her", "mutual"] as const)} value={sel}
          onChange={(v) => setSingle((s) => ({ ...s, endedChoice: v[0], endedBy: v[0]?.startsWith("them") ? "them" : v[0] ?? "" }))} /></>);
      canNext = !!single.endedBy; onNext = () => go(4, { ended_by: single.endedBy });
      break;
    }
    case 4:
      body = (<><Question id="q4" title={t("onb.firstBreakup")} /><ChoiceList labelledBy="q4" options={opts("firstBreakup", ["yes", "no"] as const)} value={[single.firstBreakup]} onChange={pick("firstBreakup")} /></>);
      canNext = !!single.firstBreakup; onNext = () => go(5, { first_breakup: single.firstBreakup === "yes" });
      break;
    case 5:
      body = (<><Question id="q5" title={t("onb.situation")} /><ChoiceList labelledBy="q5" options={opts("situation", SITUATIONS)} value={[single.situation]} onChange={pick("situation")} /></>);
      canNext = !!single.situation; onNext = () => go(6, { situation_type: single.situation });
      break;
    case 6:
      body = (<><Question id="q6" title={t("onb.motivation")} sub={t("onb.motivationSub")} /><ChoiceList labelledBy="q6" options={opts("motivation", MOTIVATIONS)} value={[single.motivation]} onChange={pick("motivation")} /></>);
      canNext = !!single.motivation; onNext = () => go(7, { motivation: single.motivation });
      break;
    case 7:
      body = (<><Question id="q7" title={t("onb.emotion")} /><ChoiceList labelledBy="q7" options={opts("emotion", EMOTIONS)} value={[single.emotion]} onChange={pick("emotion")} /></>);
      canNext = !!single.emotion; onNext = () => go(8, { dominant_emotion: single.emotion });
      break;
    case 8:
      body = (<><Question id="q8" title={t("onb.gender")} sub={t("onb.genderSub")} /><ChoiceList labelledBy="q8" options={opts("gender", GENDERS)} value={[single.gender]} onChange={pick("gender")} /></>);
      canNext = !!single.gender; onNext = () => go(9, { gender: single.gender });
      break;
    case 9:
      body = (<><Question id="q9" title={t("onb.age")} sub={t("onb.ageSub")} /><AgeWheel value={age} onChange={setAge} unit={t("onb.ageUnit")} labelledBy="q9" /></>);
      onNext = () => go(10, { age });
      break;
    case 10: {
      const ph = tl<string[]>("onb.reasonPh");
      body = (<><Question id="q10" title={t("onb.reasons")} sub={t("onb.reasonsSub")} />
        <div className="flex flex-col gap-4">
          {reasons.map((r, i) => (
            <label key={i} className="flex flex-col gap-1 text-sm text-muted-foreground">
              {t("onb.reason", { n: i + 1 })}{i > 0 ? ` (${t("common.optional").toLowerCase()})` : ""}
              <input value={r} maxLength={120} required={i === 0} placeholder={ph[i]} onChange={(e) => setReasons(reasons.map((x, j) => (j === i ? e.target.value : x)))}
                className="min-h-12 rounded-xl border border-line bg-surface px-4 text-base text-foreground placeholder:text-muted-foreground/60" />
            </label>
          ))}
        </div></>);
      canNext = (reasons[0] ?? "").trim().length > 0;
      onNext = () => go(11, { reasons: reasons.map((r) => r.trim()).filter(Boolean).slice(0, 3) });
      break;
    }
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
            <li key={r} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
              <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg>
              </span>
              {interpolate(r)}
            </li>
          ))}
        </ul>
        <ReminderControl value={reminder} onChange={setReminder} />
      </>);
      onNext = () => go(13, { reminder_enabled: false, reminder_time: reminder.time });
      break;
    case 13:
      body = (<>
        <div className="mb-6 flex justify-center"><Lumi size={60} stage={2} /></div>
        <Question id="q13" title={t("account.title")} sub={t("account.sub")} />
        <AccountLinker />
        <button type="button" onClick={finish} className="mt-6 min-h-12 w-full text-foreground underline-offset-4 hover:underline">{t("account.skip")}</button>
      </>);
      canNext = false;
      break;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col px-6 pb-8 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => go(step - 1)} aria-label={t("common.back")} className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-surface"><BackIcon /></button>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={step} aria-label={t("onb.progress", { n: step, total: TOTAL })}>
          <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${(step / TOTAL) * 100}%` }} />
        </div>
      </div>
      <div className="flex-1">{body}</div>
      {(canNext || ![11, 13].includes(step)) && (
        <div className="sticky bottom-0 mt-8 bg-background pb-2 pt-3">
          <PrimaryButton disabled={!canNext} onClick={onNext}>{t("common.next")}</PrimaryButton>
        </div>
      )}
    </div>
  );
}

function AgeWheel({ value, onChange, unit, labelledBy }: { value: number; onChange: (n: number) => void; unit: string; labelledBy: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const ITEM = 52;
  const ages = useMemo(() => Array.from({ length: 83 }, (_, i) => 18 + i), []);
  useEffect(() => { ref.current?.scrollTo({ top: (value - 18) * ITEM }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const timer = useRef<number | null>(null);
  return (
    <div className="relative mx-auto w-48">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-[52px] -translate-y-1/2 rounded-xl border border-secondary bg-secondary/10" />
      <div ref={ref} role="listbox" tabIndex={0} aria-labelledby={labelledBy} aria-activedescendant={`age-${value}`}
        className="h-[260px] snap-y snap-mandatory overflow-y-auto py-[104px] focus-visible:outline-2 focus-visible:outline-lumi [scrollbar-width:none]"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (timer.current) clearTimeout(timer.current);
          timer.current = window.setTimeout(() => onChange(Math.min(100, Math.max(18, 18 + Math.round(el.scrollTop / ITEM)))), 80);
        }}
        onKeyDown={(e) => {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          e.preventDefault();
          const n = Math.min(100, Math.max(18, value + (e.key === "ArrowDown" ? 1 : -1)));
          onChange(n); ref.current?.scrollTo({ top: (n - 18) * ITEM, behavior: "smooth" });
        }}>
        {ages.map((a) => (
          <div key={a} id={`age-${a}`} role="option" aria-selected={a === value} onClick={() => { onChange(a); ref.current?.scrollTo({ top: (a - 18) * ITEM, behavior: "smooth" }); }}
            className={`flex h-[52px] snap-center items-center justify-center font-display text-2xl ${a === value ? "text-foreground" : "text-muted-foreground/50"}`}>
            {a} {a === value && <span className="ml-2 font-sans text-sm text-muted-foreground">{unit}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

