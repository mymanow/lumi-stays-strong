import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { notifySupport, requestNotifyPermission } from "@/lib/notify";

/**
 * Daily reminder. It is shown as a notification while the app is open (or installed and running);
 * there is no push server yet, so it cannot wake a closed app. The copy says so.
 */
export function ReminderControl({ value, onChange }: { value: { enabled: boolean; time: string }; onChange: (v: { enabled: boolean; time: string }) => void }) {
  const { t } = useI18n();
  const [problem, setProblem] = useState<"denied" | "unsupported" | null>(null);
  useEffect(() => { const s = notifySupport(); if (s === "unsupported") setProblem("unsupported"); }, []);

  const toggle = async () => {
    if (value.enabled) { onChange({ ...value, enabled: false }); return; }
    const result = await requestNotifyPermission();
    if (result === "granted") { setProblem(null); onChange({ ...value, enabled: true }); }
    else setProblem(result === "unsupported" ? "unsupported" : "denied");
  };

  return (
    <div className="glass rounded-[24px] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p id="rem-label" className="font-medium">{t("plan.reminder")}</p>
          <p className="text-sm text-muted-foreground">{t("plan.reminderSub")}</p>
        </div>
        <button type="button" role="switch" aria-checked={value.enabled} aria-labelledby="rem-label" onClick={toggle} disabled={problem === "unsupported"}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 ${value.enabled ? "bg-primary" : "bg-line"}`}>
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${value.enabled ? "left-7" : "left-1"}`} />
        </button>
      </div>
      <label className="mt-3 flex items-center justify-between text-sm text-muted-foreground">{t("plan.reminderTime")}
        <input type="time" value={value.time} onChange={(e) => onChange({ ...value, time: e.target.value })}
          className="glass min-h-11 rounded-full px-3 text-foreground [color-scheme:light]" />
      </label>
      {problem && <p role="alert" className="mt-3 text-sm font-medium">{t(problem === "denied" ? "plan.denied" : "plan.unsupported")}</p>}
      <p className="mt-3 text-xs text-muted-foreground">{t("plan.note")}</p>
    </div>
  );
}
