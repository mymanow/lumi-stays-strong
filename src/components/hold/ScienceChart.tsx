import { useEffect, useRef } from "react";
import { useI18n } from "@/i18n";

/**
 * Animated conceptual sketch for the "science" screen: a glowing dot draws a slow curve ("stayed in touch"),
 * then a second dot draws a faster-rising curve ("no contact"). It carries no data and says so in its caption.
 * Driven by requestAnimationFrame so it can be skipped (final state) with prefers-reduced-motion.
 */
const GRAY = "M56 200 C 84 152 112 144 152 142 C 200 140 240 130 282 112";
const BLUE = "M56 200 C 66 160 80 140 108 134 C 130 130 136 108 156 92 C 176 76 196 82 214 84 C 240 86 258 66 282 40";
const START = 0.7, GRAY_S = 2.6, GAP_S = 0.8, BLUE_S = 3.0;
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function ScienceChart() {
  const { t } = useI18n();
  const gray = useRef<SVGPathElement>(null);
  const blue = useRef<SVGPathElement>(null);
  const grayDot = useRef<SVGGElement>(null);
  const head = useRef<SVGGElement>(null);
  const grayLabel = useRef<SVGTextElement>(null);
  const blueLabel = useRef<SVGTextElement>(null);

  useEffect(() => {
    const g = gray.current, b = blue.current, gd = grayDot.current, h = head.current, gl = grayLabel.current, bl = blueLabel.current;
    if (!g || !b || !gd || !h || !gl || !bl) return;
    const canMeasure = typeof g.getTotalLength === "function" && typeof g.getPointAtLength === "function";
    const reduced = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const gLen = canMeasure ? g.getTotalLength() : 0, bLen = canMeasure ? b.getTotalLength() : 0;
    const place = (el: SVGGElement, path: SVGPathElement, len: number, p: number) => {
      const pt = path.getPointAtLength(len * p);
      el.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
    };
    const render = (time: number) => {
      const gp = ease(clamp((time - START) / GRAY_S));
      const bp = ease(clamp((time - START - GRAY_S - GAP_S) / BLUE_S));
      g.style.strokeDashoffset = String(1 - gp);
      b.style.strokeDashoffset = String(1 - bp);
      // Round caps would leave a dot at the end of an undrawn path.
      g.style.visibility = gp > 0 ? "visible" : "hidden";
      b.style.visibility = bp > 0 ? "visible" : "hidden";
      if (canMeasure) {
        place(gd, g, gLen, gp);
        place(h, bp > 0 ? b : g, bp > 0 ? bLen : gLen, bp > 0 ? bp : 0);
      }
      gd.style.opacity = gp > 0 ? "1" : "0";
      h.style.opacity = gp >= 1 || gp === 0 ? "1" : "0";
      gl.style.opacity = String(clamp((gp - 0.85) / 0.15));
      bl.style.opacity = String(clamp((bp - 0.85) / 0.15));
    };
    if (reduced || !canMeasure) { render(START + GRAY_S + GAP_S + BLUE_S + 1); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const time = (now - t0) / 1000;
      render(time);
      if (time < START + GRAY_S + GAP_S + BLUE_S + 0.2) raf = requestAnimationFrame(tick);
    };
    render(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const Dot = ({ color, glow }: { color: string; glow: string }) => (
    <>
      <circle r="22" fill={glow} opacity="0.55" filter="url(#sc-blur)" />
      <circle r="16" fill="#fff" opacity="0.16" />
      <circle r="9" fill={color} />
    </>
  );

  return (
    <figure className="fade-up mx-auto w-full max-w-[380px]" style={{ "--d": "150ms" } as React.CSSProperties}>
      <svg viewBox="0 0 320 250" role="img" aria-label={t("info.science.sketchAlt")} className="w-full overflow-visible">
        <defs>
          <filter id="sc-blur" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="6" /></filter>
          <linearGradient id="sc-blue" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#C9D6FF" /><stop offset="1" stopColor="#B79CFF" /></linearGradient>
        </defs>
        {[40, 80, 120, 160].map((y) => <line key={y} x1="44" y1={y} x2="304" y2={y} stroke="#fff" strokeOpacity=".4" strokeDasharray="4 5" />)}
        <line x1="44" y1="20" x2="44" y2="200" stroke="#fff" strokeOpacity=".4" strokeWidth="1.5" />
        <line x1="44" y1="200" x2="304" y2="200" stroke="#fff" strokeOpacity=".4" strokeWidth="1.5" />
        {[0, 1, 2, 3].map((m) => <text key={m} x={56 + 64 * m} y="222" textAnchor="middle" fill="#fff" fontSize="13">{m}</text>)}
        <text x="174" y="246" textAnchor="middle" fill="#fff" fontSize="13">{t("info.science.axisX")}</text>
        <text x="14" y="110" textAnchor="middle" fill="#fff" fontSize="13" transform="rotate(-90 14 110)">{t("info.science.axisY")}</text>

        <path ref={gray} d={GRAY} pathLength={1} fill="none" stroke="#fff" strokeOpacity=".42" strokeWidth="4" strokeLinecap="round" strokeDasharray="1" style={{ strokeDashoffset: 1 }} />
        <path ref={blue} d={BLUE} pathLength={1} fill="none" stroke="url(#sc-blue)" strokeWidth="4" strokeLinecap="round" strokeDasharray="1" style={{ strokeDashoffset: 1 }} />
        <text ref={grayLabel} x="236" y="156" textAnchor="middle" fill="#fff" fillOpacity=".75" fontSize="13" style={{ opacity: 0 }}>{t("info.science.lineContact")}</text>
        <text ref={blueLabel} x="226" y="30" textAnchor="middle" fill="#fff" fontSize="17" className="font-display" style={{ opacity: 0 }}>{t("info.science.lineNoContact")}</text>

        <g ref={grayDot} style={{ opacity: 0 }} transform="translate(56 200)"><Dot color="#C7D2FE" glow="#C7D2FE" /></g>
        <g ref={head} transform="translate(56 200)"><Dot color="#fff" glow="#A855F7" /></g>
      </svg>
      <figcaption className="mt-1 text-center text-xs text-muted-foreground">{t("info.science.sketch")}</figcaption>
    </figure>
  );
}
