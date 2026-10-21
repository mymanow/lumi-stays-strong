import { Check } from "lucide-react";
import { useI18n } from "@/i18n";

function Title({ text }: { text: string }) {
  return <>{text.split(/(\[[^\]]+\])/).map((p, i) => p.startsWith("[") ? <span key={i} className="text-[#8B6FE8]">{p.slice(1, -1)}</span> : <span key={i}>{p}</span>)}</>;
}

/** Our own friendly bell (original drawing): swings from its top, little "ding" arcs appear and fade. */
function Bell() {
  return (
    <svg viewBox="0 0 200 200" className="h-[230px] w-[230px]" aria-hidden>
      <g className="bell-ding" style={{ transformOrigin: "100px 34px" }}>
        <path d="M 110 52 C 150 56 160 92 162 128 L 176 146 C 180 152 176 158 170 158 L 38 158 C 32 158 28 152 32 146 L 46 128 C 48 92 60 56 100 52 Z" fill="#2E3865" transform="translate(8 6)" />
        <path d="M 100 46 C 140 50 152 88 154 124 L 168 142 C 172 148 168 154 162 154 L 38 154 C 32 154 28 148 32 142 L 46 124 C 48 88 60 50 100 46 Z" fill="#CFC4FF" />
        <path d="M 66 70 C 74 60 84 56 92 55" stroke="#fff" strokeOpacity="0.8" strokeWidth="7" strokeLinecap="round" fill="none" />
        <circle cx="100" cy="38" r="9" fill="#2E3865" />
        <circle cx="82" cy="104" r="6" fill="#2E3865" /><circle cx="118" cy="104" r="6" fill="#2E3865" />
        <circle cx="84" cy="102" r="2" fill="#fff" /><circle cx="120" cy="102" r="2" fill="#fff" />
        <path d="M 88 120 Q 100 132 112 120 Z" fill="#2E3865" />
        <ellipse cx="68" cy="118" rx="7" ry="4.5" fill="#F4A6C8" opacity="0.7" /><ellipse cx="132" cy="118" rx="7" ry="4.5" fill="#F4A6C8" opacity="0.7" />
        <path d="M 86 164 a 14 12 0 0 0 28 0 Z" fill="#2E3865" />
      </g>
      <g stroke="#8B6FE8" strokeWidth="5" strokeLinecap="round" fill="none">
        <path className="bell-arc" d="M 168 66 q 14 14 0 28" style={{ animationDelay: "0.2s" }} />
        <path className="bell-arc" d="M 32 66 q -14 14 0 28" style={{ animationDelay: "0.2s" }} />
        <path className="bell-arc" d="M 180 52 q 24 28 0 56" style={{ animationDelay: "0.45s" }} />
        <path className="bell-arc" d="M 20 52 q -24 28 0 56" style={{ animationDelay: "0.45s" }} />
      </g>
    </svg>
  );
}

/** Soft pitch for the daily reminder (the actual time and toggle come later, in the "plan" step). */
export function ReminderIntro() {
  const { t } = useI18n();
  return (
    <div className="flex flex-1 flex-col items-center text-center" style={{ color: "#2e3865" }}>
      <h1 id="q17r" className="font-display mt-10 text-[30px] leading-tight"><Title text={t("reminderIntro.title")} /></h1>
      <div className="relative mt-10 flex flex-1 items-center justify-center">
        <span aria-hidden className="absolute h-[300px] w-[300px] rounded-full" style={{ background: "radial-gradient(circle, rgba(139,111,232,0.35) 0%, rgba(139,111,232,0) 70%)" }} />
        <div className="relative"><Bell /></div>
      </div>
      <p className="mt-6 flex items-center gap-2 text-base font-semibold"><Check size={18} className="text-[#58B368]" strokeWidth={3} aria-hidden />{t("reminderIntro.note")}</p>
    </div>
  );
}
