import { useState } from "react";
import { useI18n } from "@/i18n";
import { PrimaryButton } from "./Common";

const COLORS = [
  { bar: "#4F7DF0", track: "#C5D3F7" },
  { bar: "#A3DD62", track: "#DDF0C6" },
  { bar: "#B684FF", track: "#E2D8FB" },
  { bar: "#F58A6B", track: "#F8DDD5" },
  { bar: "#F2C23E", track: "#F5EBC8" },
];
const DURATIONS = [2.6, 3.2, 3.8, 4.4, 5.0]; // seconds; the last one to finish reveals the button
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** "Building your plan" loading scene: five bars fill, then the ready button fades in. */
export function PlanBuilding({ onDone }: { onDone: () => void }) {
  const { t, tl } = useI18n();
  const steps = tl<string[]>("build.steps");
  const [done, setDone] = useState(reduced);
  return (
    <div className="mx-auto flex min-h-svh max-w-[480px] flex-col px-6 pb-8 pt-16">
      <div className="fade-up text-center">
        <h1 className="text-[32px] leading-tight md:text-4xl">{t("build.title")}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{t("build.sub")}</p>
      </div>
      <ul className="mt-12 flex flex-col gap-6" aria-hidden>
        {steps.map((label, i) => (
          <li key={label} className="fade-up" style={{ "--d": `${200 + i * 120}ms` } as React.CSSProperties}>
            <div className="mb-2 text-base">{label}</div>
            <div className="h-2.5 overflow-hidden rounded-full" style={{ background: COLORS[i]!.track }}>
              <div className="plan-bar h-full w-full rounded-full" style={{ background: COLORS[i]!.bar, animationDuration: `${DURATIONS[i]}s` }}
                onAnimationEnd={i === steps.length - 1 ? () => setDone(true) : undefined} />
            </div>
          </li>
        ))}
      </ul>
      <p className="fade-up mt-14 text-center font-display text-lg leading-snug" style={{ "--d": "900ms" } as React.CSSProperties}>{t("build.quote")}</p>
      <span className="sr-only" role="status">{done ? t("build.ready") : t("build.title")}</span>
      <div className="flex-1" />
      {done && <div className="alone-fade-btn-now mt-8"><PrimaryButton onClick={onDone}>{t("build.ready")}</PrimaryButton></div>}
    </div>
  );
}
