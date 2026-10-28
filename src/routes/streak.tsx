import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Flame, Heart } from "lucide-react";
import { AppShell } from "@/components/hold/AppShell";
import { BackIcon } from "@/components/hold/Icons";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { supabase } from "@/integrations/supabase/client";
import { localDateString } from "@/lib/domain";

export const Route = createFileRoute("/streak")({
  head: () => ({
    meta: [
      { title: "Série & progrès — Hold" },
      { name: "description", content: "Ta série sans contact et ton calendrier de check-ins." },
      { property: "og:title", content: "Série & progrès — Hold" },
      { property: "og:description", content: "Ta série sans contact et ton calendrier de check-ins." },
    ],
  }),
  component: () => <AppShell><Streak /></AppShell>,
});

/** Days of a month laid out Monday-first, with leading blanks. */
function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  return [...Array.from({ length: lead }, () => null), ...Array.from({ length: count }, (_, i) => new Date(year, month, i + 1))];
}

function Streak() {
  const { t, lang } = useI18n();
  const { profile, session } = useApp();
  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(id); }, []);
  const today = new Date(now);
  const [cursor, setCursor] = useState(() => ({ y: today.getFullYear(), m: today.getMonth() }));

  const since = profile?.last_contact_at ? new Date(profile.last_contact_at) : null;
  const days = since ? Math.max(0, Math.floor((now - since.getTime()) / 86_400_000)) : 0;
  const startDay = since ? localDateString(since) : null;
  const todayKey = localDateString(today);

  const checkins = useQuery({
    queryKey: ["checkin-dates", session?.user.id],
    enabled: !!session,
    queryFn: async () => (await supabase.from("checkins").select("date").order("date", { ascending: false }).limit(400)).data ?? [],
  });
  const done = useMemo(() => new Set((checkins.data ?? []).map((c) => c.date)), [checkins.data]);

  const cells = monthGrid(cursor.y, cursor.m);
  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: "short" }).replace(".", ""));
  const atCurrent = cursor.y === today.getFullYear() && cursor.m === today.getMonth();
  const shift = (d: number) => setCursor(({ y, m }) => { const x = new Date(y, m + d, 1); return { y: x.getFullYear(), m: x.getMonth() }; });

  return (
    <div className="flex flex-col gap-6">
      <header className="relative flex items-center justify-center">
        <Link to="/" aria-label={t("streak.back")} className="absolute left-0 flex h-11 w-11 items-center justify-center rounded-full bg-white/70 text-[#2e3865]"><BackIcon width={20} height={20} /></Link>
        <h1 className="font-display text-xl">{t("streak.title")}</h1>
      </header>

      <section className="flex items-center justify-between gap-4">
        <div>
          <p className="font-display text-[44px] leading-none">{days === 1 ? t("streak.day") : t("streak.days", { n: days })}</p>
          <p className="mt-1 font-medium text-muted-foreground">{t("streak.current")}</p>
        </div>
        <span aria-hidden className="flex h-24 w-24 rotate-[8deg] items-center justify-center rounded-[26px] bg-[linear-gradient(135deg,#c6d0f6_0%,#a99cf2_100%)] shadow-[0_16px_34px_-14px_rgba(99,102,241,0.7)]">
          <Heart className="h-11 w-11 -rotate-[8deg] text-white" strokeWidth={2.4} />
        </span>
      </section>

      <section className="glass rounded-[28px] p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg first-letter:uppercase">{monthLabel}</h2>
          <div className="flex gap-1">
            <button type="button" onClick={() => shift(-1)} aria-label={t("streak.prev")} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/50"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => shift(1)} disabled={atCurrent} aria-label={t("streak.next")} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/50 disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-y-2 text-center" role="grid">
          {weekdays.map((w) => <span key={w} className="pb-2 text-xs font-semibold capitalize text-muted-foreground">{w}</span>)}
          {cells.map((d, i) => {
            if (!d) return <span key={`b${i}`} />;
            const key = localDateString(d);
            const checked = done.has(key);
            const clean = !!startDay && key >= startDay && key <= todayKey;
            const isToday = key === todayKey;
            const label = [d.toLocaleDateString(locale, { day: "numeric", month: "long" }), checked && t("streak.checkin"), clean && t("streak.noContact"), isToday && t("streak.today")].filter(Boolean).join(", ");
            return (
              <span key={key} aria-label={label} className="flex justify-center">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${checked ? "bg-[#f4b94e]/45" : clean ? "bg-white/60" : ""} ${isToday ? "ring-2 ring-[#2e3865]" : ""} ${key > todayKey ? "text-muted-foreground/50" : ""}`}>
                  {checked ? <Flame aria-hidden className="h-4 w-4 text-[#e8893a]" fill="#f4b94e" /> : d.getDate()}
                </span>
              </span>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f4b94e]/45"><Flame className="h-3 w-3 text-[#e8893a]" fill="#f4b94e" /></span>{t("streak.checkin")}</span>
          <span className="flex items-center gap-1.5"><span aria-hidden className="h-5 w-5 rounded-full bg-white/60" />{t("streak.noContact")}</span>
        </div>
      </section>
    </div>
  );
}
