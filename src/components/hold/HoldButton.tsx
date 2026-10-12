import { useCallback, useEffect, useRef, useState } from "react";
import { Lumi } from "./Lumi";
import { useI18n } from "@/i18n";

const HOLD_MS = 2500;

export function HoldButton({ onComplete }: { onComplete: () => void }) {
  const { t } = useI18n();
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);
  const progressRef = useRef(0);
  const [announce, setAnnounce] = useState("");

  const stopRaf = () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = null; };

  const tick = useCallback((now: number) => {
    if (start.current === null) return;
    const p = Math.min(1, (now - start.current) / HOLD_MS);
    progressRef.current = p;
    setProgress(p);
    if (p >= 1) {
      start.current = null; stopRaf(); setDone(true);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(60);
      setTimeout(onComplete, 1000);
      return;
    }
    raf.current = requestAnimationFrame(tick);
  }, [onComplete]);

  const begin = () => {
    if (done || start.current !== null) return;
    start.current = performance.now() - progressRef.current * HOLD_MS * 0; // always restart from 0
    progressRef.current = 0;
    raf.current = requestAnimationFrame(tick);
  };
  const release = () => {
    if (done) return;
    start.current = null; stopRaf();
    // smooth reset
    const from = progressRef.current; const t0 = performance.now();
    const back = (now: number) => {
      const k = Math.min(1, (now - t0) / 300);
      const v = from * (1 - k); progressRef.current = v; setProgress(v);
      if (k < 1 && start.current === null) raf.current = requestAnimationFrame(back);
    };
    raf.current = requestAnimationFrame(back);
  };

  useEffect(() => () => stopRaf(), []);
  useEffect(() => {
    const pct = Math.round(progress * 4) * 25;
    setAnnounce(done ? t("commit.done") : pct > 0 ? t("commit.progress", { n: pct }) : "");
  }, [Math.round(progress * 4), done]); // eslint-disable-line react-hooks/exhaustive-deps

  const R = 92; const C = 2 * Math.PI * R;
  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        aria-label={t("commit.hold")}
        aria-describedby="hold-hint"
        className="no-select relative flex h-56 w-56 items-center justify-center glass rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); begin(); }}
        onPointerUp={release}
        onPointerCancel={release}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); begin(); } else if (e.key === " " || e.key === "Enter") e.preventDefault(); }}
        onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); release(); } }}
        onBlur={release}
      >
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200" aria-hidden>
          <circle cx="100" cy="100" r={R} stroke="var(--line)" strokeWidth="6" fill="none" />
          <circle cx="100" cy="100" r={R} stroke="var(--progress)" strokeWidth="8" fill="none" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
        </svg>
        <Lumi size={done ? 80 : 50 + progress * 25} stage={done ? 4 : progress > 0.5 ? 2 : 1} emotion={done ? "proud" : progress > 0 ? "happy" : "neutral"} />
      </button>
      <p id="hold-hint" className="text-center text-sm text-muted-foreground">{done ? t("commit.done") : t("commit.holdHint")}</p>
      <div aria-live="polite" className="sr-only">{announce}</div>
    </div>
  );
}
