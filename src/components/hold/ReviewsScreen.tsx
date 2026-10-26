import { Star } from "lucide-react";
import { useI18n } from "@/i18n";
import { EXAMPLE_PHOTOS, RATING, reviewsToShow } from "@/config/reviews";

export function reviewsAvailable(examples: { name: string; title: string; body: string }[]) {
  return reviewsToShow(examples).items.length > 0;
}

/** "Help others find us": rating summary (only with a real rating) and up to three review cards. */
export function ReviewsScreen() {
  const { t, tl } = useI18n();
  const { items, example } = reviewsToShow(tl<{ name: string; title: string; body: string }[]>("reviews.examples"));
  return (
    <>
      <div className="fade-up mb-6 text-center">
        <h1 className="text-[32px] leading-tight md:text-4xl">{t("reviews.title")}</h1>
        <p className="mx-auto mt-3 max-w-[330px] text-lg text-muted-foreground">{t("reviews.sub")}</p>
      </div>
      {RATING && (
        <div className="fade-up mb-6 flex items-center justify-center gap-8 text-center" style={{ "--d": "150ms" } as React.CSSProperties}>
          <div><div className="font-display text-5xl">{RATING.value}</div><div className="text-sm text-muted-foreground">{t("reviews.average")}</div></div>
          <div><div className="font-display text-3xl">{RATING.people}</div><div className="text-sm text-muted-foreground">{t("reviews.people")}</div></div>
        </div>
      )}
      <ul className="cascade flex flex-col gap-4">
        {items.map((r, i) => {
          const photo = example ? EXAMPLE_PHOTOS[i] : ("photo" in r ? r.photo : undefined);
          return (
          <li key={r.name} className="tone-light rounded-[24px] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              {photo
                ? <img src={photo} alt="" width={48} height={48} loading="lazy" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                : <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dfe3fb] font-medium text-[#2e3865]">{r.name.charAt(0)}</span>}
              <div className="flex-1">
                <div className="text-base font-medium">{r.name}</div>
                {/* {example ? (
                  <span className="rounded-md bg-[#f4b94e] px-2 py-0.5 text-xs font-semibold text-[#2e3865]">{t("reviews.example")}</span>
                ) : ("verified" in r && r.verified) ? (
                  <span className="rounded-md bg-[#2e3865] px-2 py-0.5 text-xs font-medium text-white">{t("reviews.verified")}</span>
                ) : null} */}
              </div>
              <div className="flex gap-0.5 text-[#f4b94e]" role="img" aria-label={t("reviews.stars")}>
                {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={16} fill="currentColor" strokeWidth={0} />)}
              </div>
            </div>
            <p className="mt-3 text-base font-semibold">{r.title}</p>
            <p className="mt-1 text-base leading-snug">{r.body}</p>
          </li>
          );
        })}
      </ul>
    </>
  );
}
