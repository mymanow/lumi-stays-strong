import { useState } from "react";
import { useI18n } from "@/i18n";
import { PrimaryButton } from "./Common";

/** Full-screen white sentence that fades in, then a Continue button fades in below it (no automatic advance). */
export function AloneScreen({ name, onDone }: { name: string; onDone: () => void }) {
  const { t } = useI18n();
  const [leaving, setLeaving] = useState(false);

  const finish = () => {
    if (leaving) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { onDone(); return; }
    setLeaving(true);
    window.setTimeout(onDone, 400);
  };

  return (
    <div className={`mx-auto flex min-h-svh max-w-[480px] flex-col px-8 pb-8 ${leaving ? "alone-out" : ""}`}>
      <div className="flex flex-1 items-center justify-center">
        <h1 className="alone-fade text-center text-[30px] leading-snug text-white md:text-4xl">{t("onb.aloneTitle", { name })}</h1>
      </div>
      <div className="alone-fade-btn"><PrimaryButton onClick={finish}>{t("common.next")}</PrimaryButton></div>
    </div>
  );
}
