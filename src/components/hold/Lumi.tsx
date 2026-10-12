import { useEffect, useId, useRef, useState } from "react";
import type { LumiStage } from "@/lib/domain";
import { COMPANION_NAME } from "@/config/app";

export type LumiEmotion = "neutral" | "happy" | "support" | "proud" | "tired";

const STAGE: Record<LumiStage, { body: number; stars: number; halo: number }> = {
  1: { body: 0.78, stars: 0, halo: 0.15 },
  2: { body: 1, stars: 1, halo: 0.3 },
  3: { body: 1, stars: 2, halo: 0.5 },
  4: { body: 1.08, stars: 3, halo: 0.75 },
};

const INK = "#1A202C";
const star = (x: number, y: number, s = 1) =>
  `M ${x} ${y - 5 * s} L ${x + 2 * s} ${y - 1 * s} L ${x + 6 * s} ${y} L ${x + 2 * s} ${y + 1 * s} L ${x} ${y + 5 * s} L ${x - 2 * s} ${y + 1 * s} L ${x - 6 * s} ${y} L ${x - 2 * s} ${y - 1 * s} Z`;

function Face({ emotion }: { emotion: LumiEmotion }) {
  switch (emotion) {
    case "happy":
      return (
        <g>
          <path d="M 36 56 Q 40 50 44 56" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M 56 56 Q 60 50 64 56" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M 42 66 Q 50 76 58 66 Z" fill={INK} />
          <circle cx="30" cy="60" r="6" fill="#F43F5E" opacity="0.6" />
          <circle cx="70" cy="60" r="6" fill="#F43F5E" opacity="0.6" />
        </g>
      );
    case "support":
      return (
        <g>
          <path d="M 37 53 Q 40 57 43 53" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M 57 53 Q 60 57 63 53" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M 45 68 Q 50 64 55 68" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M 35 46 Q 40 43 45 47" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M 55 47 Q 60 43 65 46" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      );
    case "proud":
      return (
        <g>
          <line x1="35" y1="55" x2="45" y2="55" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <line x1="55" y1="55" x2="65" y2="55" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <path d="M 40 65 Q 50 78 60 65" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d={star(22, 45, 0.8)} fill="#ECC94B" />
          <path d={star(78, 45, 0.8)} fill="#ECC94B" />
        </g>
      );
    case "tired":
      return (
        <g>
          <path d="M 36 53 L 44 57" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M 56 57 L 64 53" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <circle cx="50" cy="68" r="4" fill={INK} />
          <path d="M 76 45 C 76 45 82 52 80 56 C 78 59 74 57 74 54 Z" fill="#63B3ED" />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="40" cy="55" r="4" fill={INK} />
          <circle cx="60" cy="55" r="4" fill={INK} />
          <path d="M 45 68 Q 50 71 55 68" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="32" cy="62" r="5" fill="#F43F5E" opacity="0.4" />
          <circle cx="68" cy="62" r="5" fill="#F43F5E" opacity="0.4" />
        </g>
      );
  }
}

type Props = {
  size?: number;
  stage?: LumiStage;
  emotion?: LumiEmotion;
  /** Gentle levitation (3s). Off for tiny icons. Always off with prefers-reduced-motion. */
  breathe?: boolean;
  /** Explicit scale (guided breathing in SOS). */
  scale?: number;
  className?: string;
  label?: string;
  transitionMs?: number;
  /** Tap on Lumi: squash & stretch bounce + brief happy face. */
  interactive?: boolean;
};

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function Lumi({ size = 64, stage = 1, emotion = "neutral", breathe = true, scale, className = "", label, transitionMs = 0, interactive = false }: Props) {
  const uid = useId().replace(/:/g, "");
  const s = STAGE[stage];
  const box = size * 1.5;
  const bodyRef = useRef<HTMLDivElement>(null);
  const [temp, setTemp] = useState<LumiEmotion | null>(null);
  const shown = temp ?? emotion;
  const first = useRef(true);

  // Squash & stretch when the expression changes (400ms), skipped on first render and reduced motion.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduced() || !bodyRef.current?.animate) return;
    bodyRef.current.animate([{ transform: "scale(1.1, 0.9)" }, { transform: "scale(0.9, 1.1)" }, { transform: "scale(1)" }], { duration: 400, easing: "ease-out" });
  }, [shown]);

  useEffect(() => {
    if (!temp) return;
    const id = window.setTimeout(() => setTemp(null), 2400);
    return () => window.clearTimeout(id);
  }, [temp]);

  const tap = () => {
    if (!reduced() && bodyRef.current?.animate) {
      bodyRef.current.animate([{ transform: "scale(1)" }, { transform: "scale(1.15, 0.85)" }, { transform: "scale(0.9, 1.1)" }, { transform: "scale(1)" }], { duration: 400, easing: "ease-out" });
    }
    setTemp("happy");
  };

  const float = breathe && scale === undefined && !reduced();
  const inner = (
    <div ref={bodyRef} style={{ width: "100%", height: "100%", transformOrigin: "50% 90%" }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden focusable="false" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={`${uid}-g`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#A3BFFA" />
            <stop offset="100%" stopColor="#7F9CF5" />
          </linearGradient>
          <radialGradient id={`${uid}-h`}>
            <stop offset="0%" stopColor="#fff" stopOpacity={s.halo} />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="55" r="56" fill={`url(#${uid}-h)`} />
        <g transform={`translate(50 90) scale(${s.body}) translate(-50 -90)`}>
          <path d="M 50 15 C 25 15 15 45 15 65 C 15 85 30 90 50 90 C 70 90 85 85 85 65 C 85 45 75 15 50 15 Z" fill={`url(#${uid}-g)`} stroke="#fff" strokeWidth="2" strokeOpacity="0.8" />
          <Face emotion={shown} />
        </g>
        {[star(14, 18, 0.9), star(88, 24, 0.7), star(80, 4, 0.6)].slice(0, s.stars).map((d, i) => (
          <path key={i} d={d} fill="#F4B94E" style={reduced() ? undefined : { animation: `lumi-twinkle ${2.4 + i * 0.7}s ease-in-out ${i * 0.4}s infinite`, transformOrigin: "center", transformBox: "fill-box" }} />
        ))}
      </svg>
    </div>
  );

  const wrapStyle = {
    width: box, height: box,
    "--lumi-lift": `${Math.max(4, size * 0.1)}px`,
    animation: float ? "lumi-float 3s ease-in-out infinite" : undefined,
    transform: scale !== undefined ? `scale(${scale})` : undefined,
    transition: transitionMs ? `transform ${transitionMs}ms ease-in-out` : undefined,
  } as React.CSSProperties;

  const name = label ?? COMPANION_NAME;
  if (interactive) {
    return (
      <button type="button" onClick={tap} aria-label={name} className={`inline-flex cursor-pointer rounded-full ${className}`} style={wrapStyle}>
        {inner}
      </button>
    );
  }
  return (
    <div role={name ? "img" : undefined} aria-label={name || undefined} aria-hidden={name ? undefined : true} className={`inline-flex ${className}`} style={wrapStyle}>
      {inner}
    </div>
  );
}
