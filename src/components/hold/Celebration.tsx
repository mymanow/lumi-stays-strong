import { useEffect, useMemo, useState } from "react";

const COLORS = ["#FFFFFF", "#E4DCFF", "#C9D6FF", "#B79CFF", "#F4D58A"];
const COUNT = 28;
const TOTAL_MS = 4400;
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Small deterministic generator so the particles do not change between renders. */
function rng(seed: number) {
  let a = seed;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * Calm one-shot celebration around its parent's centre: two soft rings and a gentle "rain" of small dots, stars and
 * petals that rise in an arc, drift down and fade. Removes itself after ~4s. Nothing at all with reduced motion.
 * Place it inside a `relative` box centred on the thing being celebrated. `rise`/`fall` scale how far the shapes go up and down
 * (use a small rise and a big fall when the thing sits at the very top of the screen).
 */
export function Celebration({ onDone, rise = 1, fall = 1 }: { onDone?: (() => void) | undefined; rise?: number; fall?: number }) {
  const [alive, setAlive] = useState(() => !reduced());
  const bits = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: COUNT }, (_, i) => {
      const side = r() < 0.5 ? -1 : 1;
      const dx = side * (20 + r() * 150);
      return {
        i, dx, dx2: dx * (1.1 + r() * 0.5) + (r() - 0.5) * 40,
        up: -(90 + r() * 130) * rise, down: (40 + r() * 150) * fall,
        size: 5 + r() * 7, dur: 2.6 + r() * 1.2, delay: 0.4 + r() * 0.8,
        color: COLORS[Math.floor(r() * COLORS.length)]!, shape: ["dot", "star", "petal"][Math.floor(r() * 3)]!,
      };
    });
  }, [rise, fall]);

  useEffect(() => {
    if (!alive) { onDone?.(); return; }
    const id = window.setTimeout(() => { setAlive(false); onDone?.(); }, TOTAL_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!alive) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
      {[0, 1].map((k) => <span key={k} className="celebrate-ring" style={{ animationDelay: `${0.35 + k * 0.45}s` }} />)}
      {bits.map((b) => (
        <span key={b.i} className={`celebrate-bit celebrate-${b.shape}`}
          style={{ "--dx": `${b.dx}px`, "--dx2": `${b.dx2}px`, "--up": `${b.up}px`, "--down": `${b.down}px`, width: b.size, height: b.size, background: b.shape === "star" ? undefined : b.color, color: b.color, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` } as React.CSSProperties} />
      ))}
    </div>
  );
}
