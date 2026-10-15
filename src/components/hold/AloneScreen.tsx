import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { PrimaryButton } from "./Common";

const AUTO_MS = 3800;
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Full-screen white sentence that fades in on its own, then moves on (tap anywhere to continue sooner). */
export function AloneScreen({ name, onDone }: { name: string; onDone: () => void }) {
  const { t } = useI18n();
  const [still] = useState(reduced); // reduced motion: no timer, a visible button instead
  const [leaving, setLeaving] = useState(false);

  const finish = () => {
    if (leaving) return;
    if (still) { onDone(); return; }
    setLeaving(true);
    window.setTimeout(onDone, 500);
  };

  useEffect(() => {
    if (still) return;
    const id = window.setTimeout(finish, AUTO_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still]);

  return (
    <div className="mx-auto flex min-h-svh max-w-[480px] flex-col justify-center px-8" onClick={finish}>
      <h1 className={`alone-fade text-center text-[30px] leading-snug text-white md:text-4xl ${leaving ? "alone-out" : ""}`}>{t("onb.aloneTitle", { name })}</h1>
      {still && <div className="mt-10"><PrimaryButton onClick={finish}>{t("common.next")}</PrimaryButton></div>}
    </div>
  );
}
