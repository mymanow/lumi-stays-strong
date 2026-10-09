import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/hold/AppShell";
import { Card, PageTitle } from "@/components/hold/Common";
import { TrashIcon } from "@/components/hold/Icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { supabase } from "@/integrations/supabase/client";
import { listVault, removeVault, type VaultItem } from "@/lib/vault";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Historique — Hold" },
      { name: "description", content: "Tes check-ins, tes résistances et ton coffre de messages non envoyés." },
      { property: "og:title", content: "Historique — Hold" },
      { property: "og:description", content: "Tes check-ins, tes résistances et ton coffre de messages non envoyés." },
    ],
  }),
  component: () => <AppShell><History /></AppShell>,
});

function History() {
  const { t, lang } = useI18n();
  const { session } = useApp();
  const fmt = (d: string, time = false) => new Date(d).toLocaleDateString(lang, time ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" } : { weekday: "short", day: "numeric", month: "short" });
  const checkins = useQuery({ queryKey: ["checkins", session?.user.id], enabled: !!session, queryFn: async () => (await supabase.from("checkins").select("*").order("date", { ascending: false }).limit(100)).data ?? [] });
  const events = useQuery({ queryKey: ["events", session?.user.id], enabled: !!session, queryFn: async () => (await supabase.from("contact_events").select("*").order("occurred_at", { ascending: false }).limit(200)).data ?? [] });
  const [vault, setVault] = useState<VaultItem[]>([]);
  useEffect(() => { listVault().then(setVault); }, []);
  const ev = events.data ?? [];

  const tab = "min-h-11 flex-1 rounded-xl data-[state=active]:bg-surface data-[state=active]:text-foreground";
  return (
    <div>
      <PageTitle>{t("history.title")}</PageTitle>
      <Tabs defaultValue="checkins">
        <TabsList className="mb-6 flex h-auto w-full rounded-2xl border border-line bg-background p-1">
          <TabsTrigger value="checkins" className={tab}>{t("history.tabs.checkins")}</TabsTrigger>
          <TabsTrigger value="events" className={tab}>{t("history.tabs.events")}</TabsTrigger>
          <TabsTrigger value="vault" className={tab}>{t("history.tabs.vault")}</TabsTrigger>
        </TabsList>
        <TabsContent value="checkins" className="flex flex-col gap-3">
          {checkins.data?.length === 0 && <p className="text-muted-foreground">{t("history.noCheckins")}</p>}
          {checkins.data?.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium capitalize">{fmt(c.date + "T12:00:00")}</p>
                <p className="text-sm text-muted-foreground">{t("history.mood", { n: c.mood })} · {t("history.urge", { n: c.urge })}</p>
              </div>
              {c.triggers?.length > 0 && <p className="mt-2 text-sm text-muted-foreground">{c.triggers.map((k) => t(`options.triggers.${k}`)).join(", ")}</p>}
              {c.note && <p className="mt-2 break-words">{c.note}</p>}
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="events" className="flex flex-col gap-3">
          <div className="mb-2 flex gap-3 text-sm">
            <span className="rounded-full bg-secondary/15 px-3 py-1 text-secondary">{t("history.resistances", { n: ev.filter((e) => e.type === "resistance").length })}</span>
            <span className="rounded-full bg-reset/15 px-3 py-1 text-reset">{t("history.relapses", { n: ev.filter((e) => e.type === "relapse").length })}</span>
          </div>
          {ev.length === 0 && <p className="text-muted-foreground">{t("history.noEvents")}</p>}
          {ev.map((e) => (
            <Card key={e.id} className="flex items-center justify-between p-4">
              <span className={e.type === "resistance" ? "text-secondary" : "text-reset"}>{t(`history.${e.type}`)}{e.trigger ? ` · ${t(`options.triggers.${e.trigger}`)}` : ""}</span>
              <span className="text-sm text-muted-foreground">{fmt(e.occurred_at, true)}</span>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="vault" className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t("history.vaultInfo")}</p>
          {vault.length === 0 && <p className="text-muted-foreground">{t("history.vaultEmpty")}</p>}
          {vault.map((v) => (
            <Card key={v.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="whitespace-pre-wrap break-words">{v.text}</p>
                <button type="button" aria-label={t("common.delete")} onClick={async () => { await removeVault(v.id); setVault(await listVault()); }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background"><TrashIcon /></button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{fmt(v.createdAt, true)}</p>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
