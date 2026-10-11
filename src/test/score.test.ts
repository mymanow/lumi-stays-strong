import { describe, expect, it } from 'vitest';
import { calculateScore, SCORE_MAX, SCORE_WEIGHTS, levelForScore, defaultReminderTime, needsExtraSupport, type ScoreInput } from '@/lib/score';
import { addOwnReason, sosReasons } from '@/lib/reasons';
const now = new Date('2026-10-11T12:00:00Z');
const minimum: ScoreInput = { last_contact_at: '2026-08-01T12:00:00Z', relationship_duration: 'lt_6m', ended_by: 'me', first_breakup: true, motivation: 'move_on', dominant_emotion: 'calm', triggers: [] };
const maximum: ScoreInput = { last_contact_at: now.toISOString(), relationship_duration: 'gt_3y', ended_by: 'them', first_breakup: false, situation_type: 'on_off', motivation: 'win_back', dominant_emotion: 'sadness', triggers: ['evening','loneliness','alcohol','argument'] };
describe('indicative profile calculation', () => {
  it('derives maximum 94 from the config', () => { expect(SCORE_MAX).toBe(94); });
  it('all minimum answers give score 0', () => { const result = calculateScore(minimum, now); expect(result.points).toBe(0); expect(result.score).toBe(0); });
  it('all maximum answers give 94 points and score 100', () => { const result = calculateScore(maximum, now); expect(result.points).toBe(94); expect(result.score).toBe(100); });
  it.each([[24,'low'],[25,'moderate'],[49,'moderate'],[50,'high'],[74,'high'],[75,'very_high']] as const)('score %i has level %s', (score, level) => { expect(levelForScore(score)).toBe(level); });
  it('seven triggers have the same capped 12 points as four', () => { expect(calculateScore(maximum, now).points).toBe(94); expect(calculateScore({ ...maximum, triggers: ['a','b','c','d','e','f','g'] }, now).points).toBe(94); });
  it('breaks difficulty ties by specified category order', () => { expect(calculateScore(maximum, now).factors.difficulty).toEqual(['duration.gt_3y','situation.on_off']); });
  it('chooses supportive answers in priority order', () => { expect(calculateScore(minimum, now).factors.supportive).toEqual(['motivation.move_on','endedBy.me']); });
  it('uses two supportive fallbacks with all maximum answers', () => { expect(calculateScore(maximum, now).factors.supportive).toEqual(['fallback.start','fallback.lumi']); });
  it.each([[0,10],[1,10],[2,7],[7,7],[8,4],[30,4],[31,0]])('contact at %i days adds %i points', (days, expected) => { expect(calculateScore({ last_contact_at: new Date(now.getTime()-days*86400000).toISOString() }, now).points).toBe(expected); });
  for (const [category, field] of [['duration','relationship_duration'],['endedBy','ended_by'],['situation','situation_type'],['motivation','motivation'],['emotion','dominant_emotion']] as const) {
    for (const [answer, points] of Object.entries(SCORE_WEIGHTS[category])) it(`${category} ${answer} adds ${points}`, () => { expect(calculateScore({ [field]: answer }, now).points).toBe(points); });
  }
  it.each([[true,0],[false,10]] as const)('first breakup %s adds %i', (answer, points) => { expect(calculateScore({ first_breakup: answer }, now).points).toBe(points); });
  it('ignores age, gender, and reasons', () => { const input = { ...maximum, age: 100, gender: 'man', reasons: ['a','b','c'] }; expect(calculateScore(input, now)).toEqual(calculateScore(maximum, now)); });
  it('defaults evening reminder later to 22:00', () => { expect(defaultReminderTime(['evening'])).toBe('22:00'); expect(defaultReminderTime([])).toBe('21:30'); });
  it.each([['low',false],['moderate',false],['high',true],['very_high',true]] as const)('extra SOS prominence for %s is %s', (level, value) => { expect(needsExtraSupport(level)).toBe(value); });
});
describe('optional own reasons', () => {
  it('allows up to three and refuses a fourth', () => { expect(addOwnReason(['a','b'],'c')).toEqual(['a','b','c']); expect(addOwnReason(['a','b','c'],'d')).toEqual(['a','b','c']); });
  it('places own reasons before motivation and situation, capped at three', () => { expect(sosReasons(['mine'],'move_on','toxic', k=>k)).toEqual(['mine','commit.motivation.move_on','commit.situation.toxic']); expect(sosReasons(['a','b','c'],'move_on','toxic', k=>k)).toEqual(['a','b','c']); });
  it('uses motivation and situation without any required own reasons', () => { expect(sosReasons([],'win_back','breakup', k=>k)).toEqual(['commit.motivation.win_back','commit.situation.default']); });
});
