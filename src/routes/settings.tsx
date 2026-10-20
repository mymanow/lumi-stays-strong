import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
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
import { clearKeepsakes } from "@/lib/keepsakes";
import { localDateString } from "@/lib/domain";
import { MANAGE_SUBSCRIPTION_URL } from "@/config/app";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { PlanKey } from "@/config/whop";

// Loaded only when "subscribe" is pressed.
const CheckoutSheet = lazy(() => import("@/components/hold/CheckoutSheet").then((m) => ({ default: m.CheckoutSheet })));

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Réglages — Hold" },
      { name: "description", content: "Langue, compte, abonnement, confidentialité et suppression de tes données." },
      { property: "og:title", content: "Réglages — Hold" },
      { property: "og:description", content: "Langue, compte, abonnement, confidentialité et suppression de tes données." },
    ],
  }),
  component: () => <AppShell><Settings /></AppShell>,
});

function Row({ to, label }: { to: "/lumi" | "/privacy" | "/terms" | "/crisis" | "/reminders" | "/journey"; label: string }) {
  return (
    <Link to={to} className="flex min-h-13 items-center justify-between border-b border-white/60 py-3 last:border-0">
      <span>{label}</span><ChevronIcon className="text-muted-foreground" />
    </Link>
  );
}

function Settings() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<PlanKey>("quarterly");
  const { t } = useI18n();
  const { profile, updateProfile, premium, isAnonymous } = useApp();
  const del = useServerFn(deleteMyAccount);
  const [confirm, setConfirm] = useState(false);
  const [reminder, setReminder] = useState({ enabled: !!profile?.reminder_enabled, time: profile?.reminder_time?.slice(0, 5) ?? "21:30" });
  const [startDate, setStartDate] = useState(profile?.last_contact_at ? localDateString(new Date(profile.last_contact_at)) : localDateString());
  const changeReminder = (v: { enabled: boolean; time: string }) => { setReminder(v); void updateProfile({ reminder_enabled: v.enabled, reminder_time: v.time }); };

  const doDelete = async () => {
    await del();
    await clearVault();
    await clearKeepsakes();
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
      <ReminderControl value={reminder} onChange={changeReminder} />
      <Card className="py-1">
        <Row to="/reminders" label={t("settings.reminders")} />
        <Row to="/journey" label={t("journey.title")} />
      </Card>
      <Card>
        <h2 className="mb-1 text-2xl">{t("settings.startDate")}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{t("settings.startDateSub")}</p>
        <div className="flex gap-2">
          <input type="date" value={startDate} max={localDateString()} onChange={(e) => setStartDate(e.target.value)} aria-label={t("settings.startDate")}
            className="glass min-h-12 flex-1 rounded-full px-4 [color-scheme:light]" />
          <button type="button" disabled={!startDate} onClick={() => updateProfile({ last_contact_at: new Date(`${startDate}T00:00:00`).toISOString() })}
            className="min-h-12 rounded-full bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-40">{t("settings.startDateSave")}</button>
        </div>
      </Card>
      <section><OwnReasons showList /></section>
      <Card>
        <h2 className="mb-1 text-2xl">{t("settings.saveAccount")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("account.sub")}</p>
        <AccountLinker />
      </Card>
      <Card>
        <h2 className="mb-1 text-2xl">{t("settings.subscription")}</h2>
        <p className={`mb-4 ${premium ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{premium ? t("settings.active") : t("settings.inactive")}</p>
        {premium ? (
          <a href={MANAGE_SUBSCRIPTION_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-white/80 px-4">{t("settings.manage")}</a>
        ) : (
          <button type="button" onClick={() => setCheckoutOpen(true)} className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 font-semibold text-primary-foreground">{t("settings.subscribe")}</button>
        )}
      </Card>
      <Card className="py-1">
        <Row to="/lumi" label={t("settings.lumi")} />
        <Row to="/crisis" label={t("settings.crisis")} />
        <Row to="/privacy" label={t("settings.privacy")} />
        <Row to="/terms" label={t("settings.terms")} />
      </Card>
      {!isAnonymous && (
        <button type="button" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }} className="min-h-12 glass rounded-full">{t("settings.signOut")}</button>
      )}
      <button type="button" onClick={() => setConfirm(true)} className="min-h-12 rounded-full border border-reset bg-white/40 font-semibold text-foreground">{t("settings.delete")}</button>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="rounded-[28px] border-white/70 bg-[#e9e6fb] text-[#2e3865]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">{t("settings.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("settings.deleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-full">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="min-h-11 rounded-full bg-reset text-reset-foreground">{t("settings.deleteConfirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {profile && null}
      {checkoutOpen && <Suspense fallback={null}><CheckoutSheet open={checkoutOpen} onOpenChange={setCheckoutOpen} plan={checkoutPlan} onPlan={setCheckoutPlan} /></Suspense>}
    </div>
  );
}
