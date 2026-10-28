import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Flame, Info, Pencil } from "lucide-react";
import { AppShell } from "@/components/hold/AppShell";
import { Card } from "@/components/hold/Common";
import { PhaseCard } from "@/components/hold/PhaseCard";
import { MilestoneBanner } from "@/components/hold/MilestoneBanner";
import { NoContactEditor } from "@/components/hold/NoContactEditor";
import { ReminderControl } from "@/components/hold/ReminderControl";
import { checkMilestone } from "@/lib/milestones";
import { Lumi } from "@/components/hold/Lumi";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { supabase } from "@/integrations/supabase/client";
import { localDateString, lumiStageForDays, splitDuration, timeOfDay } from "@/lib/domain";
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

/** Small uppercase label at the top of a home card, as in the mock-up. */
const Label = ({ children }: { children: React.ReactNode }) => <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{children}</h2>;

function Home() {
  const { t, tl } = useI18n();
  const { profile, updateProfile, session } = useApp();
  const qc = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [trigger, setTrigger] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [celebrate, setCelebrate] = useState<number | null>(null);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const since = profile?.last_contact_at ? new Date(profile.last_contact_at).getTime() : now;
  const seconds = Math.max(0, (now - since) / 1000);
  const parts = splitDuration(seconds);
  const bestSeconds = Math.max(profile?.best_streak_seconds ?? 0, seconds);
  const stage = lumiStageForDays(Math.floor(bestSeconds / 86400));
  const hour = new Date(now).getHours();
  const line = useMemo(() => {
    const lines = tl<Record<string, string[]>>("home.lines")[timeOfDay(hour)] ?? [];
    return lines[new Date().getDate() % Math.max(1, lines.length)] ?? "";
  }, [tl, hour]);
  const hello = t(`home.greet.${timeOfDay(hour)}`);
  const name = profile?.name?.trim();

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


  const relapse = async () => {
    const prev = Math.floor(seconds);
    const reflection = note.trim().slice(0, 500);
    await logEvent({ type: "relapse", occurred_at: new Date().toISOString(), trigger, previous_streak_seconds: prev, ...(reflection ? { note: reflection } : {}) });
    await updateProfile({ last_contact_at: new Date().toISOString(), best_streak_seconds: Math.max(profile?.best_streak_seconds ?? 0, prev) });
    qc.invalidateQueries({ queryKey: ["events"] });
    setOpen(false); setTrigger(null); setNote(""); setCelebrate(null);
    toast(t("home.together"));
  };

  const reminder = { enabled: !!profile?.reminder_enabled, time: profile?.reminder_time?.slice(0, 5) ?? "21:30" };
  const reasons = (profile?.reasons ?? []).filter((r) => r.trim());
  const streakTitle = parts.d === 0 ? t("home.streakZero") : parts.d === 1 ? t("home.streakDay") : t("home.streakDays", { n: parts.d });

  return (
    <div className="flex flex-col gap-5">
      {celebrate !== null && <MilestoneBanner days={celebrate} onClose={() => setCelebrate(null)} />}

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[34px] leading-tight">{name ? t("home.greetName", { hello, name }) : hello}</h1>
          <p className="mt-1 text-muted-foreground">{line}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link to="/streak" className="flex min-h-11 items-center gap-1 rounded-full bg-white/70 px-3 text-sm font-bold text-[#2e3865] active:scale-95" aria-label={t("home.streakBadge", { n: parts.d })}>
            <Flame aria-hidden className="h-4 w-4 text-[#e8893a]" fill="#f4b94e" strokeWidth={2} />{parts.d}
          </Link>
          <Lumi size={40} stage={stage} emotion="happy" interactive />
        </div>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-5">
          {/* Streak card (mock-up shape): centred, icon badge, big title, white check-in pill, reminder link. */}
          <section className="glass relative overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.62)_0%,rgba(255,255,255,0.4)_55%,rgba(244,185,78,0.22)_100%)] px-5 pb-5 pt-6 text-center">
            <button type="button" onClick={() => setEditOpen(true)} aria-label={t("home.editOpen")} className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-white/40">
              <Info className="h-5 w-5" aria-hidden />
            </button>
            <Label>{t("home.streakLabel")}</Label>
            <span aria-hidden className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#2e3865] text-white shadow-[0_10px_24px_-10px_rgba(46,56,101,0.8)]">
              <Flame className="h-6 w-6" fill="#f4b94e" stroke="#f4b94e" />
            </span>
            <p className="mt-4 font-display text-[32px] leading-tight">{streakTitle}</p>
            <p className="mt-1 text-muted-foreground">{t("home.streakSub")}</p>
            <Link to="/checkin" className="relative mx-auto mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-bold text-[#2e3865] shadow-[0_10px_24px_-12px_rgba(46,56,101,0.55)]">
              {t("home.checkinShort")}
              {checkin.isSuccess && !checkin.data && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e5566b] px-1 text-[11px] font-bold text-white" aria-label={t("home.checkinPending")}>1</span>
              )}
            </Link>
            <button type="button" onClick={() => setReminderOpen(true)} className="mx-auto mt-1 flex min-h-11 items-center gap-1.5 px-3 text-sm text-muted-foreground">
              <Bell aria-hidden className="h-3.5 w-3.5" />{reminder.enabled ? t("home.reminderAt", { time: reminder.time }) : t("home.reminderShort")}
            </button>
          </section>

          {/* Counter card (mock-up shape): dark card, the time inside a big white circle, two pills underneath. */}
          <section className="rounded-[28px] bg-[linear-gradient(180deg,#4b4f97_0%,#3d4388_45%,#2e3865_100%)] px-5 pb-6 pt-6 text-center text-white shadow-[0_18px_40px_-18px_rgba(46,56,101,0.9)]">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-white/70">{t("home.counterLabel")}</h2>
            <p className="mx-auto mt-2 max-w-[260px] font-display text-[26px] leading-tight">{t("home.counterSub")}</p>
            <div className="mx-auto mt-6 flex h-[208px] w-[208px] flex-col items-center justify-center rounded-full bg-white text-[#2e3865] shadow-[0_20px_44px_-16px_rgba(0,0,0,0.55)]" aria-live="off">
              <p className="font-display text-[56px] leading-none">{parts.d}</p>
              <p className="mt-1 text-sm text-[#3a4474]">{parts.d === 1 ? t("home.unitDay") : t("home.units.d")}</p>
              <p aria-hidden className="mt-2 font-display text-[22px] leading-none tabular-nums">
                <Pair n={parts.h} />:<Pair n={parts.m} />:<Pair n={parts.s} slide />
              </p>
              <p className="sr-only">{parts.d} {t("home.units.d")}, {parts.h} {t("home.units.h")}, {parts.m} {t("home.units.m")}</p>
            </div>
            <div className="mt-6 flex justify-center gap-2.5">
              <Link to="/history" className="flex min-h-11 items-center whitespace-nowrap rounded-full bg-[#232a52] px-4 text-[13px] font-semibold">{t("home.journal")}</Link>
              <button type="button" onClick={() => setOpen(true)} className="flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#e5566b] px-4 text-[13px] font-semibold">
                {t("home.relapse")}<span aria-hidden className="h-2 w-2 rounded-full bg-white/80" />
              </button>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <PhaseCard days={parts.d} />

          <Card className="rounded-[28px]">
            <div className="flex items-center justify-between">
              <Label>{t("home.reasonsLabel")}</Label>
              <button type="button" onClick={() => setEditOpen(true)} className="-my-2 flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-[#5a55d6]">
                <Pencil aria-hidden className="h-3.5 w-3.5" />{t("home.reasonsEdit")}
              </button>
            </div>
            {reasons.length === 0 ? (
              <p className="mt-3 rounded-[18px] bg-white/45 p-4 text-sm text-muted-foreground">{t("home.reasonsEmpty")}</p>
            ) : (
              <ol className="mt-3 flex flex-col gap-2.5">
                {reasons.map((r, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-[18px] bg-white/50 px-3.5 py-3.5">
                    <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#6366F1]/15 text-xs font-bold text-[#5a55d6]">{i + 1}</span>
                    <span className="break-words text-[15px] font-medium">{r}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card>
            <h2 className="text-2xl">{t("home.remindersTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("home.remindersSub")}</p>
            <Link to="/reminders" className="mt-4 flex min-h-12 items-center justify-center rounded-full border border-white/80 font-semibold">{t("home.remindersOpen")}</Link>
          </Card>
        </div>
      </div>

      <NoContactEditor open={editOpen} onOpenChange={setEditOpen} />

      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="rounded-[28px] border-white/70 bg-[#e9e6fb] text-[#2e3865]">
          <DialogHeader>
            <DialogTitle className="sr-only">{t("home.reminderShort")}</DialogTitle>
            <DialogDescription className="sr-only">{t("plan.reminderSub")}</DialogDescription>
          </DialogHeader>
          <ReminderControl value={reminder} onChange={(v) => void updateProfile({ reminder_enabled: v.enabled, reminder_time: v.time })} />
        </DialogContent>
      </Dialog>

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
