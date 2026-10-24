import { BookOpen, Brain, HeartHandshake, MessageCircle, Sparkles, Timer, Wind, type LucideIcon } from "lucide-react";
import { useI18n } from "@/i18n";
import { APP_NAME } from "@/config/app";
import { Lumi } from "./Lumi";

/**
 * "You are in good hands": what Hold is built on, as a small tree that flows into Lumi.
 * Only true claims: an AI coach, recognised anti-urge techniques (breathing, delaying, the user's own reasons) and
 * the breakup research the app cites (see the science screen). No team photos or experts the app does not have:
 * each node shows icons, and the light sweeps across the nodes one after the other.
 */
function Cluster({ icons }: { icons: [LucideIcon, LucideIcon, LucideIcon] }) {
  const [Left, Main, Right] = icons;
  return (
    <span aria-hidden className="relative flex h-12 items-end justify-center">
      <span className="hands-avatar -mr-2 mb-0.5 h-9 w-9"><Left size={16} /></span>
      <span className="hands-avatar relative z-[1] h-12 w-12 bg-white text-[#3B3F9E]"><Main size={22} /></span>
      <span className="hands-avatar -ml-2 mb-0.5 h-9 w-9"><Right size={16} /></span>
    </span>
  );
}

function Node({ label, icons, delay }: { label: string; icons: [LucideIcon, LucideIcon, LucideIcon]; delay: number }) {
  return (
    <div className="flex flex-col items-center">
      <Cluster icons={icons} />
      <span className="hands-pill mt-2 whitespace-nowrap rounded-full px-4 py-2.5 text-[14px] font-medium leading-tight" style={{ animationDelay: `${delay}s` }}>{label}</span>
    </div>
  );
}

export function GoodHands({ name }: { name: string }) {
  const { t } = useI18n();
  return (
    <div className="relative">
      <div aria-hidden className="hands-light pointer-events-none absolute -inset-x-6 -top-24 bottom-0" />
      <div className="fade-up relative mb-6 text-center">
        <h1 className="text-[34px] leading-tight md:text-4xl">{name ? t("info.hands.title", { name }) : t("info.hands.titleNoName")}</h1>
        <p className="mx-auto mt-3 max-w-[340px] text-[17px] leading-snug text-muted-foreground">{t("info.hands.sub")}</p>
      </div>

      <figure className="fade-up relative mx-auto flex max-w-[340px] flex-col items-center" style={{ "--d": "200ms" } as React.CSSProperties}>
        <figcaption className="sr-only">{t("info.hands.caption")}</figcaption>
        <Node label={t("info.hands.research")} icons={[Brain, BookOpen, HeartHandshake]} delay={0} />

        {/* From the top node down to the two branches. */}
        <svg aria-hidden viewBox="0 0 340 44" className="h-11 w-full" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.6" strokeLinecap="round">
          <path d="M170 0 V20 M83 44 V34 Q83 22 95 22 H245 Q257 22 257 34 V44" />
        </svg>

        <div className="grid w-full grid-cols-2 gap-3">
          <Node label={t("info.hands.coach")} icons={[MessageCircle, Sparkles, Brain]} delay={1.2} />
          <Node label={t("info.hands.techniques")} icons={[Timer, Wind, HeartHandshake]} delay={2.4} />
        </div>

        {/* The two branches meet and point down to Lumi. */}
        <svg aria-hidden viewBox="0 0 340 46" className="h-[46px] w-full" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M83 0 V12 Q83 24 95 24 H158 L170 40 L182 24 H245 Q257 24 257 12 V0" />
        </svg>

        <div className="relative mt-3 flex flex-col items-center">
          <span aria-hidden className="hands-halo absolute left-1/2 top-[48px] h-40 w-40 rounded-full" />
          <Lumi size={64} stage={3} emotion="happy" label="" />
          <span className="mt-1 text-[15px] font-medium">{t("info.hands.app", { app: APP_NAME })}</span>
        </div>
      </figure>
    </div>
  );
}
