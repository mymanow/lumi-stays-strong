import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/hold/AppShell";
import { Card, PageTitle } from "@/components/hold/Common";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { JOURNEY_KEYS, JOURNEY_STARTS, journeyIndexForDays, journeyProgress } from "@/lib/journey";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Ton parcours — Hold" },
      { name: "description", content: "Les grandes étapes du no contact, avec des conseils adaptés à chacune." },
      { property: "og:title", content: "Ton parcours — Hold" },
      { property: "og:description", content: "Les grandes étapes du no contact, avec des conseils adaptés à chacune." },
    ],
  }),
  component: () => <AppShell><Journey /></AppShell>,
});

function Journey() {
  const { t, tl } = useI18n();
  const { profile } = useApp();
  const days = profile?.last_contact_at ? Math.floor((Date.now() - new Date(profile.last_contact_at).getTime()) / 86400000) : 0;
  const current = journeyIndexForDays(days);
  return (
    <div>
      <PageTitle>{t("journey.title")}</PageTitle>
      <p className="-mt-3 mb-6 text-muted-foreground">{t("journey.sub")}</p>
      <ol className="flex flex-col gap-4">
        {JOURNEY_KEYS.map((key, i) => {
          const start = JOURNEY_STARTS[i]!;
          const next = JOURNEY_STARTS[i + 1];
          const isCurrent = i === current;
          const tips = tl<string[]>(`journey.stages.${key}.tips`);
          return (
            <li key={key} aria-current={isCurrent ? "step" : undefined}>
              <Card className={isCurrent ? "ring-2 ring-primary/60" : i > current ? "opacity-80" : ""}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-2xl">{t(`journey.stages.${key}.title`)}</h2>
                  <span className="text-sm text-muted-foreground">{next === undefined ? t("journey.rangeOpen", { a: start }) : t("journey.range", { a: start, b: next - 1 })}</span>
                </div>
                {isCurrent && (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">{t("journey.here")} · {t("journey.day", { n: days })}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/50" aria-hidden><div className="h-full rounded-full bg-[var(--progress)]" style={{ width: `${Math.round(journeyProgress(days) * 100)}%` }} /></div>
                  </div>
                )}
                <p className="mt-3">{t(`journey.stages.${key}.feel`)}</p>
                <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-muted-foreground">{tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
