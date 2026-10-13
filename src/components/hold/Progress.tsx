import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card } from "./Common";
import { useI18n } from "@/i18n";
import { chartSeries, topTriggers, weekSummary, type CheckinRow, type Trend } from "@/lib/insights";
import { streakStats, type StreakEvent } from "@/lib/streaks";

const MOOD = "#5252C9";
const URGE = "#C2570C";
const INK = "#3a4474";
const RANGES = [7, 30, 90] as const;

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center rounded-[20px] bg-white/40 px-2 py-3 text-center">
      <span className="font-display text-3xl leading-none">{value}</span>
      <span className="mt-1 text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function ProgressTab({ checkins, events, lastContactAt, bestSeconds }: {
  checkins: (CheckinRow & { id?: string })[]; events: (StreakEvent & { trigger: string | null })[]; lastContactAt: string | null; bestSeconds: number;
}) {
  const { t, lang } = useI18n();
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const stats = useMemo(() => streakStats(events, lastContactAt, bestSeconds), [events, lastContactAt, bestSeconds]);
  const series = useMemo(() => chartSeries(checkins, range), [checkins, range]);
  const week = useMemo(() => weekSummary(checkins), [checkins]);
  const triggers = useMemo(() => topTriggers(checkins, events), [checkins, events]);
  const days = (s: number) => Math.floor(s / 86400);
  const fmtDay = (d: string) => new Date(d + "T12:00:00").toLocaleDateString(lang, { day: "numeric", month: "short" });
  const pastData = stats.past.slice(0, 8).reverse().map((p) => ({ label: fmtDay(p.endedAt.slice(0, 10)), days: days(p.seconds) }));
  const trendText = (tr: Trend | null) => (tr ? t(tr === "up" ? "progress.trendUp" : tr === "down" ? "progress.trendDown" : "progress.trendFlat") : "");
  const hasData = checkins.length > 0;
  const maxTrigger = Math.max(1, ...triggers.map((x) => x.count));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="mb-4 text-2xl">{t("progress.streak")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t("progress.current")} value={t("progress.pastDays", { n: days(stats.currentSeconds) })} />
          <Stat label={t("progress.best")} value={t("progress.pastDays", { n: days(stats.bestSeconds) })} />
          <Stat label={t("progress.attempts")} value={stats.attempts} />
          <Stat label={t("progress.resistances")} value={stats.resistances} />
        </div>
        <h3 className="mb-2 mt-6 text-lg font-semibold">{t("progress.pastTitle")}</h3>
        {pastData.length === 0 ? <p className="text-sm text-muted-foreground">{t("progress.pastEmpty")}</p> : (
          <div className="h-44" role="img" aria-label={t("progress.pastTitle") + ": " + pastData.map((p) => `${p.label} ${t("progress.pastDays", { n: p.days })}`).join(", ")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pastData} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
                <CartesianGrid vertical={false} stroke="rgba(46,56,101,0.12)" />
                <XAxis dataKey="label" tick={{ fill: INK, fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: INK, fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => t("progress.pastDays", { n: Number(v) })} />
                <Bar dataKey="days" fill={MOOD} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl">{t("progress.moodUrge")}</h2>
          <div role="radiogroup" aria-label={t("progress.moodUrge")} className="glass inline-flex rounded-full p-1">
            {RANGES.map((r) => (
              <button key={r} type="button" role="radio" aria-checked={range === r} onClick={() => setRange(r)}
                className={`min-h-9 rounded-full px-3 text-sm ${range === r ? "bg-white text-[#2e3865]" : "text-muted-foreground"}`}>{t(`progress.ranges.${r}`)}</button>
            ))}
          </div>
        </div>
        {!hasData ? <p className="text-muted-foreground">{t("progress.empty")}</p> : (
          <>
            <div className="h-56" role="img" aria-label={t("progress.moodUrge")}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                  <CartesianGrid vertical={false} stroke="rgba(46,56,101,0.12)" />
                  <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fill: INK, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: INK, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip labelFormatter={(d) => fmtDay(String(d))} />
                  <Line name={t("progress.mood")} type="monotone" dataKey="mood" stroke={MOOD} strokeWidth={3} dot={range <= 30} connectNulls isAnimationActive={false} />
                  <Line name={t("progress.urge")} type="monotone" dataKey="urge" stroke={URGE} strokeWidth={3} strokeDasharray="6 4" dot={range <= 30} connectNulls isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 text-sm">
              <span className="flex items-center gap-2"><span aria-hidden className="h-1 w-5 rounded" style={{ background: MOOD }} />{t("progress.mood")}</span>
              <span className="flex items-center gap-2"><span aria-hidden className="h-1 w-5 rounded border-t-2 border-dashed" style={{ borderColor: URGE }} />{t("progress.urge")}</span>
            </div>
          </>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-2xl">{t("progress.week")}</h2>
        {week.mood === null ? <p className="text-muted-foreground">{t("progress.weekEmpty")}</p> : (
          <ul className="flex flex-col gap-2">
            <li>{t("progress.avgMood", { n: week.mood.toFixed(1) })}{week.moodTrend && <span className="text-muted-foreground"> — {trendText(week.moodTrend)}</span>}</li>
            {week.urge !== null && <li>{t("progress.avgUrge", { n: week.urge.toFixed(1) })}{week.urgeTrend && <span className="text-muted-foreground"> — {trendText(week.urgeTrend)}</span>}</li>}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-2xl">{t("progress.triggers")}</h2>
        {triggers.length === 0 ? <p className="text-muted-foreground">{t("progress.triggersEmpty")}</p> : (
          <ul className="flex flex-col gap-3">
            {triggers.map((x) => (
              <li key={x.key}>
                <div className="flex justify-between text-sm"><span>{t(`options.triggers.${x.key}`)}</span><span className="text-muted-foreground">{x.count}</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/50" aria-hidden><div className="h-full rounded-full" style={{ width: `${(x.count / maxTrigger) * 100}%`, background: MOOD }} /></div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-center text-sm text-muted-foreground">{t("progress.note")}</p>
    </div>
  );
}
