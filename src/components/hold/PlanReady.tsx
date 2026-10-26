import { useRef, useState } from "react";
import { Bell, Flag, Heart, Lock, Map as MapIcon, MessageCircle, PenLine, ShieldCheck, Sun, TrendingUp, Wind, Zap, type LucideIcon } from "lucide-react";
import { useI18n } from "@/i18n";
import { Lumi } from "./Lumi";
import { Celebration } from "./Celebration";
import { PlanStories } from "./PlanStories";

const CHIP_ICONS: LucideIcon[] = [MessageCircle, Zap, Lock, Flag, MapIcon, TrendingUp, Bell, Heart];
const CARD_ICONS: LucideIcon[] = [ShieldCheck, Wind, Sun, PenLine, TrendingUp];

function ChipRow({ labels, icons, dir, seconds }: { labels: string[]; icons: LucideIcon[]; dir: "l" | "r"; seconds: number }) {
  return (
    <div className="marquee-x overflow-hidden" aria-hidden>
      <div className={`flex w-max gap-2 ${dir === "l" ? "chip-row-l" : "chip-row-r"}`} style={{ animationDuration: `${seconds}s` }}>
        {[0, 1].map((copy) => labels.map((l, i) => {
          const Icon = icons[i % icons.length]!;
          return (
            <span key={`${copy}-${l}`} className="glass flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
              <Icon size={15} aria-hidden />{l}
            </span>
          );
        }))}
      </div>
    </div>
  );
}

/** Target date shown on "your plan is ready": always today + 90 days, whatever goal was picked. */
export const PLAN_TARGET_DAYS = 90;

/** "Your plan is ready": target date (today + 90 days), feature chips drifting sideways and a swipeable benefits carousel. */
export function PlanReady({ name, celebrate = false, onCelebrated }: { name: string; goal?: string; celebrate?: boolean; onCelebrated?: () => void }) {
  const { t, tl, lang } = useI18n();
  const chips = tl<string[]>("ready.chips");
  const cards = tl<string[]>("ready.cards");
  const date: string | null = new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", { dateStyle: "long" }).format(new Date(Date.now() + PLAN_TARGET_DAYS * 86400000));
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const onScroll = () => {
    const el = scroller.current;
    if (!el || cards.length < 2) return;
    setActive(Math.round((el.scrollLeft / (el.scrollWidth - el.clientWidth)) * (cards.length - 1)));
  };
  const row1 = chips.slice(0, 4), row2 = chips.slice(4);
  return (
    <>
      <div className="fade-up text-center">
        <div className="relative mb-3 flex justify-center">{celebrate && <Celebration onDone={onCelebrated} />}<div className={celebrate ? "ready-hop" : ""}><Lumi size={72} stage={2} emotion="happy" label="" /></div></div>
        <h1 className="text-[32px] leading-tight md:text-4xl">{t("ready.title", { name })}</h1>
        <p className="mx-auto mt-3 max-w-[330px] text-lg text-muted-foreground">{date ? t("ready.subDate") : t("ready.subOpen")}</p>
      </div>
      {date && (
        <div className="fade-up mt-5 flex justify-center" style={{ "--d": "200ms" } as React.CSSProperties}>
          <div className={`glass rounded-full border-2 px-8 py-3 text-xl font-semibold ${celebrate ? "date-shine" : ""}`} style={{ borderColor: "rgba(214,204,255,.9)" }}>{date}</div>
        </div>
      )}
      <div className="fade-up mt-8 text-center" style={{ "--d": "350ms" } as React.CSSProperties}>
        <p className="font-display text-2xl">{t("ready.tagline")}</p>
        <p className="mt-2 tracking-wide text-muted-foreground">{t("ready.words")}</p>
      </div>
      <div className="fade-up -mx-6 mt-8 flex flex-col gap-2 border-t border-white/25 pt-6" style={{ "--d": "500ms" } as React.CSSProperties}>
        <ChipRow labels={row1} icons={CHIP_ICONS} dir="l" seconds={46} />
        <ChipRow labels={row2} icons={CHIP_ICONS.slice(4)} dir="r" seconds={52} />
      </div>
      <ul className="sr-only">{chips.map((c) => <li key={c}>{c}</li>)}</ul>
      <h2 className="fade-up mt-10 text-center text-[26px] leading-tight" style={{ "--d": "650ms" } as React.CSSProperties}>{t("ready.withTitle")}</h2>
      <div ref={scroller} onScroll={onScroll} className="fade-up -mx-6 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none]" style={{ "--d": "800ms" } as React.CSSProperties}>
        {cards.map((c, i) => {
          const Icon = CARD_ICONS[i % CARD_ICONS.length]!;
          return (
            <div key={c} className="glass flex h-[200px] w-[78%] shrink-0 snap-center flex-col items-center justify-center gap-5 rounded-[28px] px-6 text-center">
              <span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-full bg-white/25"><Icon size={32} /></span>
              <span className="text-lg leading-snug">{c}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-center gap-2" aria-hidden>
        {cards.map((c, i) => <span key={c} className={`h-2 w-2 rounded-full transition-colors ${i === active ? "bg-white" : "bg-white/35"}`} />)}
      </div>
      <PlanStories />
    </>
  );
}
