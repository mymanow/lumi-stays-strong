import { useI18n } from "@/i18n";

export function ReminderControl({ value, onChange }: { value: { enabled: boolean; time: string }; onChange: (v: { enabled: boolean; time: string }) => void }) {
  const { t } = useI18n();
  // Web push needs a push backend not included in this version: toggle is shown disabled.
  return (
    <div className="glass rounded-[24px] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p id="rem-label" className="font-medium">{t("plan.reminder")}</p>
          <p className="text-sm text-muted-foreground">{t("plan.reminderSub")} · {t("plan.soon")}</p>
        </div>
        <button type="button" role="switch" aria-checked={false} aria-labelledby="rem-label" disabled aria-disabled
          className="relative h-8 w-14 shrink-0 rounded-full bg-line opacity-60">
          <span className="absolute left-1 top-1 h-6 w-6 rounded-full bg-muted-foreground" />
        </button>
      </div>
      <label className="mt-3 flex items-center justify-between text-sm text-muted-foreground">{t("plan.reminderTime")}
        <input type="time" value={value.time} disabled onChange={(e) => onChange({ ...value, time: e.target.value })}
          className="glass min-h-11 rounded-full px-3 text-foreground opacity-60 [color-scheme:light]" />
      </label>
    </div>
  );
}
