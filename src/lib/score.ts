/** Indicative, non-clinical personalization only. No age, gender or reasons. */
export const SCORE_WEIGHTS = {
  contact: { recent: 10, week: 7, month: 4, established: 0 },
  duration: { lt_6m: 0, '6_12m': 5, '1_3y': 10, gt_3y: 15 },
  endedBy: { me: 0, mutual: 5, them: 12 },
  firstBreakup: { yes: 0, no: 10 },
  situation: { on_off: 15, toxic: 12, divorce_long_term: 12, ex_moved_on: 12, one_sided_love: 10, blocked_ghosted: 10, infidelity_healing: 10, first_love: 10, long_relationship_ended: 10, situationship_ended: 6, breakup: 6, mutual_breakup: 4 },
  motivation: { take_back_control: 0, move_on: 0, unsure: 5, win_back: 12 },
  emotion: { calm: 0, joy: 0, disgust: 4, anger: 6, fear: 8, sadness: 8 },
  triggers: { perTrigger: 3, cap: 12 },
} as const satisfies Record<string, Record<string, number>>;
export const SCORE_MAX = Object.entries(SCORE_WEIGHTS).reduce((sum, [key, values]) => sum + (key === 'triggers' ? SCORE_WEIGHTS.triggers.cap : Math.max(...Object.values(values))), 0);
export type DifficultyLevel = 'low' | 'moderate' | 'high' | 'very_high';
export type ScoreInput = { last_contact_at?: string | null; relationship_duration?: string | null; ended_by?: string | null; first_breakup?: boolean | null; situation_type?: string | null; motivation?: string | null; dominant_emotion?: string | null; triggers?: string[] | null };
export type ScoreFactors = { difficulty: string[]; supportive: string[] };
export type ScoreResult = { score: number; level: DifficultyLevel; factors: ScoreFactors; points: number; computedAt: string };
export const levelForScore = (score: number): DifficultyLevel => score < 25 ? 'low' : score < 50 ? 'moderate' : score < 75 ? 'high' : 'very_high';
const weight = (values: Record<string, number>, key?: string | null) => key ? values[key] ?? 0 : 0;
export function calculateScore(input: ScoreInput, now: Date = new Date()): ScoreResult {
  const elapsed = input.last_contact_at ? now.getTime() - new Date(input.last_contact_at).getTime() : NaN;
  const days = Math.max(0, Math.floor(elapsed / 86400000));
  const contact = !Number.isFinite(days) ? null : days <= 1 ? 'recent' : days <= 7 ? 'week' : days <= 30 ? 'month' : 'established';
  const first = input.first_breakup == null ? null : input.first_breakup ? 'yes' : 'no';
  const triggers = [...new Set(input.triggers ?? [])];
  const categories = [
    { key: contact ? `contact.${contact}` : 'fallback.start', points: weight(SCORE_WEIGHTS.contact, contact) },
    { key: `duration.${input.relationship_duration}`, points: weight(SCORE_WEIGHTS.duration, input.relationship_duration) },
    { key: `endedBy.${input.ended_by}`, points: weight(SCORE_WEIGHTS.endedBy, input.ended_by) },
    { key: `firstBreakup.${first}`, points: weight(SCORE_WEIGHTS.firstBreakup, first) },
    { key: `situation.${input.situation_type}`, points: weight(SCORE_WEIGHTS.situation, input.situation_type) },
    { key: `motivation.${input.motivation}`, points: weight(SCORE_WEIGHTS.motivation, input.motivation) },
    { key: `emotion.${input.dominant_emotion}`, points: weight(SCORE_WEIGHTS.emotion, input.dominant_emotion) },
    { key: triggers.includes('evening') ? 'triggers.evening' : 'triggers.selected', points: Math.min(SCORE_WEIGHTS.triggers.cap, triggers.length * SCORE_WEIGHTS.triggers.perTrigger) },
  ];
  const points = categories.reduce((sum, item) => sum + item.points, 0);
  const score = Math.max(0, Math.min(100, Math.round(100 * points / SCORE_MAX)));
  // Stable category order explicitly breaks ties, not the order of selected answers.
  const difficulty = categories.map((item, order) => ({ ...item, order })).filter(item => item.points > 0).sort((a, b) => b.points - a.points || a.order - b.order).slice(0, 2).map(item => item.key);
  for (const fallback of ['fallback.urge', 'fallback.waves']) if (difficulty.length < 2) difficulty.push(fallback);
  const supportive: string[] = [];
  if (input.motivation === 'take_back_control' || input.motivation === 'move_on') supportive.push(`motivation.${input.motivation}`);
  if (input.ended_by === 'me') supportive.push('endedBy.me');
  if (first === 'yes') supportive.push('firstBreakup.yes');
  if (input.dominant_emotion === 'calm' || input.dominant_emotion === 'joy') supportive.push('emotion.calm');
  if (input.relationship_duration === 'lt_6m') supportive.push('duration.lt_6m');
  if (contact === 'established') supportive.push('contact.established');
  supportive.push('fallback.start', 'fallback.lumi');
  return { score, level: levelForScore(score), factors: { difficulty, supportive: supportive.slice(0, 2) }, points, computedAt: now.toISOString() };
}
export function readScoreFactors(value: unknown): ScoreFactors | null {
  if (!value || typeof value !== 'object' || !('difficulty' in value) || !('supportive' in value)) return null;
  const { difficulty, supportive } = value;
  if (!Array.isArray(difficulty) || !Array.isArray(supportive) || difficulty.length !== 2 || supportive.length !== 2 || ![...difficulty, ...supportive].every(v => typeof v === 'string')) return null;
  return { difficulty, supportive };
}
export const defaultReminderTime = (triggers: string[]) => triggers.includes('evening') ? '22:00' : '21:30';
export const needsExtraSupport = (level?: string | null) => level === 'high' || level === 'very_high';
