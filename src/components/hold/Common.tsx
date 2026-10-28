import { Link } from "@tanstack/react-router";
import { Fragment, type ReactNode } from "react";
import { useI18n, type Lang } from "@/i18n";
import { crisisLineFor } from "@/lib/domain";
import { ArrowRight } from "lucide-react";
import { SHOW_LANGUAGE_SWITCH } from "@/config/app";
import { PhoneIcon } from "./Icons";
import { useHydrated } from "@tanstack/react-router";

export function useCrisisLine() {
  const { lang } = useI18n();
  const hydrated = useHydrated();
  return crisisLineFor(lang, hydrated ? navigator.language : undefined);
}

export function CrisisLink({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const line = useCrisisLine();
  return (
    <a href={`tel:${line.tel}`} className={`inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:underline ${className}`}>
      <PhoneIcon width={16} height={16} />
      {t("crisis.urgent", { number: line.number })}
    </a>
  );
}

export function LangSwitch({ onChange }: { onChange?: (l: Lang) => void }) {
  const { lang, setLang, t } = useI18n();
  if (!SHOW_LANGUAGE_SWITCH) return null; // French only for now
  return (
    <div role="group" aria-label={t("common.language")} className="glass inline-flex rounded-full p-1">
      {(["fr", "en"] as const).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => { setLang(l); onChange?.(l); }}
          className={`min-h-9 min-w-11 rounded-full px-3 text-sm font-medium ${lang === l ? "bg-white text-[#2e3865]" : "text-muted-foreground"}`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

/** Splash shown while the session and profile load: soft drifting orbs, the wordmark and the tagline. */
export function FullLoader() {
  const { t } = useI18n();
  return (
    <div className="splash fixed inset-0 z-50 flex items-center justify-center overflow-hidden" role="status" aria-live="polite">
      <span className="sr-only">{t("common.loading")}</span>
      <span aria-hidden className="splash-orb splash-orb-top" />
      <span aria-hidden className="splash-orb splash-orb-bottom" />
      <span aria-hidden className="splash-grain" />
      <div aria-hidden className="splash-text relative px-6 text-center text-white">
        <p className="font-display text-[50px] leading-none tracking-[-0.005em]">{t("splash.wordmark")}</p>
        <p className="mt-4 text-[15px] font-medium tracking-wide text-white/90">{t("splash.tagline")}</p>
      </div>
    </div>
  );
}

/** Main CTA: indigo→violet gradient with glow when active, soft periwinkle gradient when disabled. */
export function PrimaryButton({ children, className = "", arrow = true, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { arrow?: boolean }) {
  return (
    <button {...rest} className={`group flex min-h-[68px] w-full items-center justify-center gap-3 rounded-[26px] border border-white/25 bg-[linear-gradient(90deg,#6366F1_0%,#8B7CF8_100%)] px-6 text-lg font-bold text-white shadow-[0_14px_34px_-10px_rgba(99,102,241,0.65)] transition-[transform,box-shadow,filter] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[linear-gradient(135deg,#9A9AF4_0%,#B4A6FA_100%)] disabled:shadow-[0_10px_30px_-12px_rgba(154,154,244,0.55)] disabled:hover:brightness-100 disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${className}`}>
      {children}
      {arrow && <ArrowRight aria-hidden className="h-5 w-5 shrink-0 transition-transform group-enabled:group-hover:translate-x-0.5" strokeWidth={2.5} />}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={`glass min-h-14 w-full rounded-full px-6 text-base font-semibold text-foreground disabled:opacity-40 ${className}`}>
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`glass rounded-[24px] p-5 ${className}`}>{children}</section>;
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="mb-6 text-4xl">{children}</h1>;
}

export function ChoiceList<T extends string>({ options, value, onChange, multi = false, labelledBy, grid = false, details }: {
  options: { value: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; multi?: boolean; labelledBy?: string;
  /** Tile layout: 3 columns of centered tiles, the last option spans the full width (e.g. durations). */
  grid?: boolean;
  /** Optional explanation per option, unfolded under the selected one (and folded again when another is picked). */
  details?: Partial<Record<T, string>>;
}) {
  return (
    <div role={multi ? "group" : "radiogroup"} aria-labelledby={labelledBy} className={`cascade ${grid ? "grid grid-cols-3 gap-3" : "flex flex-col gap-3"}`}>
      {options.map((o, i) => {
        const selected = value.includes(o.value);
        const last = i === options.length - 1;
        const detail = details?.[o.value];
        const button = (
          <button type="button" role={multi ? "checkbox" : "radio"} aria-checked={selected} aria-describedby={detail ? `choice-detail-${o.value}` : undefined}
            onClick={() => onChange(multi ? (selected ? value.filter((v) => v !== o.value) : [...value, o.value]) : [o.value])}
            className={grid
              ? `choice flex items-center justify-center rounded-[24px] px-3 py-3 text-center text-base font-medium transition-colors ${last && options.length % 3 === 1 ? "col-span-3 min-h-14" : "min-h-24"} `
              : "choice flex min-h-14 w-full items-center justify-between rounded-[28px] px-5 py-3 text-left text-base font-medium transition-colors"}>
            <span>{o.label}</span>
            {!grid && !detail && (
              <span aria-hidden className={`ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-line"}`}>
                {selected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg>}
              </span>
            )}
          </button>
        );
        if (!detail || grid) return <Fragment key={o.value}>{button}</Fragment>;
        // One rounded card: the chosen answer on top, its explanation flush underneath on a darker tint.
        return (
          <div key={o.value} className="overflow-hidden rounded-[28px]">
            <div className={selected ? "[&>button]:rounded-b-none [&>button]:border-b-0" : ""}>{button}</div>
            <div id={`choice-detail-${o.value}`} aria-hidden={!selected} data-open={selected}
              className="grid transition-[grid-template-rows,opacity] duration-300 ease-out" style={{ gridTemplateRows: selected ? "1fr" : "0fr", opacity: selected ? 1 : 0 }}>
              <div className="overflow-hidden">
                <p className="px-5 py-5 text-[17px] leading-relaxed text-[#2e3865]" style={{ background: "rgba(124, 146, 235, 0.30)" }}>{detail}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Full-screen scene: light (periwinkle), dusk (violet) or night (deep indigo). Swaps the palette via CSS variables. */
export function Stage({ tone = "light", children, className = "" }: { tone?: "light" | "dusk" | "night"; children: ReactNode; className?: string }) {
  return <div className={`stage-${tone} min-h-svh w-full ${className}`}>{children}</div>;
}
