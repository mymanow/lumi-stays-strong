/**
 * Social proof for the onboarding "Help others find us" screen.
 *
 * Only add REAL reviews from real users who agreed to be quoted (and a RATING you can back up from the store).
 * While this list is empty the screen is skipped in production. In development it shows clearly labelled
 * examples (see i18n `reviews.examples`) so the design can be reviewed. Never invent reviews, names or figures.
 */
export type Review = { name: string; title: string; body: string; verified?: boolean };

export const REVIEWS: Review[] = [];

/** Fill in only with a real store rating, e.g. { value: "4.8", people: "1 200+" }. */
export const RATING: { value: string; people: string } | null = null;

/** "Real" reviews, or the labelled examples in development only; an empty list means the screen is skipped. */
export function reviewsToShow<T extends { name: string; title: string; body: string }>(examples: T[]): { items: (Review | T)[]; example: boolean } {
  if (REVIEWS.length > 0) return { items: REVIEWS.slice(0, 3), example: false };
  return import.meta.env.DEV ? { items: examples, example: true } : { items: [], example: false };
}
