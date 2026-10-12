import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useI18n, type Lang } from "@/i18n";
import { crisisLineFor } from "@/lib/domain";
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

export function FullLoader() {
  const { t } = useI18n();
  return <div className="flex min-h-screen items-center justify-center text-muted-foreground" role="status">{t("common.loading")}</div>;
}

export function PrimaryButton({ children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={`min-h-14 w-full rounded-full bg-primary px-6 text-base font-bold text-primary-foreground shadow-[0_8px_24px_-10px_rgba(46,56,101,0.55)] transition-[opacity,transform] active:scale-[0.98] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${className}`}>
      {children}
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

export function SosButton({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  return (
    <Link to="/sos" className={`flex min-h-14 w-full items-center justify-center rounded-full bg-primary px-6 text-lg font-bold text-primary-foreground shadow-[0_10px_28px_-8px_rgba(46,56,101,0.6)] ${className}`}>
      {t("home.sos")}
    </Link>
  );
}

export function ChoiceList<T extends string>({ options, value, onChange, multi = false, labelledBy }: {
  options: { value: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; multi?: boolean; labelledBy?: string;
}) {
  return (
    <div role={multi ? "group" : "radiogroup"} aria-labelledby={labelledBy} className="flex flex-col gap-3">
      {options.map((o) => {
        const selected = value.includes(o.value);
        return (
          <button key={o.value} type="button" role={multi ? "checkbox" : "radio"} aria-checked={selected}
            onClick={() => onChange(multi ? (selected ? value.filter((v) => v !== o.value) : [...value, o.value]) : [o.value])}
            className="choice flex min-h-14 items-center justify-between rounded-[28px] px-5 py-3 text-left text-base font-medium transition-colors">
            <span>{o.label}</span>
            <span aria-hidden className={`ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-line"}`}>
              {selected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Full-screen scene: light (periwinkle), dusk (violet) or night (deep indigo). Swaps the palette via CSS variables. */
export function Stage({ tone = "light", children, className = "" }: { tone?: "light" | "dusk" | "night"; children: ReactNode; className?: string }) {
  return <div className={`stage-${tone} min-h-svh w-full ${className}`}>{children}</div>;
}
