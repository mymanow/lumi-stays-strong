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
    <div role="group" aria-label={t("common.language")} className="inline-flex rounded-full border border-line bg-surface p-1">
      {(["fr", "en"] as const).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => { setLang(l); onChange?.(l); }}
          className={`min-h-9 min-w-11 rounded-full px-3 text-sm font-medium ${lang === l ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}>
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
    <button {...rest} className={`min-h-12 w-full rounded-2xl bg-primary px-6 text-base font-semibold text-primary-foreground transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumi ${className}`}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={`min-h-12 w-full rounded-2xl border border-line bg-surface px-6 text-base font-medium text-foreground disabled:opacity-40 ${className}`}>
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>{children}</section>;
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="mb-6 text-3xl font-semibold">{children}</h1>;
}

export function SosButton({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  return (
    <Link to="/sos" className={`flex min-h-14 w-full items-center justify-center rounded-2xl bg-primary px-6 text-lg font-semibold text-primary-foreground shadow-[0_0_30px_-8px_var(--primary)] ${className}`}>
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
            className={`flex min-h-13 items-center justify-between rounded-2xl border px-5 py-3 text-left text-base transition-colors ${selected ? "border-secondary bg-secondary/10 text-foreground" : "border-line bg-surface text-foreground"}`}>
            <span>{o.label}</span>
            <span aria-hidden className={`ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${selected ? "border-secondary bg-secondary text-secondary-foreground" : "border-line"}`}>
              {selected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
