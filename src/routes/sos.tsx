import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { Lumi } from "@/components/hold/Lumi";
import { CrisisLink, PrimaryButton, SecondaryButton } from "@/components/hold/Common";
import { CloseIcon } from "@/components/hold/Icons";
import { OwnReasons } from "@/components/hold/OwnReasons";
import { sosReasons } from "@/lib/reasons";
import { addVault } from "@/lib/vault";
import { logEvent } from "@/lib/events";

export const Route = createFileRoute("/sos")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "SOS — Hold" },
      { name: "description", content: "L'envie d'écrire est là. Respire avec Lumi et relis tes raisons." },
      { property: "og:title", content: "SOS — Hold" },
      { property: "og:description", content: "L'envie d'écrire est là. Respire avec Lumi et relis tes raisons." },
    ],
  }),
  component: Sos,
});

const BREATH_TOTAL = 60;

function Sos() {
  const { t } = useI18n();
  const { profile } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<"breathe" | "reasons" | "won">("breathe");
  const [elapsed, setElapsed] = useState(0);
  const [text, setText] = useState("");
  const reasons = sosReasons(profile?.reasons ?? [], profile?.motivation, profile?.situation_type, t);

  useEffect(() => {
    if (step !== "breathe") return;
    const id = setInterval(() => setElapsed((e) => { if (e + 1 >= BREATH_TOTAL) { setStep("reasons"); return BREATH_TOTAL; } return e + 1; }), 1000);
    return () => clearInterval(id);
  }, [step]);

  const phase = elapsed % 10 < 4 ? "in" : "out";
  const win = async () => {
    setStep("won");
    await logEvent({ type: "resistance", occurred_at: new Date().toISOString() });
  };

  return (
    <div className={`${step === "reasons" ? "stage-light" : "stage-night"} fixed inset-0 z-50 overflow-y-auto`} role="dialog" aria-modal="true" aria-label="SOS">
      <div className="mx-auto flex min-h-full max-w-xl flex-col px-6 py-5">
        <div className="flex justify-end">
          <Link to="/" aria-label={t("sos.exit")} className="glass flex h-11 w-11 items-center justify-center rounded-full text-foreground"><CloseIcon /></Link>
        </div>

        {step === "breathe" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <h1 className="text-4xl">{t("sos.breatheTitle")}</h1>
            <div className="my-12 flex h-72 items-center justify-center">
              <Lumi size={110} stage={3} emotion={phase === "in" ? "support" : "neutral"} breathe={false} scale={phase === "in" ? 1.45 : 0.85} transitionMs={phase === "in" ? 4000 : 6000} />
            </div>
            <p className="font-display text-2xl" aria-live="polite">{phase === "in" ? t("sos.inhale") : t("sos.exhale")}</p>
            <p className="mt-2 text-muted-foreground">{t("sos.remaining", { n: BREATH_TOTAL - elapsed })}</p>
            <button type="button" onClick={() => setStep("reasons")} className="mt-8 min-h-11 px-4 text-foreground underline-offset-4 hover:underline">{t("sos.skip")}</button>
          </div>
        )}

        {step === "reasons" && (
          <div className="flex flex-1 flex-col gap-6 pt-4">
            {reasons.length > 0 && (
              <div>
                <h1 className="mb-4 text-xl text-foreground">{t("ownReasons.title")}</h1>
                <ul className="flex flex-col gap-3">
                  {reasons.map((r) => <li key={r} className="font-display text-3xl leading-tight">{r}</li>)}
                </ul>
              </div>
            )}
            <OwnReasons />
            <div className="glass flex items-center gap-3 rounded-[24px] p-4">
              <Lumi size={44} stage={3} emotion="support" />
              <p>{t("sos.lumiLine")}</p>
            </div>
            <label className="flex flex-col gap-2">
              <span className="font-medium">{t("sos.write")}</span>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder={t("sos.writePh")}
                className="glass rounded-[24px] p-4 text-base placeholder:text-muted-foreground/70" />
              <span className="text-xs text-muted-foreground">{t("sos.localOnly")}</span>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <SecondaryButton disabled={!text.trim()} onClick={async () => { await addVault(text.trim()); setText(""); await win(); }}>{t("sos.keep")}</SecondaryButton>
              <SecondaryButton disabled={!text.trim()} onClick={async () => { setText(""); await win(); }}>{t("sos.del")}</SecondaryButton>
            </div>
            <SecondaryButton onClick={async () => { await logEvent({ type: "resistance", occurred_at: new Date().toISOString() }); navigate({ to: "/coach", search: { mode: "urge" } }); }}>{t("sos.coach")}</SecondaryButton>
            <PrimaryButton arrow={false} onClick={win}>{t("sos.done")}</PrimaryButton>
          </div>
        )}

        {step === "won" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <Lumi size={120} stage={4} emotion="proud" />
            <h1 className="mt-8 text-5xl">{t("sos.wonTitle")}</h1>
            <p className="mt-3 text-lg text-muted-foreground">{t("sos.wonBody")}</p>
            <Link to="/" className="mt-10 flex min-h-12 w-full items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{t("sos.home")}</Link>
          </div>
        )}

        <div className="mt-6 flex justify-center"><CrisisLink /></div>
      </div>
    </div>
  );
}
