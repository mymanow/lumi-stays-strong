import { Check, Clock, Flame, HeartCrack, RefreshCw, TrendingUp, X, Zap, type LucideIcon } from "lucide-react";
import { useI18n } from "@/i18n";
import { APP_NAME } from "@/config/app";
import { Lumi } from "./Lumi";
import { ToolkitMarquee } from "./ToolkitMarquee";
import { ScienceChart } from "./ScienceChart";
import { GoodHands } from "./GoodHands";

export type InfoKind = "hands" | "slips" | "bio" | "compare" | "science" | "toolkit";
export const INFO_KINDS: readonly InfoKind[] = ["slips", "bio", "compare", "toolkit", "science"]; // "hands" is shown before the goal question
/** Light scenes for the reassuring screens, deep scenes for the "why Hold" and "science" screens. */
export const INFO_TONE: Record<InfoKind, "light" | "night"> = { hands: "night", slips: "light", bio: "light", compare: "night", science: "night", toolkit: "light" };

const BIO_ICONS: LucideIcon[] = [HeartCrack, Flame, Zap, RefreshCw, TrendingUp];

function Title({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="fade-up mb-8 text-center">
      <h1 className="text-[34px] leading-tight md:text-4xl">{children}</h1>
      {sub && <p className="mx-auto mt-3 max-w-[340px] text-lg text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Original illustration: Lumi under a small rain cloud (no third-party artwork). */
function RainyLumi() {
  return (
    <div className="relative mx-auto h-[250px] w-[250px]" aria-hidden>
      <svg viewBox="0 0 200 80" className="absolute left-1/2 top-0 w-[200px] -translate-x-1/2" fill="none">
        <g fill="#FFFFFF" fillOpacity="0.85" stroke="#FFFFFF" strokeOpacity="0.9" strokeWidth="1.5">
          <ellipse cx="100" cy="46" rx="70" ry="18" />
          <ellipse cx="68" cy="36" rx="26" ry="18" />
          <ellipse cx="108" cy="28" rx="32" ry="22" />
          <ellipse cx="140" cy="38" rx="22" ry="15" />
        </g>
        {[62, 100, 138].map((x, i) => (
          <path key={x} d={`M ${x} 66 q 3 6 0 10 q -3 -4 0 -10 Z`} fill="#7F9CF5" style={{ animation: `lumi-twinkle ${1.8 + i * 0.4}s ease-in-out ${i * 0.3}s infinite` }} />
        ))}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        <Lumi size={120} stage={2} emotion="support" label="" />
      </div>
    </div>
  );
}

function Slips({ name }: { name: string }) {
  const { t } = useI18n();
  return (
    <>
      <Title sub={t("info.slips.sub")}>{t("info.slips.title", { name })}</Title>
      <div className="fade-up" style={{ "--d": "200ms" } as React.CSSProperties}><RainyLumi /></div>
      <p className="fade-up glass mt-6 flex items-center gap-4 rounded-[28px] p-5 text-base leading-snug" style={{ "--d": "500ms" } as React.CSSProperties}>
        <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F4B94E] text-[#2e3865] shadow-[0_6px_16px_-6px_rgba(244,185,78,0.8)] ring-4 ring-[#F4B94E]/25"><Clock className="h-6 w-6" strokeWidth={2.4} /></span>
        <span>{t("info.slips.card")}</span>
      </p>
    </>
  );
}

function Bio() {
  const { t, tl } = useI18n();
  const rows = tl<string[]>("info.bio.rows");
  return (
    <>
      <Title sub={t("info.bio.sub")}>{t("info.bio.title")}</Title>
      <ul className="cascade flex flex-col gap-3">
        {rows.map((row, i) => {
          const Icon = BIO_ICONS[i] ?? Zap;
          return (
            <li key={row} className="glass flex items-center gap-4 rounded-[28px] p-4">
              <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#5A4BCF]"><Icon className="h-6 w-6" strokeWidth={2.2} /></span>
              <span className="font-display text-lg leading-snug">{row}</span>
            </li>
          );
        })}
      </ul>
      <p className="fade-up mt-4 text-center text-xs text-muted-foreground" style={{ "--d": "800ms" } as React.CSSProperties}>{t("info.bio.note")}</p>
    </>
  );
}

function Bars({ heights, className }: { heights: number[]; className: string }) {
  return (
    <div aria-hidden className="mt-4 flex h-24 items-end justify-center gap-2">
      {heights.map((h, i) => <span key={i} className={`w-7 rounded-t-lg ${className}`} style={{ height: `${h}%` }} />)}
    </div>
  );
}

function Compare() {
  const { t, tl } = useI18n();
  const rows = tl<string[]>("info.compare.rows");
  return (
    <>
      <Title sub={t("info.compare.sub")}>{t("info.compare.title")}</Title>
      <div className="fade-up grid grid-cols-2 gap-3" style={{ "--d": "150ms" } as React.CSSProperties}>
        <div className="relative rounded-[28px] border border-white/60 bg-white/20 p-4 pt-6 text-center">
          <span className="absolute -top-3 left-3 rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#2e3865]">{t("info.compare.badge")}</span>
          <div className="flex items-center justify-center gap-2"><Lumi size={26} stage={2} emotion="happy" breathe={false} label="" /><span className="font-display text-2xl">{APP_NAME}</span></div>
          <p className="mt-2 text-sm text-muted-foreground">{t("info.compare.ours")}</p>
          <Bars heights={[35, 62, 95]} className="bg-gradient-to-t from-[#8B7CF8] to-[#C9C0FF]" />
        </div>
        <div className="rounded-[28px] border border-white/30 bg-white/10 p-4 pt-6 text-center">
          <p className="font-display text-xl">{t("info.compare.otherTitle")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("info.compare.others")}</p>
          <Bars heights={[60]} className="bg-white/70" />
        </div>
      </div>

      <h2 className="fade-up mb-2 mt-10 text-2xl" style={{ "--d": "350ms" } as React.CSSProperties}>{t("info.compare.tableTitle")}</h2>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-white/30">
            <th scope="col" className="pb-3 text-left font-normal"><span className="sr-only">{t("info.compare.tableTitle")}</span></th>
            <th scope="col" className="w-20 pb-3 text-center text-sm font-semibold text-muted-foreground">{t("info.compare.without")}</th>
            <th scope="col" className="w-20 rounded-t-2xl bg-[#2e3865]/60 pb-3 pt-3 text-center font-display text-lg">{APP_NAME}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row} className="fade-up border-b border-white/20" style={{ "--d": `${450 + i * 60}ms` } as React.CSSProperties}>
              <th scope="row" className="py-4 pr-2 text-left text-[15px] font-semibold leading-snug">{row}</th>
              <td className="text-center"><X aria-label={t("info.compare.no")} className="mx-auto h-5 w-5 text-white/60" strokeWidth={2.5} /></td>
              <td className={`bg-[#2e3865]/60 text-center ${i === rows.length - 1 ? "rounded-b-2xl" : ""}`}><Check aria-label={t("info.compare.yes")} className="mx-auto h-5 w-5" strokeWidth={3} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Science() {
  const { t } = useI18n();
  return (
    <>
      <Title sub={t("info.science.sub")}>{t("info.science.title")}</Title>
      <ScienceChart />
      <p className="fade-up mt-3 text-sm leading-snug text-muted-foreground" style={{ "--d": "600ms" } as React.CSSProperties}>{t("info.science.caveat")}</p>
      <p className="fade-up mt-6 text-xs leading-snug text-muted-foreground" style={{ "--d": "800ms" } as React.CSSProperties}>
        {t("info.science.source")}{" "}
        doi.org/10.1177/2167702620916454
      </p>
    </>
  );
}

function Toolkit() {
  const { t } = useI18n();
  return (
    <>
      <Title sub={t("info.toolkit.sub")}>{t("info.toolkit.title")}</Title>
      <ToolkitMarquee />
    </>
  );
}

export function InfoBody({ kind, name }: { kind: InfoKind; name: string }) {
  if (kind === "hands") return <GoodHands name={name} />;
  if (kind === "slips") return <Slips name={name} />;
  if (kind === "bio") return <Bio />;
  if (kind === "compare") return <Compare />;
  if (kind === "toolkit") return <Toolkit />;
  return <Science />;
}
