import { Flag, Lock, Timer, Zap, Sun, PenLine, type LucideIcon } from "lucide-react";
import { useI18n } from "@/i18n";
import { APP_NAME } from "@/config/app";
import { Lumi } from "./Lumi";

const TOOL_ICONS: LucideIcon[] = [Timer, Zap, Lock, Flag];
const DAY_ICONS: LucideIcon[] = [Sun, Zap, PenLine];
/** Bubble positions around Lumi (percent of the stage box). */
const SPOTS = [
  { left: "6%", top: "8%" },
  { left: "70%", top: "4%" },
  { left: "2%", top: "62%" },
  { left: "72%", top: "66%" },
];

function Title({ text }: { text: string }) {
  return <>{text.split(/(\[[^\]]+\])/).map((p, i) => p.startsWith("[") ? <span key={i} className="text-[#C9BBFF]">{p.slice(1, -1)}</span> : <span key={i}>{p}</span>)}</>;
}

/** Alternative showcase: big Lumi with the four tools floating around her, then "your day with {app}" as a short timeline. */
export function CompanionShowcase() {
  const { t, tl } = useI18n();
  const tools = tl<string[]>("companion.tools");
  const whens = tl<string[]>("companion.whens");
  const whats = tl<string[]>("companion.whats");
  return (
    <div className="flex flex-1 flex-col text-center text-white">
      <h1 id="q16c" className="font-display text-[30px] leading-tight"><Title text={t("companion.title")} /></h1>
      <div className="relative mx-auto mt-4 h-[250px] w-full max-w-[340px]">
        <span aria-hidden className="companion-ring absolute left-1/2 top-1/2 h-[190px] w-[190px] rounded-full border border-white/25" />
        <span aria-hidden className="companion-ring absolute left-1/2 top-1/2 h-[190px] w-[190px] rounded-full border border-white/20" style={{ animationDelay: "1.6s" }} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><Lumi size={120} stage={2} emotion="happy" label="" /></div>
        {tools.map((label, i) => {
          const Icon = TOOL_ICONS[i]!;
          return (
            <span key={label} className="companion-bubble glass absolute flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold" style={{ ...SPOTS[i], animationDelay: `${0.4 + i * 0.35}s` }}>
              <Icon size={15} aria-hidden />{label}
            </span>
          );
        })}
      </div>
      <div className="glass mt-4 rounded-[28px] p-5 text-left">
        <p className="font-display mb-3 text-lg">{t("companion.dayTitle", { app: APP_NAME })}</p>
        <ul className="flex flex-col gap-3">
          {whens.map((w, i) => {
            const Icon = DAY_ICONS[i]!;
            return (
              <li key={w} className="showcase-pop flex items-center gap-3" style={{ animationDelay: `${1.9 + i * 0.5}s` }}>
                <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20"><Icon size={17} /></span>
                <span className="text-[15px] leading-snug"><b className="font-semibold">{w}</b> · {whats[i]}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
