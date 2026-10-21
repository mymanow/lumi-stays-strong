import { useRouter } from "@tanstack/react-router";
import { useI18n, interpolate } from "@/i18n";
import { BackIcon } from "./Icons";

export function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const { t, tl } = useI18n();
  const router = useRouter();
  const items = tl<string[]>(`legal.${kind}`);
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-6">
      <button type="button" onClick={() => router.history.back()} aria-label={t("common.back")} className="mb-4 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-white/40"><BackIcon /></button>
      <h1 className="mb-6 text-4xl">{t(`legal.${kind}Title`)}</h1>
      <ul className="flex flex-col gap-4 leading-relaxed">
        {items.map((p) => <li key={p}>{interpolate(p)}</li>)}
      </ul>
    </div>
  );
}
