import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Frown, Heart, Meh, Smile, Sparkles, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/hold/AppShell";
import { ChoiceList, PrimaryButton } from "@/components/hold/Common";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { db } from "@/lib/db";
import { detectCrisis, localDateString } from "@/lib/domain";
import { Lumi } from "@/components/hold/Lumi";

export const Route = createFileRoute("/checkin")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Check-in du jour — Hold" },
      { name: "description", content: "Ton check-in en 4 étapes : émotions, relation, corps, puis humeur et envie d'écrire." },
      { property: "og:title", content: "Check-in du jour — Hold" },
      { property: "og:description", content: "Ton check-in en 4 étapes : émotions, relation, corps, puis humeur et envie d'écrire." },
    ],
  }),
  component: () => <AppShell><Checkin /></AppShell>,
});

const TRIGGERS = ["evening", "social_media", "loneliness", "alcohol", "argument", "anniversary", "other"];

/** É-R-P check-in: three multi-choice steps (keys saved in checkins.emotions / relational / physical), then mood and urge. */
const EMOTIONS = ["sad", "anxious", "angry", "lonely", "nostalgic", "lost", "relieved", "calm"] as const;
const RELATIONAL = ["thought_of_them", "checked_profile", "they_contacted", "wanted_to_write", "talked_to_someone", "saw_people"] as const;
const PHYSICAL = ["slept_well", "slept_badly", "tired", "no_appetite", "knot", "moved"] as const;
const STEPS = ["e", "r", "p", "last"] as const;

function Chips({ id, group, options, value, onChange }: { id: string; group: "emotions" | "relational" | "physical"; options: readonly string[]; value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useI18n();
  return (
    <div role="group" aria-labelledby={id} className="cascade flex flex-wrap gap-2.5">
      {options.map((k) => {
        const on = value.includes(k);
        return (
          <button key={k} type="button" role="checkbox" aria-checked={on} onClick={() => onChange(on ? value.filter((v) => v !== k) : [...value, k])}
            className="choice min-h-12 rounded-full px-4 text-[15px] font-medium transition-transform active:scale-95">{t(`checkin.${group}.${k}`)}</button>
        );
      })}
    </div>
  );
}

const MOOD_ICONS: { Icon: LucideIcon; color: string }[] = [
  { Icon: Frown, color: "#C0443B" },
  { Icon: Meh, color: "#B83C7A" },
  { Icon: Smile, color: "#5252C9" },
  { Icon: Heart, color: "#7440D1" },
  { Icon: Sparkles, color: "#0B7F70" },
];

/** Signal-bar style intensity icon: n of 5 bars filled, darker as intensity rises. */
function Bars({ n }: { n: number }) {
  const shades = ["#8F95F0", "#7F7FE8", "#6C63DE", "#5A4BCF", "#4733B8"];
  return (
    <svg aria-hidden viewBox="0 0 28 28" className="h-7 w-7" fill="none">
      {[0, 1, 2, 3, 4].map((i) => {
        const h = 6 + i * 4.5;
        const on = i < n;
        return <rect key={i} x={1.5 + i * 5.2} y={26 - h} width="3.6" height={h} rx="1.8" fill={on ? shades[n - 1] : "#2e3865"} fillOpacity={on ? 1 : 0.18} />;
      })}
    </svg>
  );
}

function Scale({ label, id, value, onChange, labels, icons, bars }: { label: string; id: string; value: number; onChange: (n: number) => void; labels: string[]; icons?: typeof MOOD_ICONS; bars?: boolean }) {
  return (
    <fieldset className="mb-8">
      <legend id={id} className="mb-3 text-lg font-semibold">{label}</legend>
      <div role="radiogroup" aria-labelledby={id} className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          const ic = icons?.[n - 1];
          const rich = !!ic || !!bars;
          return (
            <button key={n} type="button" role="radio" aria-checked={selected} aria-label={`${n} — ${labels[n - 1]}`} onClick={() => onChange(n)}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-[24px] border transition-transform active:scale-95 ${rich ? "min-h-[92px] px-1 py-3" : "min-h-14 font-display text-xl"} ${selected ? "border-white bg-white text-[#2e3865] shadow-[0_8px_22px_-8px_rgba(46,56,101,0.5)]" : "glass"}`}>
              {rich ? (
                <>
                  {ic ? <ic.Icon aria-hidden className={`h-7 w-7 transition-transform ${selected ? "scale-110" : ""}`} style={{ color: ic.color }} strokeWidth={2.25} /> : <Bars n={n} />}
                  <span className="text-[11px] font-semibold leading-tight sm:text-xs">{labels[n - 1]}</span>
                </>
              ) : n}
            </button>
          );
        })}
      </div>
      {!icons && !bars && <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>{labels[0]}</span><span>{labels[4]}</span></div>}
    </fieldset>
  );
}

function Checkin() {
  const { t, tl } = useI18n();
  const { session } = useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const today = localDateString();
  const [step, setStep] = useState(0);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [relational, setRelational] = useState<string[]>([]);
  const [physical, setPhysical] = useState<string[]>([]);
  const [mood, setMood] = useState(3);
  const [urge, setUrge] = useState(3);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [glad, setGlad] = useState(false);

  useEffect(() => {
    db.from("checkins").select("*").eq("date", today).maybeSingle().then(({ data }) => {
      if (!data) return;
      setMood(data.mood); setUrge(data.urge); setTriggers(data.triggers ?? []); setNote(data.note ?? "");
      setEmotions(data.emotions ?? []); setRelational(data.relational ?? []); setPhysical(data.physical ?? []);
    });
  }, [today]);

  const save = async () => {
    if (!session) return;
    setSaving(true);
    const { error } = await db.from("checkins").upsert({ user_id: session.user.id, date: today, mood, urge, triggers, emotions, relational, physical, note: note.slice(0, 500) || null }, { onConflict: "user_id,date" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries();
    toast(t("checkin.saved"));
    if (mood === 1 || detectCrisis(note)) { setShowCrisis(true); return; }
    // A small spark travels to Lumi, then we go home. With reduced motion we go straight away.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { navigate({ to: "/" }); return; }
    setThanks(true);
    window.setTimeout(() => setGlad(true), 650);
    window.setTimeout(() => navigate({ to: "/" }), 1600);
  };

  const key = STEPS[step]!;
  const go = (n: number) => { setStep(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className="mx-auto max-w-[520px]">
      <p className="text-sm font-semibold text-muted-foreground">{t("checkin.title")} · {t("checkin.stepOf", { i: step + 1, n: STEPS.length })}</p>
      <div className="mt-2 grid grid-cols-4 gap-1.5" aria-hidden>
        {STEPS.map((k, i) => <span key={k} className={`h-1.5 rounded-full ${i <= step ? "bg-[var(--progress)]" : "bg-white/50"}`} />)}
      </div>
      <div key={key} className="fade-up mt-6">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{t(`checkin.steps.${key}.tag`)}</p>
        <h1 id={`q-${key}`} className="mt-1 text-[30px] leading-tight">{t(`checkin.steps.${key}.q`)}</h1>
        {key !== "last" && <p className="mb-5 mt-1 text-sm text-muted-foreground">{t("checkin.multi")}</p>}
        {key === "e" && <Chips id="q-e" group="emotions" options={EMOTIONS} value={emotions} onChange={setEmotions} />}
        {key === "r" && <Chips id="q-r" group="relational" options={RELATIONAL} value={relational} onChange={setRelational} />}
        {key === "p" && <Chips id="q-p" group="physical" options={PHYSICAL} value={physical} onChange={setPhysical} />}
        {key === "last" && (
          <div className="mt-6">
            <Scale id="mood" label={t("checkin.mood")} value={mood} onChange={setMood} labels={tl<string[]>("checkin.moodScale")} icons={MOOD_ICONS} />
            <Scale id="urge" label={t("checkin.urge")} value={urge} onChange={setUrge} labels={tl<string[]>("checkin.urgeScale")} bars />
            <h2 id="ctrig" className="mb-3 text-lg font-semibold">{t("checkin.triggers")}</h2>
            <ChoiceList multi labelledBy="ctrig" options={TRIGGERS.map((k) => ({ value: k, label: t(`options.triggers.${k}`) }))} value={triggers} onChange={setTriggers} />
            <label className="mt-8 flex flex-col gap-2">
              <span className="text-lg font-semibold">{t("checkin.note")}</span>
              <textarea value={note} maxLength={500} rows={4} onChange={(e) => setNote(e.target.value)} placeholder={t("checkin.notePh")}
                className="glass rounded-[24px] p-4 text-base placeholder:text-muted-foreground/60" />
              <span className="self-end text-xs text-muted-foreground">{t("checkin.count", { n: note.length })}</span>
            </label>
          </div>
        )}
      </div>
      {showCrisis && (
        <div role="alert" className="mt-6 rounded-[24px] border border-white bg-white/60 p-4">
          <p>{t("crisis.notice")}</p>
          <Link to="/crisis" className="mt-3 inline-flex min-h-11 items-center font-bold text-foreground underline">{t("crisis.see")}</Link>
        </div>
      )}
      <div className="mt-8 flex flex-col gap-3">
        {key === "last"
          ? <PrimaryButton arrow={false} onClick={save} disabled={saving || thanks}>{t("checkin.save")}</PrimaryButton>
          : <PrimaryButton onClick={() => go(step + 1)}>{t("checkin.next")}</PrimaryButton>}
        {step > 0 && <button type="button" onClick={() => go(step - 1)} className="min-h-11 font-medium underline-offset-4 hover:underline">{t("checkin.back")}</button>}
      </div>
      {thanks && (
        <div role="status" className="sos-enter fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-[rgba(46,56,101,0.35)] backdrop-blur-sm">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <span aria-hidden className="spark-fly absolute bottom-0 h-3 w-3 rounded-full bg-[#f4b94e] shadow-[0_0_18px_6px_rgba(244,185,78,0.7)]" />
            <Lumi size={72} stage={2} emotion={glad ? "happy" : "neutral"} scale={glad ? 1.15 : 1} transitionMs={500} />
          </div>
          <p className="font-display text-2xl text-white">{t("checkin.thanks")}</p>
        </div>
      )}
    </div>
  );
}
