import { Star } from "lucide-react";
import { useI18n } from "@/i18n";
import { reviewsToShow } from "@/config/reviews";
import { FEATURE_KINDS, type FeatureKind } from "./FeatureScreens";
import { Lumi } from "./Lumi";

/* Original illustrations: Lumi with one prop per story (no third-party artwork). */

function Swirl({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 90 50" className={className} fill="none" stroke="#C9B8FF" strokeWidth="4" strokeLinecap="round">
      <path d="M8 34 C 8 14, 38 10, 40 26 C 42 40, 22 40, 24 28 C 26 16, 52 14, 62 26 C 70 36, 80 30, 86 22" />
    </svg>
  );
}

function Mug({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 60 70" className={className}>
      <path d="M22 4 C 16 10, 28 14, 22 22 M34 2 C 28 9, 40 13, 34 21" stroke="#F7B8D2" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="8" y="28" width="36" height="38" rx="8" fill="#F7B8D2" />
      <path d="M44 36 h6 a8 8 0 0 1 0 16 h-6" stroke="#F7B8D2" strokeWidth="5" fill="none" />
      <rect x="8" y="28" width="36" height="7" rx="3" fill="#F9CDE0" />
    </svg>
  );
}

function Calendar({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 70 70" className={className}>
      <rect x="4" y="10" width="62" height="56" rx="10" fill="#FFF3C4" />
      <rect x="4" y="10" width="62" height="14" rx="7" fill="#F4B94E" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const x = 12 + (i % 3) * 18, y = 32 + Math.floor(i / 3) * 16;
        return i < 4
          ? <path key={i} d={`M${x} ${y + 5} l4 4 l7 -9`} stroke="#5B3A96" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          : <circle key={i} cx={x + 5} cy={y + 5} r="3" fill="#E6D9A8" />;
      })}
    </svg>
  );
}

function Book({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 90 60" className={className}>
      <path d="M45 12 C 34 4, 16 4, 6 8 V 54 C 16 50, 34 50, 45 58 Z" fill="#9EE8C6" />
      <path d="M45 12 C 56 4, 74 4, 84 8 V 54 C 74 50, 56 50, 45 58 Z" fill="#B6F0D5" />
      <path d="M45 12 V 58" stroke="#5DBE97" strokeWidth="2.5" />
      <path d="M14 20 h20 M14 28 h18 M56 20 h20 M56 28 h16" stroke="#5DBE97" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Bulb({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 40 56" className={className}>
      <path d="M20 4 a15 15 0 0 1 9 27 c-2 2-3 4-3 7 h-12 c0-3-1-5-3-7 a15 15 0 0 1 9-27z" fill="#FFE27A" />
      <rect x="14" y="40" width="12" height="5" rx="2" fill="#E6C65A" />
      <rect x="15" y="46" width="10" height="4" rx="2" fill="#E6C65A" />
    </svg>
  );
}

function Illustration({ kind }: { kind: FeatureKind }) {
  return (
    <div aria-hidden className="relative mx-auto h-[170px] w-[240px]">
      <div className="absolute left-1/2 top-3 -translate-x-1/2"><Lumi size={96} stage={3} emotion={kind === "tools" ? "neutral" : "happy"} breathe={false} label="" /></div>
      {kind === "tools" && (<><Swirl className="absolute right-2 top-2 w-20" /><Mug className="absolute bottom-2 right-6 w-12" /></>)}
      {kind === "progress" && (<><Calendar className="absolute bottom-3 right-4 w-16" /><Swirl className="absolute left-0 top-6 w-16 -scale-x-100" /></>)}
      {kind === "clarity" && (<><Book className="absolute bottom-2 left-1/2 w-24 -translate-x-1/2" /><Bulb className="absolute right-6 top-2 w-8" /></>)}
    </div>
  );
}

/**
 * After "Avec Hold, tu peux :" on the plan-ready screen: three stories stacked vertically (illustration, title, text),
 * each followed by five stars with a review and a separator line. Reviews come from the reviews config, in order
 * (real ones once there are some, else the owner's example texts); a story without a review shows no stars.
 */
export function PlanStories() {
  const { t, tl } = useI18n();
  const { items, example } = reviewsToShow(tl<{ name: string; title: string; body: string }[]>("reviews.examples"));
  const ordered = items.length > 1 ? [items[1]!, items[0]!, ...items.slice(2)] : items; // Sébastien H. first: it describes what the app really does

  return (
    <section className="fade-up mt-12" style={{ "--d": "900ms" } as React.CSSProperties}>
      {FEATURE_KINDS.map((k, i) => {
        const review = ordered[i];
        return (
          <article key={k} className="flex flex-col items-center pt-10 text-center first:pt-0">
            <Illustration kind={k} />
            <h3 className="font-display mt-6 text-[26px] leading-[1.2]">{t(`features.${k}.title`)}</h3>
            <p className="mt-3 max-w-[340px] text-[16px] leading-snug text-white/85">{t(`features.${k}.sub`)}</p>
            {review && (
              <figure className="mt-8">
                <div className="flex justify-center gap-2 text-[#F4B94E]" role="img" aria-label={t("reviews.stars")}>
                  {[0, 1, 2, 3, 4].map((n) => <Star key={n} size={26} fill="currentColor" strokeWidth={0} />)}
                </div>
                <blockquote className="mx-auto mt-6 max-w-[330px] text-[15px] leading-snug text-white/90">« {review.body} »</blockquote>
                {example && t("reviews.example") && (
                  <figcaption className="mt-3 flex justify-center"><span className="rounded-md bg-[#f4b94e] px-2 py-0.5 text-xs font-semibold text-[#2e3865]">{t("reviews.example")}</span></figcaption>
                )}
              </figure>
            )}
            <hr className="mx-auto mt-10 w-4/5 border-t border-white/25" />
          </article>
        );
      })}
    </section>
  );
}
