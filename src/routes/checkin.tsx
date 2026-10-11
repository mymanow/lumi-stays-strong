import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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

function Scale({ label, id, value, onChange, labels }: { label: string; id: string; value: number; onChange: (n: number) => void; labels: string[] }) {
  return (
    <fieldset className="mb-8">
      <legend id={id} className="mb-3 text-lg font-semibold">{label}</legend>
      <div role="radiogroup" aria-labelledby={id} className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} — ${labels[n - 1]}`} onClick={() => onChange(n)}
            className={`flex min-h-14 flex-col items-center justify-center rounded-2xl border font-display text-xl ${value === n ? "border-secondary bg-secondary/15" : "border-line bg-surface"}`}>
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>{labels[0]}</span><span>{labels[4]}</span></div>
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
      <Scale id="mood" label={t("checkin.mood")} value={mood} onChange={setMood} labels={tl<string[]>("checkin.moodScale")} />
      <Scale id="urge" label={t("checkin.urge")} value={urge} onChange={setUrge} labels={tl<string[]>("checkin.urgeScale")} />
      <h2 id="ctrig" className="mb-3 text-lg font-semibold">{t("checkin.triggers")}</h2>
      <ChoiceList multi labelledBy="ctrig" options={TRIGGERS.map((k) => ({ value: k, label: t(`options.triggers.${k}`) }))} value={triggers} onChange={setTriggers} />
      <label className="mt-8 flex flex-col gap-2">
        <span className="text-lg font-semibold">{t("checkin.note")}</span>
        <textarea value={note} maxLength={500} rows={4} onChange={(e) => setNote(e.target.value)} placeholder={t("checkin.notePh")}
          className="rounded-2xl border border-line bg-surface p-4 text-base placeholder:text-muted-foreground/60" />
        <span className="self-end text-xs text-muted-foreground">{t("checkin.count", { n: note.length })}</span>
      </label>
      {showCrisis && (
        <div role="alert" className="mt-6 rounded-2xl border border-lumi/40 bg-lumi/10 p-4">
          <p>{t("crisis.notice")}</p>
          <Link to="/crisis" className="mt-3 inline-flex min-h-11 items-center font-semibold text-lumi underline">{t("crisis.see")}</Link>
        </div>
      )}
      <PrimaryButton className="mt-6" onClick={save} disabled={saving}>{t("checkin.save")}</PrimaryButton>
    </div>
  );
}
