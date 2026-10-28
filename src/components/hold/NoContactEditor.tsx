import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { MAX_OWN_REASONS } from "@/lib/reasons";
import { toLocalInput } from "@/lib/domain";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Edit the no contact in one place (home "i" button and Settings > Personalise): the date and time of the last
 * contact, which restarts the counter from there, and the user's own reasons (same limit as everywhere else).
 */
export function NoContactEditor({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const { profile, updateProfile } = useApp();
  const [last, setLast] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLast(toLocalInput(profile?.last_contact_at ? new Date(profile.last_contact_at) : new Date()));
    const own = profile?.reasons ?? [];
    setReasons(Array.from({ length: MAX_OWN_REASONS }, (_, i) => own[i] ?? ""));
    setError(null);
  }, [open, profile?.last_contact_at, profile?.reasons]);

  const save = async () => {
    const when = new Date(last);
    if (Number.isNaN(when.getTime())) return;
    if (when.getTime() > Date.now() + 60_000) { setError(t("home.editFuture")); return; }
    const clean = [...new Set(reasons.map((r) => r.trim().slice(0, 200)).filter(Boolean))].slice(0, MAX_OWN_REASONS);
    setSaving(true);
    try {
      await updateProfile({ last_contact_at: when.toISOString(), reasons: clean });
      localStorage.setItem("hold_reasons", JSON.stringify(clean));
      toast(t("home.editSaved"));
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const field = "min-h-12 w-full rounded-[18px] border border-[#2e3865]/25 bg-white/80 px-4 text-base text-[#2e3865] placeholder:text-[#3a4474]/55 [color-scheme:light]";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[28px] border-white/70 bg-[#e9e6fb] text-[#2e3865]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t("home.editTitle")}</DialogTitle>
          <DialogDescription className="text-[#3a4474]">{t("home.editLastSub")}</DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-2 text-sm font-semibold">
          {t("home.editLast")}
          <input type="datetime-local" value={last} max={toLocalInput(new Date())} onChange={(e) => { setLast(e.target.value); setError(null); }} className={field} />
        </label>
        {error && <p role="alert" className="text-sm font-semibold text-[#b2463b]">{error}</p>}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">{t("home.editReasons")}</legend>
          {reasons.map((r, i) => (
            <input key={i} value={r} maxLength={200} placeholder={t("home.editReasonPh", { n: i + 1 })} aria-label={t("home.editReasonPh", { n: i + 1 })}
              onChange={(e) => setReasons((all) => all.map((x, j) => (j === i ? e.target.value : x)))} className={field} />
          ))}
        </fieldset>
        <DialogFooter className="gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className="min-h-12 rounded-full border border-[#2e3865]/40 px-5">{t("common.cancel")}</button>
          <button type="button" onClick={save} disabled={saving || !last} className="min-h-12 rounded-full bg-[#2e3865] px-5 font-bold text-white disabled:opacity-50">{t("home.editSave")}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
