import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Frown, Heart, Meh, Smile, Sparkles, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/hold/AppShell";
import { ChoiceList, PageTitle, PrimaryButton } from "@/components/hold/Common";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { supabase } from "@/integrations/supabase/client";
import { detectCrisis, localDateString } from "@/lib/domain";

export const Route = createFileRoute("/checkin")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Check-in du jour — Hold" },
      { name: "description", content: "30 secondes pour noter ton humeur, ton envie et tes déclencheurs." },
      { property: "og:title", content: "Check-in du jour — Hold" },
      { property: "og:description", content: "30 secondes pour noter ton humeur, ton envie et tes déclencheurs." },
    ],
  }),
  component: () => <AppShell><Checkin /></AppShell>,
});

const TRIGGERS = ["evening", "social_media", "loneliness", "alcohol", "argument", "anniversary", "other"];

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
  const [mood, setMood] = useState(3);
  const [urge, setUrge] = useState(3);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);

  useEffect(() => {
    supabase.from("checkins").select("*").eq("date", today).maybeSingle().then(({ data }) => {
      if (!data) return;
      setMood(data.mood); setUrge(data.urge); setTriggers(data.triggers ?? []); setNote(data.note ?? "");
    });
  }, [today]);

  const save = async () => {
    if (!session) return;
    setSaving(true);
    const { error } = await supabase.from("checkins").upsert({ user_id: session.user.id, date: today, mood, urge, triggers, note: note.slice(0, 500) || null }, { onConflict: "user_id,date" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries();
    toast(t("checkin.saved"));
    if (mood === 1 || detectCrisis(note)) setShowCrisis(true); else navigate({ to: "/" });
  };

  return (
    <div className="mx-auto max-w-[520px]">
      <PageTitle>{t("checkin.title")}</PageTitle>
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
      {showCrisis && (
        <div role="alert" className="mt-6 rounded-[24px] border border-white bg-white/60 p-4">
          <p>{t("crisis.notice")}</p>
          <Link to="/crisis" className="mt-3 inline-flex min-h-11 items-center font-bold text-foreground underline">{t("crisis.see")}</Link>
        </div>
      )}
      <PrimaryButton arrow={false} className="mt-6" onClick={save} disabled={saving}>{t("checkin.save")}</PrimaryButton>
    </div>
  );
}
