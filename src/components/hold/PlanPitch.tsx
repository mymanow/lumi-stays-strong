import { useState } from "react";
import { CalendarCheck, Check, ChevronDown, MessageCircle } from "lucide-react";
import { useI18n } from "@/i18n";
import type { PlanKey } from "@/config/whop";

const STEP_ICONS = [Check, MessageCircle, CalendarCheck];

function Title({ text }: { text: string }) {
  return <>{text.split(/(\[[^\]]+\])/).map((p, i) => p.startsWith("[") ? <span key={i} className="text-[#C9BBFF]">{p.slice(1, -1)}</span> : <span key={i}>{p}</span>)}</>;
}

/** Pre-paywall page: what you get now vs. with the subscription, then the plans. The quarterly plan is shown first; "more plans" slides the weekly one down. */
export function PlanPitch({ value, onChange }: { value: PlanKey; onChange: (p: PlanKey) => void }) {
  const { t, tl } = useI18n();
  const [more, setMore] = useState(false);
  const steps = tl<{ title: string; sub: string }[]>("pitch.steps");
  const card = (k: PlanKey) => (
    <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}
      className={`relative flex w-full items-center justify-between gap-3 rounded-[24px] border-2 px-5 py-4 text-left transition-colors ${value === k ? "border-white bg-white/20" : "border-transparent bg-white/10"}`}>
      {k === "quarterly" && <span className="absolute -top-3 left-4 rounded-full bg-[#7EE3D9] px-3 py-0.5 text-xs font-bold text-[#1f3a4a]">{t("pitch.best")}</span>}
      <span>
        <span className="font-display block text-xl">{t(`pitch.${k}.name`)}</span>
        <span className="block text-sm opacity-80">{t(`pitch.${k}.billed`)}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="font-display block text-xl">{t(`pitch.${k}.price`)}</span>
        <span className="block text-sm opacity-80">{t("pitch.perWeek")}</span>
      </span>
    </button>
  );

  return (
    <div className="flex flex-1 flex-col text-white">
      <h1 id="q19p" className="font-display text-[34px] leading-[1.1]"><Title text={t("pitch.title")} /></h1>
      <p className="mt-3 text-base opacity-75">{t("pitch.sub")}</p>

      <ol className="mt-7 flex flex-col">
        {steps.map((s, i) => {
          const Icon = STEP_ICONS[i]!;
          return (
            <li key={s.title} className="relative flex gap-4 pb-6 last:pb-0">
              {i < steps.length - 1 && <span aria-hidden className="absolute left-[19px] top-10 h-[calc(100%-26px)] w-1 rounded-full bg-white/25" />}
              <span aria-hidden className={`relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${i === 0 ? "bg-[#D9CEFF] text-[#3B3F9E]" : "bg-white/25"}`}><Icon size={19} /></span>
              <span>
                <span className="block text-[17px] font-semibold leading-snug">{s.title}</span>
                <span className="block text-[15px] leading-snug opacity-70">{s.sub}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-8" role="radiogroup" aria-label={t("pitch.plans")}>
        <div className="pt-3">{card("quarterly")}</div>
        <div className="grid transition-[grid-template-rows] duration-500 ease-out" style={{ gridTemplateRows: more ? "1fr" : "0fr" }} aria-hidden={!more} inert={!more}>
          <div className="overflow-hidden">
            <div className={`pt-3 transition-[transform,opacity] duration-500 ease-out ${more ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}`}>{card("weekly")}</div>
          </div>
        </div>
      </div>
      <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="mx-auto mt-3 flex min-h-11 items-center gap-1.5 text-[15px]">
        {t(more ? "pitch.hide" : "pitch.more")}
        <ChevronDown size={16} aria-hidden className={`transition-transform duration-300 ${more ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}
