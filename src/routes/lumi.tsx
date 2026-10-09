import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/hold/AppShell";
import { Card, PageTitle } from "@/components/hold/Common";
import { Lumi } from "@/components/hold/Lumi";
import { useI18n } from "@/i18n";
import type { LumiStage } from "@/lib/domain";

export const Route = createFileRoute("/lumi")({
  head: () => ({
    meta: [
      { title: "Lumi — Hold" },
      { name: "description", content: "Lumi grandit avec chaque jour sans contact. Si tu craques, elle ne s'éteint pas." },
      { property: "og:title", content: "Lumi — Hold" },
      { property: "og:description", content: "Lumi grandit avec chaque jour sans contact. Si tu craques, elle ne s'éteint pas." },
    ],
  }),
  component: () => <AppShell><LumiPage /></AppShell>,
});

function LumiPage() {
  const { t, tl } = useI18n();
  const stages = tl<{ name: string; desc: string }[]>("lumiPage.stages");
  return (
    <div>
      <PageTitle>{t("lumiPage.title")}</PageTitle>
      <p className="mb-6 text-muted-foreground">{t("lumiPage.intro")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {stages.map((s, i) => (
          <Card key={s.name} className="flex items-center gap-4">
            <Lumi size={44} stage={(i + 1) as LumiStage} />
            <div><p className="font-display text-lg">{s.name}</p><p className="text-sm text-muted-foreground">{s.desc}</p></div>
          </Card>
        ))}
      </div>
      <p className="mt-8 rounded-2xl border border-lumi/40 bg-lumi/10 p-5 font-display text-xl">{t("lumiPage.rule")}</p>
    </div>
  );
}
