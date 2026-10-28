import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Card } from "./Common";
import { useI18n } from "@/i18n";
import { localDateString } from "@/lib/domain";
import { JOURNEY_KEYS, JOURNEY_STARTS, dailyTipIndex, journeyIndexForDays, journeyProgress } from "@/lib/journey";

const doneKey = (d: string) => `hold_task_done_${d}`;

/**
 * Home card "Progression des phases": the six journey phases as a segmented bar (done, current filling up, to come),
 * the current phase with its day range and what it can feel like, and one small task for today taken from it.
 */
export function PhaseCard({ days }: { days: number }) {
  const { t, tl } = useI18n();
  const today = localDateString();
  const index = journeyIndexForDays(days);
  const key = JOURNEY_KEYS[index]!;
  const start = JOURNEY_STARTS[index]!;
  const next = JOURNEY_STARTS[index + 1];
  const tips = tl<string[]>(`journey.stages.${key}.tips`);
  const tip = tips[dailyTipIndex(days, tips.length)] ?? "";
  const [done, setDone] = useState(false);
  useEffect(() => { try { setDone(localStorage.getItem(doneKey(today)) === "1"); } catch { /* storage unavailable */ } }, [today]);
  const toggle = () => {
    const value = !done;
    setDone(value);
    try { if (value) localStorage.setItem(doneKey(today), "1"); else localStorage.removeItem(doneKey(today)); } catch { /* ignore */ }
    if (value) toast(t("journey.doneToast"));
  };
  const fill = journeyProgress(days);

  return (
    <Card className="rounded-[28px]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("home.phasesLabel")}</h2>
        <span className="text-sm font-bold text-[#5a55d6]">{t("home.phaseOf", { i: index + 1, n: JOURNEY_KEYS.length })}</span>
      </div>
      <div className="mt-3 grid gap-[3px] overflow-hidden rounded-full" style={{ gridTemplateColumns: `repeat(${JOURNEY_KEYS.length}, 1fr)` }} aria-hidden>
        {JOURNEY_KEYS.map((k, i) => (
          <span key={k} className="h-2 bg-white/55">
            <span className="block h-full bg-[#f4b94e]" style={{ width: i < index ? "100%" : i === index ? `${Math.max(12, Math.round(fill * 100))}%` : "0%" }} />
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-start justify-between gap-3 rounded-[18px] bg-white/50 p-4">
        <div className="min-w-0">
          <p className="font-bold">{t(`journey.stages.${key}.title`)}</p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t(`journey.stages.${key}.feel`)}</p>
        </div>
        <span className="shrink-0 rounded-lg border border-[#2e3865]/20 bg-white/60 px-2 py-1 text-xs font-semibold text-muted-foreground">
          {next === undefined ? t("journey.rangeOpen", { a: start }) : t("journey.range", { a: start, b: next - 1 })}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3 px-1">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("journey.task")}</p>
          <p className={`mt-0.5 text-sm ${done ? "text-muted-foreground line-through" : ""}`}>{tip}</p>
        </div>
        <button type="button" role="checkbox" aria-checked={done} aria-label={done ? t("journey.undo") : t("journey.done")} onClick={toggle}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${done ? "border-primary bg-primary text-primary-foreground" : "border-line bg-white/40"}`}>
          {done && <Check className="h-5 w-5" strokeWidth={3} />}
        </button>
      </div>
      <Link to="/journey" className="mt-1 inline-flex min-h-11 items-center px-1 text-sm font-medium underline underline-offset-4">{t("journey.see")}</Link>
    </Card>
  );
}
