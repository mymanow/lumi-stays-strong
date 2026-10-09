import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useI18n } from "@/i18n";
import { BackIcon, PhoneIcon } from "@/components/hold/Icons";

export const Route = createFileRoute("/crisis")({
  head: () => ({
    meta: [
      { title: "Ressources d'urgence — Hold" },
      { name: "description", content: "Lignes d'écoute gratuites : 3114 en France, 988 aux États-Unis, Samaritans 116 123 au Royaume-Uni et en Irlande." },
      { property: "og:title", content: "Ressources d'urgence — Hold" },
      { property: "og:description", content: "Lignes d'écoute gratuites : 3114, 988, Samaritans 116 123." },
    ],
  }),
  component: Crisis,
});

function Crisis() {
  const { t } = useI18n();
  const router = useRouter();
  const lines = [
    { label: t("crisis.fr"), tel: "3114" },
    { label: t("crisis.us"), tel: "988" },
    { label: t("crisis.uk"), tel: "116123" },
  ];
  return (
    <div className="mx-auto min-h-screen max-w-xl px-6 py-6">
      <button type="button" onClick={() => router.history.back()} aria-label={t("common.back")} className="mb-4 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-surface"><BackIcon /></button>
      <h1 className="text-3xl font-semibold">{t("crisis.title")}</h1>
      <p className="mt-3 mb-8 text-muted-foreground">{t("crisis.intro")}</p>
      <ul className="flex flex-col gap-3">
        {lines.map((l) => (
          <li key={l.tel}>
            <a href={`tel:${l.tel}`} className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-3 text-lg">
              <PhoneIcon className="text-primary" /> {l.label}
            </a>
          </li>
        ))}
        <li>
          <a href="https://findahelpline.com" target="_blank" rel="noreferrer" className="flex min-h-14 items-center rounded-2xl border border-line px-5 text-lg underline-offset-4 hover:underline">{t("crisis.other")}</a>
        </li>
      </ul>
    </div>
  );
}
