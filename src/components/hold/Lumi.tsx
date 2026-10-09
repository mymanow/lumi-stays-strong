import type { CSSProperties } from "react";
import type { LumiStage } from "@/lib/domain";
import { COMPANION_NAME } from "@/config/app";

const GLOW: Record<LumiStage, { blur: number; spread: number; alpha: number; halo: number }> = {
  1: { blur: 0.35, spread: 0.05, alpha: 0.45, halo: 0 },
  2: { blur: 0.6, spread: 0.12, alpha: 0.6, halo: 0 },
  3: { blur: 0.9, spread: 0.25, alpha: 0.7, halo: 0.35 },
  4: { blur: 1.3, spread: 0.45, alpha: 0.85, halo: 0.6 },
};

type Props = { size?: number; stage?: LumiStage; breathe?: boolean; scale?: number; className?: string; label?: string; transitionMs?: number };

export function Lumi({ size = 64, stage = 1, breathe = true, scale, className = "", label, transitionMs = 0 }: Props) {
  const g = GLOW[stage];
  const orb = stage === 1 ? size * 0.7 : size;
  const style: CSSProperties = {
    width: orb, height: orb,
    background: "radial-gradient(circle at 35% 30%, #fff6dc 0%, var(--lumi) 45%, #e9b867 100%)",
    boxShadow: `0 0 ${size * g.blur}px ${size * g.spread}px color-mix(in oklab, var(--lumi) ${g.alpha * 100}%, transparent)`,
    transform: scale !== undefined ? `scale(${scale})` : undefined,
    transition: transitionMs ? `transform ${transitionMs}ms ease-in-out` : undefined,
  };
  const eye = Math.max(3, orb * 0.08);
  return (
    <div role="img" aria-label={label ?? COMPANION_NAME} className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size * 1.6, height: size * 1.6 }}>
      {g.halo > 0 && (
        <div aria-hidden className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, color-mix(in oklab, var(--lumi) ${g.halo * 40}%, transparent) 0%, transparent 70%)` }} />
      )}
      <div aria-hidden className={`relative rounded-full ${breathe && scale === undefined ? "lumi-breathe" : ""}`} style={style}>
        <span className="absolute rounded-full" style={{ width: eye, height: eye, background: "#12151C", top: "44%", left: "34%" }} />
        <span className="absolute rounded-full" style={{ width: eye, height: eye, background: "#12151C", top: "44%", right: "34%" }} />
      </div>
    </div>
  );
}
