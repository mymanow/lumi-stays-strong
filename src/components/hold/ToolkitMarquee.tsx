import { Frown, Heart, Meh, Smile, Sparkles, Pin, type LucideIcon } from "lucide-react";
import { useI18n } from "@/i18n";
import { Lumi } from "./Lumi";

/** Illustrative mini versions of Hold's own screens (drawn in code, no screenshots, no real data). */
type Tone = "light" | "night";
const TONES: Record<Tone, { bg: string; ink: string; glass: string }> = {
  light: { bg: "linear-gradient(180deg,#e6e8fc 0%,#d3ccf7 100%)", ink: "#2e3865", glass: "rgba(255,255,255,0.65)" },
  night: { bg: "linear-gradient(180deg,#2f3873 0%,#4b4a9e 100%)", ink: "#ffffff", glass: "rgba(255,255,255,0.16)" },
};
const cq = (n: number) => `${n}cqw`;

function Phone({ tone = "light", children }: { tone?: Tone; children: React.ReactNode }) {
  const c = TONES[tone];
  return (
    <div className="relative mb-4 aspect-[9/18] w-full shrink-0 overflow-hidden rounded-[22px] border border-white/70 shadow-[0_18px_40px_-18px_rgba(46,56,101,0.55)]"
      style={{ background: c.bg, color: c.ink, containerType: "inline-size" }}>
      <span className="absolute left-1/2 top-[3cqw] h-[3cqw] w-[22cqw] -translate-x-1/2 rounded-full" style={{ background: c.ink, opacity: 0.25 }} />
      <div className="flex h-full flex-col px-[8cqw] pb-[8cqw] pt-[12cqw]" style={{ fontSize: cq(6.4), lineHeight: 1.25 }}>{children}</div>
    </div>
  );
}
const Heading = ({ children }: { children: React.ReactNode }) => <p className="font-display" style={{ fontSize: cq(9), lineHeight: 1.1 }}>{children}</p>;

function CounterScreen() {
  const { t } = useI18n();
  return (
    <Phone>
      <p style={{ opacity: 0.75 }}>{t("home.since")}</p>
      <div className="mx-auto mt-[6cqw] flex aspect-square w-[62cqw] flex-col items-center justify-center rounded-full border-[1.6cqw]" style={{ borderColor: "rgba(46,56,101,0.18)", boxShadow: "inset 0 0 0 1.6cqw rgba(255,255,255,0.0), 0 0 0 0 transparent", borderTopColor: "#2e3865", borderRightColor: "#2e3865" }}>
        <span className="font-display" style={{ fontSize: cq(24), lineHeight: 1 }}>9</span>
        <span style={{ opacity: 0.75 }}>{t("home.units.d")}</span>
      </div>
      <div className="mt-auto rounded-full py-[3.4cqw] text-center font-bold" style={{ background: "#f4b94e", color: "#2e3865" }}>{t("home.sos")}</div>
    </Phone>
  );
}

function SosScreen() {
  const { t } = useI18n();
  return (
    <Phone tone="night">
      <Heading>{t("sos.breatheTitle")}</Heading>
      <div className="relative mx-auto mt-[8cqw] flex aspect-square w-[66cqw] items-center justify-center">
        <span className="absolute inset-0 rounded-full border-[1.4cqw]" style={{ borderColor: "rgba(255,255,255,0.25)", borderTopColor: "#f4b94e", borderRightColor: "#f4b94e" }} />
        <Lumi size={46} stage={3} emotion="support" label="" breathe={false} />
      </div>
      <p className="mt-auto text-center font-display" style={{ fontSize: cq(9) }}>{t("sos.inhale")}</p>
    </Phone>
  );
}

function CoachScreen() {
  const { t } = useI18n();
  return (
    <Phone>
      <div className="flex items-center gap-[3cqw]"><Lumi size={22} stage={2} label="" breathe={false} /><span className="font-display" style={{ fontSize: cq(8.5) }}>{t("coach.title")}</span></div>
      <p className="mt-[7cqw] rounded-[5cqw] p-[4cqw]" style={{ background: TONES.light.glass }}>{t("coach.intro")}</p>
      <p className="ml-auto mt-[4cqw] max-w-[78%] rounded-[5cqw] rounded-br-[1cqw] p-[3.4cqw] font-semibold" style={{ background: "#f4b94e", color: "#2e3865" }}>{t("coach.modes.urge")}</p>
    </Phone>
  );
}

const MOODS: { Icon: LucideIcon; color: string }[] = [
  { Icon: Frown, color: "#C0443B" }, { Icon: Meh, color: "#B83C7A" }, { Icon: Smile, color: "#5252C9" }, { Icon: Heart, color: "#7440D1" }, { Icon: Sparkles, color: "#0B7F70" },
];
function CheckinScreen() {
  const { t } = useI18n();
  return (
    <Phone>
      <Heading>{t("checkin.mood")}</Heading>
      <div className="mt-[5cqw] grid grid-cols-5 gap-[1.6cqw]">
        {MOODS.map(({ Icon, color }, i) => (
          <span key={i} className="flex aspect-[3/4] items-center justify-center rounded-[3cqw]" style={{ background: i === 3 ? "#fff" : TONES.light.glass }}><Icon style={{ width: cq(9), height: cq(9), color }} strokeWidth={2.25} /></span>
        ))}
      </div>
      <p className="mt-[8cqw] font-display" style={{ fontSize: cq(9) }}>{t("checkin.urge")}</p>
      <div className="mt-[4cqw] flex items-end gap-[2.4cqw]">
        {[1, 2, 3, 4, 5].map((n) => <span key={n} className="w-full rounded-[1cqw]" style={{ height: cq(4 + n * 3), background: n <= 2 ? "#5A4BCF" : "rgba(46,56,101,0.18)" }} />)}
      </div>
      <div className="mt-auto rounded-full py-[3.4cqw] text-center font-bold text-white" style={{ background: "linear-gradient(90deg,#6366F1,#8B7CF8)" }}>{t("checkin.save")}</div>
    </Phone>
  );
}

function ProgressScreen() {
  const { t } = useI18n();
  return (
    <Phone>
      <Heading>{t("progress.moodUrge")}</Heading>
      <svg viewBox="0 0 100 70" className="mt-[6cqw] w-full" fill="none" aria-hidden>
        {[10, 30, 50].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgba(46,56,101,0.14)" />)}
        <polyline points="0,52 14,46 28,50 42,38 56,40 70,28 84,22 100,14" stroke="#5252C9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="0,14 14,20 28,18 42,28 56,30 70,40 84,46 100,52" stroke="#C2570C" strokeWidth="3" strokeDasharray="6 4" strokeLinecap="round" />
      </svg>
      <div className="mt-auto grid grid-cols-2 gap-[3cqw]">
        {[t("progress.current"), t("progress.best")].map((l, i) => (
          <div key={l} className="rounded-[4cqw] p-[3cqw] text-center" style={{ background: TONES.light.glass }}>
            <p className="font-display" style={{ fontSize: cq(12), lineHeight: 1 }}>{i ? "21" : "9"}</p>
            <p style={{ fontSize: cq(5), opacity: 0.75 }}>{l}</p>
          </div>
        ))}
      </div>
    </Phone>
  );
}

function FlagsScreen({ samples }: { samples: string[] }) {
  const { t } = useI18n();
  return (
    <Phone>
      <Heading>{t("rem.flagsTitle")}</Heading>
      <ul className="mt-[6cqw] flex flex-col gap-[3cqw]">
        {samples.slice(0, 3).map((s, i) => (
          <li key={s} className="flex items-center gap-[2cqw] rounded-[4cqw] p-[3.2cqw]" style={{ background: i === 0 ? "#fff" : TONES.light.glass }}>
            <span className="flex-1" style={{ fontSize: cq(5.6) }}>{s}</span>
            {i === 0 && <Pin style={{ width: cq(6), height: cq(6) }} />}
          </li>
        ))}
      </ul>
    </Phone>
  );
}

function JourneyScreen() {
  const { t } = useI18n();
  return (
    <Phone>
      <p style={{ opacity: 0.75 }}>{t("journey.day", { n: 9 })}</p>
      <Heading>{t("journey.stages.s2.title")}</Heading>
      <div className="mt-[5cqw] h-[2cqw] overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.7)" }}><div className="h-full w-[48%] rounded-full" style={{ background: "#2e3865" }} /></div>
      <p className="mt-[6cqw]" style={{ fontSize: cq(5.6) }}>{t("journey.stages.s2.tips.0")}</p>
      <div className="mt-auto flex items-center gap-[3cqw] rounded-[4cqw] p-[3.4cqw]" style={{ background: TONES.light.glass }}>
        <span className="flex h-[8cqw] w-[8cqw] shrink-0 items-center justify-center rounded-full border border-[#2e3865]/40 bg-white/60" />
        <span style={{ fontSize: cq(5.2) }}>{t("journey.task")}</span>
      </div>
    </Phone>
  );
}

function MilestoneScreen() {
  const { t } = useI18n();
  return (
    <Phone tone="night">
      <div className="relative mx-auto mt-[6cqw] flex aspect-square w-[60cqw] items-center justify-center">
        <span className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(244,185,78,0.6) 0%, transparent 70%)" }} />
        <Lumi size={54} stage={3} emotion="proud" label="" breathe={false} />
      </div>
      <p className="mt-auto text-center font-display" style={{ fontSize: cq(9.5), lineHeight: 1.15 }}>{t("milestone.lines.7")}</p>
    </Phone>
  );
}

function VaultScreen() {
  const { t } = useI18n();
  return (
    <Phone>
      <Heading>{t("history.tabs.vault")}</Heading>
      <p className="mt-[3cqw]" style={{ fontSize: cq(5), opacity: 0.75 }}>{t("history.vaultInfo")}</p>
      <div className="mt-[6cqw] flex flex-col gap-[3cqw]">
        {[88, 70, 80].map((w, i) => <span key={i} className="block rounded-[3cqw] p-[3cqw]" style={{ background: TONES.light.glass }}><span className="block h-[2cqw] rounded-full" style={{ width: `${w}%`, background: "rgba(46,56,101,0.35)" }} /><span className="mt-[2cqw] block h-[2cqw] w-[45%] rounded-full" style={{ background: "rgba(46,56,101,0.2)" }} /></span>)}
      </div>
    </Phone>
  );
}

function Column({ children, dir, seconds, offset }: { children: React.ReactNode[]; dir: "up" | "down"; seconds: number; offset: number }) {
  // The list is rendered twice and moved by exactly one copy (-50%), so the loop has no seam.
  return (
    <div className="w-[33%] overflow-visible">
      <div className={dir === "up" ? "marquee-up" : "marquee-down"} style={{ animationDuration: `${seconds}s`, animationDelay: `-${offset}s` }}>
        {children}{children.map((c, i) => <div key={`dup${i}`}>{c}</div>)}
      </div>
    </div>
  );
}

/** Three tilted columns of Hold's screens: the outer two drift up, the middle one drifts down. */
export function ToolkitMarquee() {
  const { t, tl } = useI18n();
  const samples = tl<string[]>("info.toolkit.samples") ?? [];
  const col1 = [<CounterScreen key="a" />, <CoachScreen key="b" />, <FlagsScreen key="c" samples={samples} />];
  const col2 = [<SosScreen key="a" />, <ProgressScreen key="b" />, <MilestoneScreen key="c" />];
  const col3 = [<CheckinScreen key="a" />, <JourneyScreen key="b" />, <VaultScreen key="c" />];
  const items = tl<string[]>("info.toolkit.items") ?? [];
  return (
    <div>
      <ul className="sr-only">{items.map((i) => <li key={i}>{i}</li>)}</ul>
      <div aria-hidden title={t("info.toolkit.title")} className="marquee-mask relative -mx-6 h-[min(62svh,560px)] overflow-hidden">
        <div className="absolute left-1/2 top-1/2 flex w-[135%] justify-center gap-[3.5%]" style={{ transform: "translate(-50%, -50%) rotate(-11deg)" }}>
          <Column dir="up" seconds={46} offset={4}>{col1}</Column>
          <Column dir="down" seconds={54} offset={14}>{col2}</Column>
          <Column dir="up" seconds={50} offset={24}>{col3}</Column>
        </div>
      </div>
    </div>
  );
}
