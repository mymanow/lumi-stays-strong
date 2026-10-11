export const MAX_OWN_REASONS = 3;
export function addOwnReason(reasons: string[], value: string): string[] {
  const text = value.trim().slice(0, 200);
  return text && reasons.length < MAX_OWN_REASONS && !reasons.includes(text) ? [...reasons, text] : reasons;
}
export function sosReasons(own: string[], motivation: string | null | undefined, situation: string | null | undefined, t: (key: string) => string): string[] {
  const mot = motivation && ['take_back_control','move_on','win_back','unsure'].includes(motivation) ? motivation : 'unsure';
  const sit = situation === 'toxic' || situation === 'one_sided_love' ? situation : 'default';
  return [...new Set([...own.filter(r => r.trim()), t(`commit.motivation.${mot}`), t(`commit.situation.${sit}`)])].slice(0, MAX_OWN_REASONS);
}
