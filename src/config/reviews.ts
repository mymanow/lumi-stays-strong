/**
 * Social proof for the onboarding "Help others find us" screen.
 *
 * Only add REAL reviews from real users who agreed to be quoted (and a RATING you can back up from the store).
 * While REVIEWS is empty the screen shows clearly labelled "Exemple" placeholder cards (see i18n
 * `reviews.examples`: the texts supplied by the owner, Elodie B. / Sébastien H., FR + EN) so the design is visible. Set SHOW_PLACEHOLDERS to false before launch to skip the screen until
 * real reviews exist. Never invent reviews, names or figures.
 */
export type Review = { name: string; title: string; body: string; verified?: boolean; photo?: string };

export const REVIEWS: Review[] = [];

/** Portraits for the placeholder cards, in the same order as `reviews.examples` (Elodie B., Sébastien H.). Replace with real, consented photos. */
export const EXAMPLE_PHOTOS: (string | undefined)[] = ["/reviews/emma.jpg", "/reviews/lucas.jpg"];

/** Placeholder cards while there are no real reviews. Turn off before launch. */
export const SHOW_PLACEHOLDERS = true;

/** Fill in only with a real store rating, e.g. { value: "4.8", people: "1 200+" }. */
export const RATING: { value: string; people: string } | null = null;

/** Real reviews, else the labelled placeholders while SHOW_PLACEHOLDERS is on; an empty list means the screen is skipped. */
export function reviewsToShow<T extends { name: string; title: string; body: string }>(examples: T[]): { items: (Review | T)[]; example: boolean } {
  if (REVIEWS.length > 0) return { items: REVIEWS.slice(0, 3), example: false };
  return SHOW_PLACEHOLDERS ? { items: examples, example: true } : { items: [], example: false };
}

/** Placeholder portraits above the three stories of the plan-ready screen (ready.storyPeople, same order).
 *  Generic silhouettes: replace with real, consented photos. */
export const STORY_PHOTOS = ["/reviews/placeholder-1.svg", "/reviews/placeholder-2.svg", "/reviews/placeholder-3.svg"];
