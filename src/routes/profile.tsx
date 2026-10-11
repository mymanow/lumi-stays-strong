import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FullLoader } from '@/components/hold/Common';
import { ScoreProfile } from '@/components/hold/ScoreScreens';
import { useApp } from '@/lib/app-state';
import { calculateScore, readScoreFactors, levelForScore } from '@/lib/score';
export const Route = createFileRoute('/profile')({
  head: () => ({ meta: [
    { title: 'Mon profil no contact — Hold' },
    { name: 'description', content: 'Ton profil indicatif, tes moments difficiles et ce qui t’aide à tenir, avec Lumi.' },
    { property: 'og:title', content: 'Mon profil no contact — Hold' },
    { property: 'og:description', content: 'Une estimation indicative et privée, calculée sur ton appareil.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: ProfilePage,
});
function ProfilePage() {
  const { profile, ready } = useApp();
  const navigate = useNavigate();
  if (!ready || !profile) return <FullLoader />;
  const factors = readScoreFactors(profile.score_factors);
  const result = profile.difficulty_score != null && factors ? { score: profile.difficulty_score, level: levelForScore(profile.difficulty_score), factors, points: 0, computedAt: profile.score_computed_at ?? '' } : calculateScore(profile);
  return <ScoreProfile result={result} onBack={() => navigate({ to: '/history' })} onContinue={() => navigate({ to: '/history' })} />;
}
