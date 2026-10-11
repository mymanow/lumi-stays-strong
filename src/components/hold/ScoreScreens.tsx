import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Check, ArrowLeft } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Lumi } from './Lumi';
import { CrisisLink, PrimaryButton, SecondaryButton } from './Common';
import { needsExtraSupport, type ScoreResult } from '@/lib/score';

export function ScoreRing({ score, animate = false, duration = 1000, children }: { score: number; animate?: boolean; duration?: number; children: ReactNode }) {
  return <div className="relative mx-auto flex h-40 w-40 shrink-0 items-center justify-center">
    <svg viewBox="0 0 160 160" className="absolute inset-0 -rotate-90" aria-hidden>
      <circle cx="80" cy="80" r="74" fill="none" stroke="var(--line)" strokeWidth="6" />
      <circle cx="80" cy="80" r="74" fill="none" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100-score} className={animate ? 'score-ring-fill' : ''} style={{ '--score-offset': 100-score, '--score-duration': `${duration}ms` } as CSSProperties} />
    </svg>{children}
  </div>;
}
export function ScoreCalculation({ onComplete }: { onComplete: () => void }) {
  const { t, tl } = useI18n();
  const [done, setDone] = useState(0);
  const callback = useRef(onComplete);
  callback.current = onComplete;
  useEffect(() => {
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1000 : 3000;
    const timers = [1, 2].map(n => window.setTimeout(() => setDone(n), duration*n/3));
    timers.push(window.setTimeout(() => callback.current(), duration));
    return () => timers.forEach(clearTimeout);
  }, []);
  return <div className="mx-auto flex min-h-svh max-w-[480px] flex-col px-5 py-6">
    <div className="flex flex-1 flex-col justify-center">
      <ScoreRing score={100} animate duration={3000}><Lumi size={72} stage={2} breathe={false} /></ScoreRing>
      <h1 className="mt-6 text-center text-3xl font-semibold">{t('profileScore.preparing')}</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">{t('profileScore.local')}</p>
      <ul className="mx-auto mt-7 flex w-full max-w-xs flex-col gap-4" aria-live="polite">
        {tl<string[]>('profileScore.status').map((line, index) => <li key={line} className="flex items-center gap-3"><Status done={index < done} pending={index > done} /><span>{line}</span></li>)}
      </ul>
    </div>
    <p className="text-center text-xs text-muted-foreground">{t('profileScore.delay')}</p>
  </div>;
}
function Status({ done = false, pending = false }: { done?: boolean; pending?: boolean }) {
  return done ? <Check aria-hidden className="h-4 w-4 shrink-0 text-secondary" /> : <span aria-hidden className={`mx-1 h-2.5 w-2.5 shrink-0 rounded-full ${pending ? 'border border-muted-foreground' : 'bg-primary'}`} />;
}
export function ScoreProfile({ result, animate = false, onContinue, onBack }: { result: ScoreResult; animate?: boolean; onContinue: () => void; onBack: () => void }) {
  const { t } = useI18n();
  return <div className="mx-auto flex min-h-svh max-w-[480px] flex-col px-5 pb-4 pt-5">
    <SecondaryButton onClick={onBack} aria-label={t('common.back')} className="mb-2 min-h-9 w-9 self-start border-0 bg-transparent px-0"><ArrowLeft className="mx-auto h-5 w-5" /></SecondaryButton>
    <h1 className="text-3xl font-semibold leading-tight">{t('profileScore.title')}</h1>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t('profileScore.sub')}</p>
    <div className="mt-5"><ScoreRing score={result.score} animate={animate}><div className="text-center"><p className="font-display text-5xl font-semibold">{result.score}</p><p className="text-xs text-muted-foreground">{t('profileScore.outOf')}</p></div></ScoreRing></div>
    <p className="mt-4 text-center text-lg font-semibold text-primary">{t(`profileScore.levels.${result.level}`)}</p>
    {(['difficulty','supportive'] as const).map(kind => <section key={kind} className="mt-6">
      <h2 className="mb-3 font-sans text-sm font-semibold text-muted-foreground">{t(kind === 'difficulty' ? 'profileScore.harder' : 'profileScore.helps')}</h2>
      <ul className="flex flex-col gap-3">{result.factors[kind].map(key => <li key={key} className="flex min-h-11 items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-sm"><Status done={kind === 'supportive'} /><span>{t(`profileScore.factors.${key}`)}</span></li>)}</ul>
    </section>)}
    <div className="mt-4 flex items-center gap-2"><Lumi size={22} stage={2} breathe={false} /><p className="text-sm text-muted-foreground">{t('settings.lumi')} : « {t('profileScore.line')} »</p></div>
    {needsExtraSupport(result.level) && <p className="mt-3 text-sm text-muted-foreground">{t('profileScore.encourage')}</p>}
    <div className="mt-auto pt-7"><PrimaryButton onClick={onContinue}>{t('common.next')}</PrimaryButton><div className="flex justify-center"><CrisisLink /></div></div>
  </div>;
}
