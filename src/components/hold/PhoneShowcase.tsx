import { useEffect, useState } from "react";
import { Check, Flag, Heart, Map as MapIcon, Wind } from "lucide-react";
import { useI18n } from "@/i18n";
import { APP_NAME } from "@/config/app";
import { Lumi } from "./Lumi";

const SCREENS = 4;
const SCREEN_MS = 3200;
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Renders "Start your [journey] with [support]": words in square brackets are highlighted. */
function Title({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]+\])/).map((part, i) =>
        part.startsWith("[") ? <span key={i} className="text-[#C9BBFF]">{part.slice(1, -1)}</span> : <span key={i}>{part}</span>)}
    </>
  );
}

/* ---- Miniature versions of our own screens (static markup, translated, no network) ---- */

function CounterScreen() {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col items-center px-4 pt-14 text-center text-white">
      <p className="font-display text-[15px] opacity-90">{APP_NAME}</p>
      <div className="relative mt-5 flex h-[150px] w-[150px] items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-white/20" />
        <span className="absolute inset-3 rounded-full border border-white/25 bg-white/[0.06]" />
        <div className="relative"><Lumi size={64} stage={2} emotion="happy" label="" /></div>
      </div>
      <p className="font-display mt-4 text-[44px] leading-none">12</p>
      <p className="mt-1 text-[12px] opacity-80">{t("showcase.days")}</p>
      <div className="mt-5 flex gap-1.5">
        {[1, 1, 1, 0, 0, 0, 0].map((on, i) => <span key={i} className={`h-1.5 w-6 rounded-full ${on ? "bg-white/90" : "bg-white/25"}`} />)}
      </div>
      <p className="mt-2 text-[11px] opacity-70">{t("showcase.nextMilestone")}</p>
    </div>
  );
}

function RulesScreen() {
  const { t, tl } = useI18n();
  const rules = tl<string[]>("showcase.rules");
  return (
    <div className="flex h-full flex-col px-4 pt-14 text-left text-white">
      <h3 className="font-display text-[19px] leading-tight">{t("showcase.rulesTitle")}</h3>
      <div className="mt-4 flex flex-col gap-2.5">
        {rules.map((r, i) => (
          <div key={r} className="showcase-pop flex items-center gap-2.5 rounded-2xl bg-white/15 px-3 py-3 text-[12.5px]" style={{ animationDelay: `${0.3 + i * 0.45}s` }}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[#3B3F9E]"><Check size={12} strokeWidth={3} aria-hidden /></span>
            {r}
          </div>
        ))}
      </div>
    </div>
  );
}

function SosScreen() {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col items-center px-4 pt-14 text-center text-white">
      <p className="text-[12px] opacity-80">{t("showcase.sosKicker")}</p>
      <h3 className="font-display mt-1 text-[19px] leading-tight">{t("showcase.sosTitle")}</h3>
      <div className="relative mt-9 flex h-[130px] w-[130px] items-center justify-center">
        <span className="showcase-breathe absolute inset-0 rounded-full bg-white/20" />
        <span className="showcase-breathe absolute inset-5 rounded-full bg-white/25" style={{ animationDelay: "0.4s" }} />
        <Wind size={30} aria-hidden />
      </div>
      <p className="mt-6 text-[13px] opacity-90">{t("showcase.sosBreathe")}</p>
      <div className="mt-auto mb-16 w-full rounded-full bg-white py-2.5 text-[12.5px] font-semibold text-[#2c3470]">{t("showcase.sosButton")}</div>
    </div>
  );
}

function JourneyScreen() {
  const { t, tl } = useI18n();
  const days = tl<string[]>("showcase.journey");
  return (
    <div className="flex h-full flex-col px-4 pt-14 text-left text-white">
      <h3 className="font-display text-[19px] leading-tight">{t("showcase.journeyTitle")}</h3>
      <div className="mt-4 flex flex-col gap-2.5">
        {days.map((d, i) => (
          <div key={d} className="showcase-pop flex items-center gap-2.5 rounded-2xl bg-white/15 px-3 py-2.5 text-[12.5px]" style={{ animationDelay: `${0.3 + i * 0.4}s` }}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${i < 2 ? "bg-white text-[#3B3F9E]" : "bg-white/25"}`}>
              {i < 2 ? <Check size={12} strokeWidth={3} aria-hidden /> : i === 2 ? <Heart size={12} aria-hidden /> : i === 3 ? <MapIcon size={12} aria-hidden /> : <Flag size={12} aria-hidden />}
            </span>
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}

const VIEWS = [CounterScreen, RulesScreen, SosScreen, JourneyScreen];
const BACKGROUNDS = [
  "linear-gradient(180deg,#6F86E8 0%,#4A5CB8 55%,#2E3A86 100%)",
  "linear-gradient(180deg,#8E8AF0 0%,#6C6CD8 60%,#4B4FB0 100%)",
  "linear-gradient(180deg,#5C74E0 0%,#3F4DA8 60%,#283272 100%)",
  "linear-gradient(180deg,#7C7BEA 0%,#5A5CC8 60%,#3C4294 100%)",
];

/** "Start your journey with support": an iPhone drawn in CSS whose screen cycles through miniature versions of our own screens. */
export function PhoneShowcase() {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced()) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % SCREENS), SCREEN_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center text-center text-white">
      <span className="rounded-full border-2 border-white/50 bg-white/10 px-5 py-1.5 text-lg font-bold tracking-wide">{t("showcase.pill", { app: APP_NAME })}</span>
      <h1 id="q15s" className="font-display mt-6 text-[30px] leading-tight"><Title text={t("showcase.title")} /></h1>
      <div className="mt-6 flex flex-1 items-center justify-center" role="img" aria-label={t("showcase.alt")}>
        <div className="relative h-[470px] w-[236px] rounded-[44px] border-[5px] border-[#f1ede6] bg-black p-[6px] shadow-[0_24px_60px_-18px_rgba(0,0,0,0.7)]">
          <div className="relative h-full w-full overflow-hidden rounded-[36px]">
            {VIEWS.map((View, k) => (
              <div key={k} aria-hidden className={`absolute inset-0 transition-[opacity,transform] duration-700 ${k === i ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"}`} style={{ background: BACKGROUNDS[k] }}>
                {k === i && <View />}
              </div>
            ))}
            <div className="absolute left-1/2 top-2 h-[22px] w-[74px] -translate-x-1/2 rounded-full bg-black" />
            <span className="absolute left-5 top-2.5 text-[10px] font-semibold text-white">9:41</span>
            <div className="absolute bottom-2 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-white/70" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2" aria-hidden>
        {Array.from({ length: SCREENS }, (_, k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-white" : "w-1.5 bg-white/40"}`} />)}
      </div>
    </div>
  );
}
