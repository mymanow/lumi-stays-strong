import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/hold/AppShell";
import { Card, SosButton } from "@/components/hold/Common";
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
      { title: "Hold — tiens bon, sans contact" },
      { name: "description", content: "Compteur sans contact, SOS quand l'envie d'écrire revient, et Lumi pour t'accompagner." },
      { property: "og:title", content: "Hold — tiens bon, sans contact" },
      { property: "og:description", content: "Compteur sans contact, SOS quand l'envie d'écrire revient, et Lumi pour t'accompagner." },
    ],
  }),
  component: () => <AppShell wide><Home /></AppShell>,
});

const TRIGGERS = ["evening", "social_media", "loneliness", "alcohol", "argument", "anniversary", "other"];

function Home() {
  const { t, tl } = useI18n();
  const { profile, updateProfile, session } = useApp();
  const qc = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<string | null>(null);
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

  const today = localDateString();
  const checkin = useQuery({
    queryKey: ["checkin", today, session?.user.id],
    enabled: !!session,
    queryFn: async () => (await supabase.from("checkins").select("id").eq("date", today).maybeSingle()).data,
  });

  const relapse = async () => {
    const prev = Math.floor(seconds);
    await logEvent({ type: "relapse", occurred_at: new Date().toISOString(), trigger, previous_streak_seconds: prev });
    await updateProfile({ last_contact_at: new Date().toISOString(), best_streak_seconds: Math.max(profile?.best_streak_seconds ?? 0, prev) });
    qc.invalidateQueries({ queryKey: ["events"] });
    setOpen(false); setTrigger(null);
    toast(t("home.together"));
  };

  const R = 120; const C = 2 * Math.PI * R;
  const dayFrac = (seconds % 86400) / 86400;

  return (
    <div className="grid gap-6 md:grid-cols-2 md:gap-8">
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col items-center py-8">
          <p className="text-sm text-muted-foreground">{t("home.since")}</p>
          <div className="relative mt-4 flex h-64 w-64 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 260 260" aria-hidden>
              <circle cx="130" cy="130" r={R} stroke="var(--line)" strokeWidth="6" fill="none" />
              <circle cx="130" cy="130" r={R} stroke="var(--secondary)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - dayFrac)} />
            </svg>
            <div className="text-center" aria-live="off">
              <p className="font-display text-7xl leading-none">{parts.d}</p>
              <p className="mt-1 text-muted-foreground">{t("home.units.d")}</p>
              <p className="mt-3 font-display text-lg tabular-nums">
                {String(parts.h).padStart(2, "0")}:{String(parts.m).padStart(2, "0")}:{String(parts.s).padStart(2, "0")}
              </p>
              <p className="sr-only">{parts.d} {t("home.units.d")}, {parts.h} {t("home.units.h")}, {parts.m} {t("home.units.m")}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{t("home.best", { n: bestDays })}</p>
        </Card>
        <SosButton />
        <button type="button" onClick={() => setOpen(true)} className="min-h-11 self-center text-reset underline-offset-4 hover:underline">{t("home.relapse")}</button>
      </div>

      <div className="flex flex-col gap-6">
        <Card className="flex items-center gap-4">
          <Lumi size={44} stage={stage} />
          <p className="font-display text-lg leading-snug">{line}</p>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold">{t("home.checkinTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{checkin.data ? t("home.checkinDone") : "30 s"}</p>
          <Link to="/checkin" className="mt-4 flex min-h-12 items-center justify-center rounded-2xl border border-secondary/50 font-medium text-secondary">
            {checkin.data ? t("home.checkinEdit") : t("home.checkinCta")}
          </Link>
        </Card>
        <Card>
          <h2 className="mb-4 text-xl font-semibold">{t("home.milestones")}</h2>
          <ol className="flex flex-wrap justify-between gap-2">
            {MILESTONE_DAYS.map((d) => {
              const reached = parts.d >= d;
              return (
                <li key={d} className="flex flex-col items-center gap-1">
                  <span aria-hidden className={`h-4 w-4 rounded-full ${reached ? "bg-secondary shadow-[0_0_10px_var(--secondary)]" : "border border-line"}`} />
                  <span className="text-xs text-muted-foreground">{d}</span>
                  <span className="sr-only">{t("home.milestoneDay", { n: d })} — {reached ? t("home.milestoneReached") : t("home.milestoneNext")}</span>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl border-line bg-surface">
          <DialogHeader>
            <div className="mb-2 flex justify-center"><Lumi size={50} stage={stage} /></div>
            <DialogTitle className="font-display text-2xl">{t("home.relapseTitle")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">{t("home.relapseBody")}</DialogDescription>
          </DialogHeader>
          <p id="rtrig" className="text-sm text-muted-foreground">{t("home.relapseTrigger")}</p>
          <div role="radiogroup" aria-labelledby="rtrig" className="flex flex-wrap gap-2">
            {TRIGGERS.map((k) => (
              <button key={k} type="button" role="radio" aria-checked={trigger === k} onClick={() => setTrigger(trigger === k ? null : k)}
                className={`min-h-11 rounded-full border px-4 text-sm ${trigger === k ? "border-secondary bg-secondary/15" : "border-line"}`}>
                {t(`options.triggers.${k}`)}
              </button>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setOpen(false)} className="min-h-12 rounded-2xl border border-line px-5">{t("common.cancel")}</button>
            <button type="button" onClick={relapse} className="min-h-12 rounded-2xl bg-reset px-5 font-semibold text-reset-foreground">{t("home.relapseConfirm")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
