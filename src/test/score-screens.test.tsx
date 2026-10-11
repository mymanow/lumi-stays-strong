import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/i18n';
import { ScoreCalculation, ScoreProfile } from '@/components/hold/ScoreScreens';
import { calculateScore } from '@/lib/score';
vi.mock('@tanstack/react-router', async original => ({ ...await original<typeof import('@tanstack/react-router')>(), useHydrated: () => false }));
afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); });
describe('calculation transition', () => {
  it.each([[false,3000],[true,1000]])('reduced motion %s lasts %i milliseconds', (reduced, duration) => {
    vi.useFakeTimers(); window.matchMedia = vi.fn().mockReturnValue({ matches: reduced });
    const complete = vi.fn(); render(<I18nProvider><ScoreCalculation onComplete={complete} /></I18nProvider>);
    act(() => vi.advanceTimersByTime(duration-1)); expect(complete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1)); expect(complete).toHaveBeenCalledTimes(1);
  });
  it('profile Back returns directly via its callback without starting another transition', () => {
    const back = vi.fn(); const complete = vi.fn();
    render(<I18nProvider><ScoreProfile result={calculateScore({})} onBack={back} onContinue={complete} /></I18nProvider>);
    fireEvent.click(screen.getByRole('button',{ name: 'Retour' })); expect(back).toHaveBeenCalledTimes(1); expect(complete).not.toHaveBeenCalled();
  });
});
