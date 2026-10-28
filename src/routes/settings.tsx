import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/hold/AppShell";
import { toast } from "sonner";
import { Clock, Mail, Sparkles, User } from "lucide-react";
import { Card, LangSwitch, PageTitle } from "@/components/hold/Common";
import { ChevronIcon, PhoneIcon } from "@/components/hold/Icons";
import { AccountLinker } from "@/components/hold/AccountLinker";
import { NoContactEditor } from "@/components/hold/NoContactEditor";
import { ReminderControl } from "@/components/hold/ReminderControl";
import { useCoachCredits } from "@/lib/credits";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { deviceTimezone } from "@/lib/domain";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { clearVault } from "@/lib/vault";
import { clearKeepsakes } from "@/lib/keepsakes";
import { MANAGE_SUBSCRIPTION_URL, SHOW_LANGUAGE_SWITCH } from "@/config/app";
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
      { name: "description", content: "Compte, sans-contact, abonnement, rappels, confidentialité et suppression de tes données." },
      { property: "og:title", content: "Réglages — Hold" },
      { property: "og:description", content: "Compte, sans-contact, abonnement, rappels, confidentialité et suppression de tes données." },
    ],
  }),
  component: () => <AppShell><Settings /></AppShell>,
});

function Row({ to, label, danger = false }: { to: "/lumi" | "/privacy" | "/terms" | "/crisis" | "/reminders" | "/journey"; label: string; danger?: boolean }) {
  return (
    <Link to={to} className={`flex min-h-13 items-center justify-between border-b border-white/60 py-3 last:border-0 ${danger ? "font-semibold text-[#9c3a30]" : ""}`}>
      <span>{label}</span>{danger ? <PhoneIcon width={18} height={18} aria-hidden /> : <ChevronIcon className="text-muted-foreground" />}
    </Link>
  );
}

/** A settings row: icon, label, current value underneath, and an optional action on the right. */
function Item({ icon, label, value, children, onClick }: { icon: React.ReactNode; label: string; value?: string | undefined; children?: React.ReactNode; onClick?: () => void }) {
  const body = (
    <>
      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/55 text-[#2e3865]">{icon}</span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block font-medium">{label}</span>
        {value && <span className="block truncate text-sm text-muted-foreground">{value}</span>}
      </span>
      {children ?? (onClick && <ChevronIcon className="shrink-0 text-muted-foreground" />)}
    </>
  );
  const cls = "flex min-h-[60px] w-full items-center gap-3 border-b border-white/60 py-2.5 last:border-0";
  return onClick ? <button type="button" onClick={onClick} className={cls}>{body}</button> : <div className={cls}>{body}</div>;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => <h2 className="-mb-3 px-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{children}</h2>;

function timezones(): string[] {
  try { return (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? []; } catch { return []; }
}

function Settings() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<PlanKey>("quarterly");
  const { t } = useI18n();
  const { profile, updateProfile, premium, isAnonymous, session } = useApp();
  const credits = useCoachCredits();
  const del = useServerFn(deleteMyAccount);
  const [confirm, setConfirm] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const reminder = { enabled: !!profile?.reminder_enabled, time: profile?.reminder_time?.slice(0, 5) ?? "21:30" };
  const changeReminder = (v: { enabled: boolean; time: string }) => { void updateProfile({ reminder_enabled: v.enabled, reminder_time: v.time }); };
  const tz = profile?.timezone ?? deviceTimezone() ?? "UTC";
  const zones = timezones();
  const email = !isAnonymous ? session?.user.email : null;

  const doDelete = async () => {
    await del();
    await clearVault();
    await clearKeepsakes();
    localStorage.removeItem("hold_reasons");
    await supabase.auth.signOut();
    window.location.href = "/";
  };
  const saveName = async () => {
    if (nameEdit === null) return;
    await updateProfile({ name: nameEdit.trim().slice(0, 40) || null });
    setNameEdit(null);
    toast(t("settings.saved"));
  };

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>{t("settings.title")}</PageTitle>
      {SHOW_LANGUAGE_SWITCH && (
        <Card className="flex items-center justify-between">
          <span className="font-medium">{t("settings.language")}</span>
          <LangSwitch onChange={(l) => updateProfile({ language: l })} />
        </Card>
      )}

      <SectionTitle>{t("settings.sections.account")}</SectionTitle>
      <Card className="py-1">
        {nameEdit === null ? (
          <Item icon={<User className="h-4 w-4" />} label={t("settings.name")} value={profile?.name?.trim() || t("settings.nameNone")} onClick={() => setNameEdit(profile?.name ?? "")} />
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); void saveName(); }} className="flex items-center gap-2 border-b border-white/60 py-3">
            <label className="sr-only" htmlFor="set-name">{t("settings.name")}</label>
            <input id="set-name" autoFocus value={nameEdit} maxLength={40} onChange={(e) => setNameEdit(e.target.value)} placeholder={t("settings.namePh")}
              className="glass min-h-11 min-w-0 flex-1 rounded-full px-4 text-base" />
            <button type="button" onClick={() => setNameEdit(null)} className="min-h-11 rounded-full px-3 text-sm">{t("common.cancel")}</button>
            <button type="submit" className="min-h-11 rounded-full bg-[#2e3865] px-4 text-sm font-bold text-white">{t("settings.save")}</button>
          </form>
        )}
        <Item icon={<Mail className="h-4 w-4" />} label={t("settings.email")} value={email || t("settings.emailNone")} />
        <Item icon={<Sparkles className="h-4 w-4" />} label={t("settings.personalize")} value={t("settings.personalizeSub")} onClick={() => setEditOpen(true)} />
        <Item icon={<Clock className="h-4 w-4" />} label={t("settings.timezone")} value={zones.length > 0 ? undefined : tz}>
          {zones.length > 0 && (
            <select aria-label={t("settings.timezone")} value={tz} onChange={(e) => { void updateProfile({ timezone: e.target.value }); toast(t("settings.saved")); }}
              className="glass max-w-[52%] min-h-10 shrink-0 rounded-full px-3 text-sm text-foreground [color-scheme:light]">
              {!zones.includes(tz) && <option value={tz}>{tz}</option>}
              {zones.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          )}
        </Item>
      </Card>
      {isAnonymous && (
        <Card>
          <h2 className="mb-1 text-2xl">{t("settings.saveAccount")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("account.sub")}</p>
          <AccountLinker />
        </Card>
      )}

      <SectionTitle>{t("settings.sections.prefs")}</SectionTitle>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-medium">{t("settings.subscription")}</h3>
            <p className={`text-sm ${premium ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{premium ? t("settings.active") : t("settings.inactive")}</p>
          </div>
          {premium ? (
            <a href={MANAGE_SUBSCRIPTION_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-white/80 px-4 text-sm">{t("settings.manage")}</a>
          ) : (
            <button type="button" onClick={() => setCheckoutOpen(true)} className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">{t("settings.subscribe")}</button>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/60 pt-3">
          <span className="font-medium">{t("settings.credits")}</span>
          <span className="text-sm text-muted-foreground">{credits.data ? t("settings.creditsValue", { n: credits.data.balance }) : "…"}</span>
        </div>
      </Card>
      <ReminderControl value={reminder} onChange={changeReminder} />
      <Card className="py-1">
        <Row to="/reminders" label={t("settings.reminders")} />
        <Row to="/journey" label={t("journey.title")} />
        <Row to="/lumi" label={t("settings.lumi")} />
      </Card>

      <SectionTitle>{t("settings.sections.legal")}</SectionTitle>
      <Card className="py-1">
        <Row to="/crisis" label={t("settings.crisis")} danger />
        <Row to="/terms" label={t("settings.terms")} />
        <Row to="/privacy" label={t("settings.privacy")} />
      </Card>
      {!isAnonymous && (
        <button type="button" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }} className="min-h-12 glass rounded-full">{t("settings.signOut")}</button>
      )}
      <button type="button" onClick={() => setConfirm(true)} className="min-h-12 rounded-full border border-reset bg-white/40 font-semibold text-foreground">{t("settings.delete")}</button>
      <NoContactEditor open={editOpen} onOpenChange={setEditOpen} />

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
      {checkoutOpen && <Suspense fallback={null}><CheckoutSheet open={checkoutOpen} onOpenChange={setCheckoutOpen} plan={checkoutPlan} onPlan={setCheckoutPlan} /></Suspense>}
    </div>
  );
}
