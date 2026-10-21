import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Card } from "./Common";
import { useI18n } from "@/i18n";
import { localDateString } from "@/lib/domain";
import { JOURNEY_KEYS, dailyTipIndex, journeyIndexForDays, journeyProgress } from "@/lib/journey";

const doneKey = (d: string) => `hold_task_done_${d}`;

/** Home card: the phase the user is in, and one small task for today taken from that phase. */
export function DailyTask({ days }: { days: number }) {
  const { t, tl } = useI18n();
  const today = localDateString();
  const key = JOURNEY_KEYS[journeyIndexForDays(days)]!;
  const tips = tl<string[]>(`journey.stages.${key}.tips`);
  const tip = tips[dailyTipIndex(days, tips.length)] ?? "";
  const [done, setDone] = useState(false);
  useEffect(() => { try { setDone(localStorage.getItem(doneKey(today)) === "1"); } catch { /* storage unavailable */ } }, [today]);
  const toggle = () => {
    const next = !done;
    setDone(next);
    try { if (next) localStorage.setItem(doneKey(today), "1"); else localStorage.removeItem(doneKey(today)); } catch { /* ignore */ }
    if (next) toast(t("journey.doneToast"));
  };
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-2xl">{t(`journey.stages.${key}.title`)}</h2>
        <Link to="/journey" className="min-h-11 content-center text-sm font-medium underline underline-offset-4">{t("journey.see")}</Link>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/50" aria-hidden><div className="h-full rounded-full bg-[var(--progress)]" style={{ width: `${Math.round(journeyProgress(days) * 100)}%` }} /></div>
      <p className="mt-4 text-sm font-semibold text-muted-foreground">{t("journey.task")}</p>
      <div className="mt-1 flex items-center gap-3">
        <p className={`flex-1 ${done ? "text-muted-foreground line-through" : ""}`}>{tip}</p>
        <button type="button" role="checkbox" aria-checked={done} aria-label={done ? t("journey.undo") : t("journey.done")} onClick={toggle}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${done ? "border-primary bg-primary text-primary-foreground" : "border-line bg-white/40"}`}>
          {done && <Check className="h-5 w-5" strokeWidth={3} />}
        </button>
      </div>
    </Card>
  );
}
