import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { db, type DayOutcome } from "@/lib/db";
import { localDateString } from "@/lib/domain";
import { logEvent } from "@/lib/events";

/** Option keys saved in checkins.emotions / relational / physical; labels live in i18n (checkin.*). */
export const EMOTIONS = ["overwhelmed", "confused", "anxious", "numb", "lonely", "hopeful", "angry", "sad"] as const;
export const RELATIONAL = ["sun", "silence", "nature", "music", "movement", "person"] as const;
export const PHYSICAL = ["water", "rest", "breathing", "movement", "fresh_air", "calm"] as const;
const OUTCOMES: DayOutcome[] = ["stayed", "resisted", "broke"];
type Step = "e" | "r" | "p" | "day";
const STEPS: Step[] = ["e", "r", "p", "day"];

/** Small original marks for the last question: a sun, a wave held back, a broken ring. */
function OutcomeMark({ kind }: { kind: DayOutcome }) {
  if (kind === "stayed") {
    return (
      <svg aria-hidden viewBox="0 0 48 48" className="h-11 w-11">
        <circle cx="24" cy="24" r="22" fill="#c8ecb1" /><circle cx="24" cy="24" r="15" fill="#f4c430" /><circle cx="24" cy="24" r="8" fill="#ffe27a" />
      </svg>
    );
  }
  if (kind === "resisted") {
    return (
      <svg aria-hidden viewBox="0 0 48 48" className="h-11 w-11">
        <circle cx="24" cy="24" r="17" fill="#cfe4ff" />
        <path d="M12 30 C 18 18, 28 16, 36 20" stroke="#5aa5f5" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M14 36 L 34 12" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="h-11 w-11">
      <circle cx="24" cy="24" r="18" fill="none" stroke="#b5474f" strokeWidth="6" /><circle cx="24" cy="24" r="9" fill="#f6c6c6" />
      <path d="M4 24 H 44" stroke="#fff" strokeWidth="4" />
    </svg>
  );
}

/**
 * Daily check-in as a bottom sheet (home "Check-in"): three multi-choice steps — E what I feel, R what helps me
 * connect, P what my body asks for — then how the day went with no contact. Picking that answer saves the check-in.
 * "Resisted" also counts as a resistance; "broke" hands over to the home's relapse dialog (onBroke), which restarts
 * the counter only once the user confirms.
 */
export function CheckinSheet({ open, onOpenChange, onBroke }: { open: boolean; onOpenChange: (o: boolean) => void; onBroke: () => void }) {
  const { t } = useI18n();
  const { session } = useApp();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Record<"e" | "r" | "p", string[]>>({ e: [], r: [], p: [] });
  const [previous, setPrevious] = useState<DayOutcome | null>(null);
  const [saving, setSaving] = useState(false);
  const today = localDateString();

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setPicked({ e: [], r: [], p: [] });
    setPrevious(null);
    db.from("checkins").select("emotions, relational, physical, day_outcome").eq("date", today).maybeSingle().then(({ data }) => {
      if (!data) return;
      setPicked({ e: data.emotions ?? [], r: data.relational ?? [], p: data.physical ?? [] });
      setPrevious(data.day_outcome ?? null);
    });
  }, [open, today]);

  const key = STEPS[step]!;
  const options = key === "e" ? EMOTIONS : key === "r" ? RELATIONAL : PHYSICAL;
  const group = key === "e" ? "emotions" : key === "r" ? "relational" : "physical";

  const toggle = (k: string) => {
    if (key === "day") return;
    setPicked((p) => ({ ...p, [key]: p[key].includes(k) ? p[key].filter((x) => x !== k) : [...p[key], k] }));
  };

  const finish = async (outcome: DayOutcome) => {
    if (!session || saving) return;
    setSaving(true);
    const { error } = await db.from("checkins").upsert(
      { user_id: session.user.id, date: today, emotions: picked.e, relational: picked.r, physical: picked.p, day_outcome: outcome },
      { onConflict: "user_id,date" },
    );
    if (error) { setSaving(false); toast.error(error.message); return; }
    if (outcome === "resisted" && previous !== "resisted") await logEvent({ type: "resistance", occurred_at: new Date().toISOString() });
    await qc.invalidateQueries();
    setSaving(false);
    onOpenChange(false);
    if (outcome === "broke") { toast(t("checkin.brokeToast")); onBroke(); } else toast(t("checkin.thanks"));
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[92dvh] max-w-xl rounded-t-[32px] border-white/70 bg-[#f6f4ff] px-5 pb-[max(20px,env(safe-area-inset-bottom))] text-[#2e3865]">
        <button type="button" onClick={() => onOpenChange(false)} aria-label={t("checkin.close")} className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-[#3a4474]/70 hover:bg-[#2e3865]/5">
          <X className="h-5 w-5" />
        </button>
        <div key={key} className="fade-up overflow-y-auto pt-4">
          <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-[#3a4474]/70">{t(`checkin.steps.${key}.tag`)}</p>
          <DrawerTitle className="mx-auto mt-2 max-w-[320px] text-center font-display text-[26px] font-normal leading-tight">{t(`checkin.steps.${key}.q`)}</DrawerTitle>
          <DrawerDescription className="sr-only">{t("checkin.stepOf", { i: step + 1, n: STEPS.length })}</DrawerDescription>

          {key !== "day" ? (
            <>
              <div role="group" aria-label={t(`checkin.steps.${key}.q`)} className="mt-6 grid grid-cols-2 gap-2.5">
                {options.map((k) => {
                  const on = picked[key].includes(k);
                  return (
                    <button key={k} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(k)}
                      className={`min-h-12 rounded-full px-3 text-[14px] font-semibold transition-colors active:scale-[0.97] ${on ? "bg-[#2e3865] text-white" : "bg-white text-[#2e3865] shadow-[0_1px_0_rgba(46,56,101,0.06)]"}`}>
                      {t(`checkin.${group}.${k}`)}
                    </button>
                  );
                })}
              </div>
              <button type="button" disabled={picked[key].length === 0} onClick={() => setStep(step + 1)}
                className="mt-6 min-h-[52px] w-full rounded-full bg-[#2e3865] font-bold text-white transition-colors disabled:bg-[#a7abd0]">
                {t("checkin.next")}
              </button>
              {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="mx-auto mt-1 flex min-h-11 items-center px-4 text-sm font-medium text-[#3a4474]">{t("checkin.back")}</button>}
            </>
          ) : (
            <>
              <ul className="mt-8 flex flex-col gap-2" role="radiogroup" aria-label={t("checkin.steps.day.q")}>
                {OUTCOMES.map((o) => (
                  <li key={o}>
                    <button type="button" role="radio" aria-checked={previous === o} disabled={saving} onClick={() => void finish(o)}
                      className={`flex min-h-[72px] w-full items-center gap-5 rounded-[22px] px-4 text-left text-[17px] font-medium hover:bg-white active:scale-[0.99] disabled:opacity-60 ${previous === o ? "bg-white" : ""}`}>
                      <OutcomeMark kind={o} />{t(`checkin.outcome.${o}`)}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-10 text-center text-sm italic text-[#3a4474]/60">{t("checkin.honest")}</p>
              <button type="button" onClick={() => setStep(step - 1)} className="mx-auto mt-2 flex min-h-11 items-center px-4 text-sm font-medium text-[#3a4474]">{t("checkin.back")}</button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
