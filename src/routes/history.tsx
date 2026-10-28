import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/hold/AppShell";
import { Card, PageTitle } from "@/components/hold/Common";
import { BackIcon, TrashIcon } from "@/components/hold/Icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import { listVault, removeVault, type VaultItem } from "@/lib/vault";
import { ProgressTab } from "@/components/hold/Progress";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const { session, profile } = useApp();
  const fmt = (d: string, time = false) => new Date(d).toLocaleDateString(lang, time ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" } : { weekday: "short", day: "numeric", month: "short" });
  const checkins = useQuery({ queryKey: ["checkins", session?.user.id], enabled: !!session, queryFn: async () => (await db.from("checkins").select("*").order("date", { ascending: false }).limit(100)).data ?? [] });
  const events = useQuery({ queryKey: ["events", session?.user.id], enabled: !!session, queryFn: async () => (await supabase.from("contact_events").select("*").order("occurred_at", { ascending: false }).limit(200)).data ?? [] });
  const [vault, setVault] = useState<VaultItem[]>([]);
  useEffect(() => { listVault().then(setVault); }, []);
  const ev = events.data ?? [];
  /** The É/R/P choices of a check-in, as labels. */
  const erp = (c: { emotions?: string[] | null; relational?: string[] | null; physical?: string[] | null }) => [
    ...(c.emotions ?? []).map((k) => t(`checkin.emotions.${k}`)),
    ...(c.relational ?? []).map((k) => t(`checkin.relational.${k}`)),
    ...(c.physical ?? []).map((k) => t(`checkin.physical.${k}`)),
  ];

  const tab = "min-h-11 flex-1 rounded-full data-[state=active]:bg-white data-[state=active]:text-[#2e3865]";
  return (
    <div>
      <Link to="/" className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-medium text-muted-foreground"><BackIcon width={18} height={18} aria-hidden />{t("nav.home")}</Link>
      <PageTitle>{t("home.journal")}</PageTitle>
      <Tabs defaultValue="progress">
        <TabsList className="mb-6 flex h-auto w-full glass rounded-full p-1">
          <TabsTrigger value="progress" className={tab}>{t("history.tabs.progress")}</TabsTrigger>
          <TabsTrigger value="checkins" className={tab}>{t("history.tabs.checkins")}</TabsTrigger>
          <TabsTrigger value="events" className={tab}>{t("history.tabs.events")}</TabsTrigger>
          <TabsTrigger value="vault" className={tab}>{t("history.tabs.vault")}</TabsTrigger>
        </TabsList>
        <TabsContent value="progress">
          <ProgressTab checkins={checkins.data ?? []} events={ev} lastContactAt={profile?.last_contact_at ?? null} bestSeconds={profile?.best_streak_seconds ?? 0} />
        </TabsContent>
        <TabsContent value="checkins" className="flex flex-col gap-3">
          {checkins.data?.length === 0 && <p className="text-muted-foreground">{t("history.noCheckins")}</p>}
          {checkins.data?.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium capitalize">{fmt(c.date + "T12:00:00")}</p>
                <p className="text-sm text-muted-foreground">{t("history.mood", { n: c.mood })} · {t("history.urge", { n: c.urge })}</p>
              </div>
              {erp(c).length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {erp(c).map((label) => (
                    <li key={label} className="rounded-full bg-white/55 px-2.5 py-0.5 text-xs font-medium text-[#2e3865]">{label}</li>
                  ))}
                </ul>
              )}
              {c.triggers?.length > 0 && <p className="mt-2 text-sm text-muted-foreground">{c.triggers.map((k) => t(`options.triggers.${k}`)).join(", ")}</p>}
              {c.note && <p className="mt-2 break-words">{c.note}</p>}
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="events" className="flex flex-col gap-3">
          <div className="mb-2 flex gap-3 text-sm">
            <span className="rounded-full bg-white/60 px-3 py-1 font-semibold text-foreground">{t("history.resistances", { n: ev.filter((e) => e.type === "resistance").length })}</span>
            <span className="rounded-full bg-reset/40 px-3 py-1 font-semibold text-foreground">{t("history.relapses", { n: ev.filter((e) => e.type === "relapse").length })}</span>
          </div>
          {ev.length === 0 && <p className="text-muted-foreground">{t("history.noEvents")}</p>}
          {ev.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-foreground">{t(`history.${e.type}`)}{e.trigger ? ` · ${t(`options.triggers.${e.trigger}`)}` : ""}</span>
                <span className="text-sm text-muted-foreground">{fmt(e.occurred_at, true)}</span>
              </div>
              {e.note && <p className="mt-2 break-words text-muted-foreground">{e.note}</p>}
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
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-white/40"><TrashIcon /></button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{fmt(v.createdAt, true)}</p>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
