import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/hold/AppShell";
import { PageTitle } from "@/components/hold/Common";
import { MediaBox, RedFlagsList } from "@/components/hold/Keepsakes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/reminders")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Mes rappels — Hold" },
      { name: "description", content: "Ta liste de red flags, tes photos, vocaux et vidéos pour les moments de doute. Tout reste sur ton appareil." },
      { property: "og:title", content: "Mes rappels — Hold" },
      { property: "og:description", content: "Ta liste de red flags, tes photos, vocaux et vidéos pour les moments de doute. Tout reste sur ton appareil." },
    ],
  }),
  component: () => <AppShell><Reminders /></AppShell>,
});

function Reminders() {
  const { t } = useI18n();
  const tab = "min-h-11 flex-1 rounded-full data-[state=active]:bg-white data-[state=active]:text-[#2e3865]";
  return (
    <div>
      <PageTitle>{t("rem.title")}</PageTitle>
      <p className="-mt-3 mb-6 text-muted-foreground">{t("rem.sub")}</p>
      <Tabs defaultValue="flags">
        <TabsList className="mb-6 flex h-auto w-full glass rounded-full p-1">
          <TabsTrigger value="flags" className={tab}>{t("rem.tabs.flags")}</TabsTrigger>
          <TabsTrigger value="media" className={tab}>{t("rem.tabs.media")}</TabsTrigger>
        </TabsList>
        <TabsContent value="flags"><RedFlagsList /></TabsContent>
        <TabsContent value="media"><MediaBox /></TabsContent>
      </Tabs>
    </div>
  );
}
