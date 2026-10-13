import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/hold/AppShell";
import { Card, SosButton } from "@/components/hold/Common";
import { DailyTask } from "@/components/hold/DailyTask";
import { MilestoneBanner } from "@/components/hold/MilestoneBanner";
import { checkMilestone } from "@/lib/milestones";
import { streakStats } from "@/lib/streaks";
import { Lumi } from "@/components/hold/Lumi";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { supabase } from "@/integrations/supabase/client";
import { localDateString, lumiStageForDays, splitDuration, timeOfDay } from "@/lib/domain";
import { MILESTONE_DAYS } from "@/config/app";
import { logEvent } from "@/lib/events";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Hold — tiens bon, sans contact" },
      { name: "description", content: "Compteur sans contact, SOS quand l'envie d'écrire revient, et Lumi pour t'accompagner." },
      { property: "og:title", content: "Hold — tiens bon, sans contact" },
      { property: "og:description", content: "Compteur sans contact, SOS quand l'envie d'écrire revient, et Lumi pour t'accompagner." },
    ],
  }),
  component: () => <AppShell wide><Home /></AppShell>,
});

const TRIGGERS = ["evening", "social_media", "loneliness", "alcohol", "argument", "anniversary", "other"];

/** One digit of the counter: remounts on change so its CSS animation replays. Seconds rise, the rest only fades. */
function Digit({ value, slide = false }: { value: string; slide?: boolean }) {
  return <span key={value} className={slide ? "digit-slide" : "digit-fade"}>{value}</span>;
}
const Pair = ({ n, slide = false }: { n: number; slide?: boolean }) => {
  const s = String(n).padStart(2, "0");
  return <><Digit key={`a${s[0]}`} value={s[0]!} slide={slide} /><Digit key={`b${s[1]}`} value={s[1]!} slide={slide} /></>;
};

function Home() {
  const { t, tl } = useI18n();
  const { profile, updateProfile, session } = useApp();
  const qc = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [celebrate, setCelebrate] = useState<number | null>(null);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const since = profile?.last_contact_at ? new Date(profile.last_contact_at).getTime() : now;
  const seconds = Math.max(0, (now - since) / 1000);
  const parts = splitDuration(seconds);
  const bestSeconds = Math.max(profile?.best_streak_seconds ?? 0, seconds);
  const bestDays = Math.floor(bestSeconds / 86400);
  const stage = lumiStageForDays(bestDays);
  const line = useMemo(() => {
    const lines = tl<Record<string, string[]>>("home.lines")[timeOfDay(new Date().getHours())] ?? [];
    return lines[new Date().getDate() % Math.max(1, lines.length)] ?? "";
  }, [tl]);

  const startKey = profile?.last_contact_at ?? null;
  const wholeDays = parts.d;
  useEffect(() => {
    if (!startKey) return;
    const m = checkMilestone(startKey, wholeDays);
    if (m !== null) setCelebrate(m);
  }, [startKey, wholeDays]);

  const today = localDateString();
  const checkin = useQuery({
    queryKey: ["checkin", today, session?.user.id],
    enabled: !!session,
    queryFn: async () => (await supabase.from("checkins").select("id").eq("date", today).maybeSingle()).data,
  });

  const events = useQuery({
    queryKey: ["events", session?.user.id],
    enabled: !!session,
    queryFn: async () => (await supabase.from("contact_events").select("*").order("occurred_at", { ascending: false }).limit(200)).data ?? [],
  });
  const stats = useMemo(() => streakStats(events.data ?? [], profile?.last_contact_at, profile?.best_streak_seconds ?? 0, now), [events.data, profile?.last_contact_at, profile?.best_streak_seconds, now]);

  const relapse = async () => {
    const prev = Math.floor(seconds);
    const reflection = note.trim().slice(0, 500);
    await logEvent({ type: "relapse", occurred_at: new Date().toISOString(), trigger, previous_streak_seconds: prev, ...(reflection ? { note: reflection } : {}) });
    await updateProfile({ last_contact_at: new Date().toISOString(), best_streak_seconds: Math.max(profile?.best_streak_seconds ?? 0, prev) });
    qc.invalidateQueries({ queryKey: ["events"] });
    setOpen(false); setTrigger(null); setNote(""); setCelebrate(null);
    toast(t("home.together"));
  };

  const R = 120; const C = 2 * Math.PI * R;
  const dayFrac = (seconds % 86400) / 86400;

  return (
    <div className="grid gap-6 md:grid-cols-2 md:gap-8">
      {celebrate !== null && <MilestoneBanner days={celebrate} onClose={() => setCelebrate(null)} />}
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col items-center py-8">
          <p className="text-sm text-muted-foreground">{t("home.since")}</p>
          <div className="relative mt-4 flex h-64 w-64 items-center justify-center">
            <span aria-hidden className="halo pointer-events-none absolute -inset-6 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(139,124,248,0.22) 45%, transparent 72%)" }} />
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 260 260" aria-hidden>
              <circle cx="130" cy="130" r={R} stroke="var(--line)" strokeWidth="8" fill="none" />
              <circle cx="130" cy="130" r={R} stroke="var(--progress)" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - dayFrac)} />
            </svg>
            <div className="relative text-center" aria-live="off">
              <p className="font-display text-7xl leading-none">{parts.d}</p>
              <p className="mt-1 text-muted-foreground">{t("home.units.d")}</p>
              <p aria-hidden className="mt-3 font-display text-lg tabular-nums">
                <Pair n={parts.h} />:<Pair n={parts.m} />:<Pair n={parts.s} slide />
              </p>
              <p className="sr-only">{parts.d} {t("home.units.d")}, {parts.h} {t("home.units.h")}, {parts.m} {t("home.units.m")}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{t("home.best", { n: bestDays })}</p>
          <dl className="mt-5 grid w-full grid-cols-3 gap-2 text-center">
            {([["progress.best", `${Math.floor(stats.bestSeconds / 86400)} ${t("home.units.d")}`], ["progress.attempts", String(stats.attempts)], ["progress.resistances", String(stats.resistances)]] as const).map(([k, v]) => (
              <div key={k} className="rounded-[18px] bg-white/40 px-1 py-2">
                <dd className="font-display text-xl leading-none">{v}</dd>
                <dt className="mt-1 text-xs text-muted-foreground">{t(k)}</dt>
              </div>
            ))}
          </dl>
        </Card>
        <SosButton />
        <button type="button" onClick={() => setOpen(true)} className="min-h-11 self-center font-medium text-foreground underline underline-offset-4">{t("home.relapse")}</button>
      </div>

      <div className="flex flex-col gap-6">
        <Card className="flex items-center gap-4">
          <Lumi size={52} stage={stage} emotion="happy" interactive />
          <p className="font-display text-lg leading-snug">{line}</p>
        </Card>
        <DailyTask days={parts.d} />
        <Card>
          <h2 className="text-2xl">{t("home.checkinTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{checkin.data ? t("home.checkinDone") : "30 s"}</p>
          <Link to="/checkin" className="mt-4 flex min-h-12 items-center justify-center rounded-full bg-white font-bold text-[#2e3865]">
            {checkin.data ? t("home.checkinEdit") : t("home.checkinCta")}
          </Link>
        </Card>
        <Card>
          <h2 className="text-2xl">{t("home.remindersTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("home.remindersSub")}</p>
          <Link to="/reminders" className="mt-4 flex min-h-12 items-center justify-center rounded-full border border-white/80 font-semibold">{t("home.remindersOpen")}</Link>
        </Card>
        <Card>
          <h2 className="mb-4 text-2xl">{t("home.milestones")}</h2>
          <ol className="flex flex-wrap justify-between gap-2">
            {MILESTONE_DAYS.map((d) => {
              const reached = parts.d >= d;
              return (
                <li key={d} className="flex flex-col items-center gap-1">
                  <span aria-hidden className={`h-4 w-4 rounded-full ${reached ? "bg-primary shadow-[0_0_10px_var(--primary)]" : "border border-line"}`} />
                  <span className="text-xs text-muted-foreground">{d}</span>
                  <span className="sr-only">{t("home.milestoneDay", { n: d })} — {reached ? t("home.milestoneReached") : t("home.milestoneNext")}</span>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-[28px] border-white/70 bg-[#e9e6fb] text-[#2e3865]">
          <DialogHeader>
            <div className="mb-2 flex justify-center"><Lumi size={56} stage={stage} emotion="support" /></div>
            <DialogTitle className="font-display text-2xl">{t("home.relapseTitle")}</DialogTitle>
            <DialogDescription className="text-[#3a4474]">{t("home.relapseBody")}</DialogDescription>
          </DialogHeader>
          <p id="rtrig" className="text-sm text-[#3a4474]">{t("home.relapseTrigger")}</p>
          <div role="radiogroup" aria-labelledby="rtrig" className="flex flex-wrap gap-2">
            {TRIGGERS.map((k) => (
              <button key={k} type="button" role="radio" aria-checked={trigger === k} onClick={() => setTrigger(trigger === k ? null : k)}
                className={`min-h-11 rounded-full border px-4 text-sm ${trigger === k ? "border-[#2e3865] bg-[#2e3865] text-white" : "border-[#2e3865]/40"}`}>
                {t(`options.triggers.${k}`)}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-2 text-sm text-[#3a4474]">{t("home.relapseNote")}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder={t("home.relapseNotePh")}
              className="rounded-[18px] border border-[#2e3865]/30 bg-white/70 p-3 text-base text-[#2e3865] placeholder:text-[#3a4474]/60" />
          </label>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setOpen(false)} className="min-h-12 rounded-full border border-[#2e3865]/40 px-5">{t("common.cancel")}</button>
            <button type="button" onClick={relapse} className="min-h-12 rounded-full bg-reset px-5 font-bold text-reset-foreground">{t("home.relapseConfirm")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
