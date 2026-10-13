import { X } from "lucide-react";
import { Lumi } from "./Lumi";
import { useI18n } from "@/i18n";
import { lumiStageForDays } from "@/lib/domain";

const GROWS = new Set([7, 30, 90]);

/** A milestone reached: a soft light behind Lumi and one warm line. No modal, nothing to confirm. */
export function MilestoneBanner({ days, onClose }: { days: number; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <section role="status" className="fade-up glass relative overflow-hidden rounded-[24px] p-5 md:col-span-2">
      <span aria-hidden className="milestone-glow pointer-events-none absolute -left-10 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(244,185,78,0.55) 0%, rgba(255,255,255,0.0) 70%)" }} />
      <div className="relative flex items-center gap-4">
        <Lumi size={64} stage={lumiStageForDays(days)} emotion="proud" />
        <div className="flex-1">
          <p className="font-display text-xl leading-snug">{t(`milestone.lines.${days}`)}</p>
          {GROWS.has(days) && <p className="mt-1 text-sm text-muted-foreground">{t("milestone.grow")}</p>}
        </div>
        <button type="button" aria-label={t("common.close")} onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-full text-muted-foreground hover:bg-white/40"><X className="h-5 w-5" /></button>
      </div>
    </section>
  );
}
