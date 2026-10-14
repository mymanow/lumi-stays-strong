import { Lumi } from "./Lumi";
import { useI18n } from "@/i18n";

const FIREFLIES = [
  { left: "14%", bottom: "30%", x: "18px", d: "1.2s", dur: "8s" },
  { left: "26%", bottom: "42%", x: "-14px", d: "2.4s", dur: "9s" },
  { left: "38%", bottom: "26%", x: "10px", d: "0.6s", dur: "7.5s" },
  { left: "62%", bottom: "34%", x: "-16px", d: "1.8s", dur: "8.5s" },
  { left: "74%", bottom: "46%", x: "14px", d: "3.1s", dur: "9.5s" },
  { left: "86%", bottom: "28%", x: "-10px", d: "0.9s", dur: "7s" },
  { left: "50%", bottom: "22%", x: "8px", d: "2.8s", dur: "8s" },
] as const;

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

/** First meeting with Lumi, shown right after the name: she rises out of a dawn glow, then greets the user by name. */
export function Greeting({ name }: { name: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="relative flex h-80 w-full items-end justify-center" aria-hidden>
        <span className="greet-glow absolute bottom-6 h-72 w-72 rounded-full" />
        {[0, 1.7, 3.4].map((d) => <span key={d} className="greet-ring absolute bottom-10 h-40 w-40 rounded-full border border-white/50" style={{ animationDelay: `${d + 0.8}s` }} />)}
        {FIREFLIES.map((f, i) => (
          <span key={i} className="firefly absolute h-1.5 w-1.5 rounded-full bg-[#f4b94e]"
            style={{ left: f.left, bottom: f.bottom, "--x": f.x, animationDelay: f.d, animationDuration: f.dur } as React.CSSProperties} />
        ))}
        <div className="greet-arrive relative mb-16">
          <Lumi size={150} stage={3} emotion="happy" />
        </div>
      </div>
      <h1 className="fade-up text-4xl leading-tight md:text-5xl" style={delay(1300)}>{t("onb.greet.hello", { name })}</h1>
      <p className="fade-up mt-3 font-display text-2xl" style={delay(2000)}>{t("onb.greet.me")}</p>
      <p className="fade-up mt-4 max-w-[22rem] text-lg text-muted-foreground" style={delay(2700)}>{t("onb.greet.promise")}</p>
    </div>
  );
}
