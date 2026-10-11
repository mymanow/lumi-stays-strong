import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/hold/AppShell";
import { Card, LangSwitch, PageTitle } from "@/components/hold/Common";
import { ChevronIcon } from "@/components/hold/Icons";
import { AccountLinker } from "@/components/hold/AccountLinker";
import { OwnReasons } from "@/components/hold/OwnReasons";
import { ReminderControl } from "@/components/hold/ReminderControl";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { clearVault } from "@/lib/vault";
import { MANAGE_SUBSCRIPTION_URL } from "@/config/app";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Réglages — Hold" },
      { name: "description", content: "Langue, compte, abonnement, confidentialité et suppression de tes données." },
      { property: "og:title", content: "Réglages — Hold" },
      { property: "og:description", content: "Langue, compte, abonnement, confidentialité et suppression de tes données." },
    ],
  }),
  component: () => <AppShell><Settings /></AppShell>,
});

function Row({ to, label }: { to: "/lumi" | "/privacy" | "/terms" | "/crisis"; label: string }) {
  return (
    <Link to={to} className="flex min-h-13 items-center justify-between border-b border-line py-3 last:border-0">
      <span>{label}</span><ChevronIcon className="text-muted-foreground" />
    </Link>
  );
}

function Settings() {
  const { t } = useI18n();
  const { profile, updateProfile, premium, isAnonymous } = useApp();
  const del = useServerFn(deleteMyAccount);
  const [confirm, setConfirm] = useState(false);
  const [reminder, setReminder] = useState({ enabled: false, time: profile?.reminder_time?.slice(0, 5) ?? "21:30" });

  const doDelete = async () => {
    await del();
    await clearVault();
    localStorage.removeItem("hold_reasons");
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>{t("settings.title")}</PageTitle>
      <Card className="flex items-center justify-between">
        <span className="font-medium">{t("settings.language")}</span>
        <LangSwitch onChange={(l) => updateProfile({ language: l })} />
      </Card>
      <ReminderControl value={reminder} onChange={setReminder} />
      <section><OwnReasons showList /></section>
      <Card>
        <h2 className="mb-1 text-xl font-semibold">{t("settings.saveAccount")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("account.sub")}</p>
        <AccountLinker />
      </Card>
      <Card>
        <h2 className="mb-1 text-xl font-semibold">{t("settings.subscription")}</h2>
        <p className={`mb-4 ${premium ? "text-secondary" : "text-muted-foreground"}`}>{premium ? t("settings.active") : t("settings.inactive")}</p>
        {premium ? (
          <a href={MANAGE_SUBSCRIPTION_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-line px-4">{t("settings.manage")}</a>
        ) : (
          <Link to="/subscribe" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground">{t("settings.subscribe")}</Link>
        )}
      </Card>
      <Card className="py-1">
        <Row to="/lumi" label={t("settings.lumi")} />
        <Row to="/crisis" label={t("settings.crisis")} />
        <Row to="/privacy" label={t("settings.privacy")} />
        <Row to="/terms" label={t("settings.terms")} />
      </Card>
      {!isAnonymous && (
        <button type="button" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }} className="min-h-12 rounded-2xl border border-line">{t("settings.signOut")}</button>
      )}
      <button type="button" onClick={() => setConfirm(true)} className="min-h-12 rounded-2xl border border-reset/50 text-reset">{t("settings.delete")}</button>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="rounded-2xl border-line bg-surface">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">{t("settings.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("settings.deleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="min-h-11 rounded-xl bg-reset text-reset-foreground">{t("settings.deleteConfirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {profile && null}
    </div>
  );
}
