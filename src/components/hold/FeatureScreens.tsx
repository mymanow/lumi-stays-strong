import { Check, Flag } from "lucide-react";
import { useI18n } from "@/i18n";
import { CounterScreen, JourneyScreen, PhoneFrame, SosScreen } from "./PhoneShowcase";

export const FEATURE_KINDS = ["tools", "progress", "clarity"] as const;
export type FeatureKind = (typeof FEATURE_KINDS)[number];

/** Miniature of the red flags list (the sample flags of the toolkit screen), with the check-in triggers. */
function ClarityScreen() {
  const { t, tl } = useI18n();
  const flags = tl<string[]>("info.toolkit.samples").slice(0, 2);
  return (
    <div className="flex h-full flex-col px-4 pt-14 text-left text-white">
      <h3 className="font-display text-[19px] leading-tight">{t("rem.flagsTitle")}</h3>
      <div className="mt-4 flex flex-col gap-2.5">
        {flags.map((f, i) => (
          <div key={f} className="showcase-pop flex items-center gap-2.5 rounded-2xl bg-white/15 px-3 py-3 text-[12.5px]" style={{ animationDelay: `${0.3 + i * 0.45}s` }}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[#3B3F9E]"><Flag size={11} strokeWidth={2.5} aria-hidden /></span>
            {f}
          </div>
        ))}
      </div>
      <p className="mt-5 text-[12px] opacity-80">{t("features.clarity.triggers")}</p>
      <div className="mt-2 flex gap-1.5">
        {tl<string[]>("features.clarity.triggerSamples").slice(0, 2).map((x) => (
          <span key={x} className="flex items-center gap-1 whitespace-nowrap rounded-full bg-white/20 px-2.5 py-1 text-[11px]"><Check size={10} strokeWidth={3} aria-hidden />{x}</span>
        ))}
      </div>
    </div>
  );
}

const VIEW: Record<FeatureKind, { View: () => React.ReactElement; background: string }> = {
  tools: { View: SosScreen, background: "linear-gradient(180deg,#5C74E0 0%,#3F4DA8 60%,#283272 100%)" },
  progress: { View: CounterScreen, background: "linear-gradient(180deg,#6F86E8 0%,#4A5CB8 55%,#2E3A86 100%)" },
  clarity: { View: ClarityScreen, background: "linear-gradient(180deg,#7C7BEA 0%,#5A5CC8 60%,#3C4294 100%)" },
};

/**
 * The three screens between "plan ready" and the paywall intro: what helps in a crisis, how progress is tracked, and
 * how the app helps understand what happened. Each shows a miniature of a screen that really exists in Hold.
 */
export function FeatureScreen({ kind }: { kind: FeatureKind }) {
  const { t } = useI18n();
  const { View, background } = VIEW[kind];
  return (
    <div className="flex flex-1 flex-col text-center text-white">
      <h1 className="fade-up font-display text-[26px] leading-[1.15]">{t(`features.${kind}.title`)}</h1>
      <p className="fade-up mx-auto mt-3 max-w-[340px] text-[15px] leading-snug text-white/80" style={{ "--d": "120ms" } as React.CSSProperties}>{t(`features.${kind}.sub`)}</p>
      <div className="fade-up mt-2 flex flex-1" style={{ "--d": "240ms" } as React.CSSProperties}>
        <PhoneFrame background={background} label={t(`features.${kind}.alt`)}><View /></PhoneFrame>
      </div>
    </div>
  );
}
