import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { APP_NAME } from "@/config/app";
import { MessageSquare, ShieldAlert, Sun, User } from "lucide-react";
import { FullLoader } from "./Common";
import { Lumi } from "./Lumi";
import { msUntilNext, showNotification } from "@/lib/notify";

const NAV = [
  { to: "/", key: "nav.home", Icon: Sun },
  { to: "/sos", key: "nav.sos", Icon: ShieldAlert },
  { to: "/coach", key: "nav.coach", Icon: MessageSquare },
  { to: "/settings", key: "nav.settings", Icon: User },
] as const;

/** Main app layout: a floating tab bar on phones (Accueil / SOS / Coach / Réglages), sidebar from 768px.
 *  The history opens from the home ("Journal & historique"). Redirects to onboarding when unfinished. */
export function AppShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const { t } = useI18n();
  const { ready, profile } = useApp();
  const reminderOn = !!profile?.reminder_enabled;
  const reminderTime = profile?.reminder_time?.slice(0, 5) ?? "21:30";
  // Daily reminder: fires while the app is open. No push server, so it can't wake a closed app.
  useEffect(() => {
    if (!reminderOn) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      timer = setTimeout(() => { void showNotification(t("plan.notifTitle"), t("plan.notifBody")); arm(); }, msUntilNext(reminderTime));
    };
    arm();
    return () => clearTimeout(timer);
  }, [reminderOn, reminderTime, t]);
  const navigate = useNavigate();
  useEffect(() => {
    if (ready && profile && !profile.onboarding_completed) navigate({ to: "/onboarding" });
  }, [ready, profile, navigate]);
  if (!ready || !profile || !profile.onboarding_completed) return <FullLoader />;

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-2 glass border-y-0 border-l-0 p-5 md:flex">
        <div className="mb-6 flex items-center gap-2">
          <Lumi size={26} breathe={false} emotion="happy" label="" />
          <span className="font-display text-2xl">{APP_NAME}</span>
        </div>
        <nav aria-label={t("nav.main")} className="flex flex-col gap-1">
          {NAV.map(({ to, key, Icon }) => (
            <Link key={to} to={to} activeOptions={{ exact: to === "/" }}
              className="flex min-h-11 items-center gap-3 rounded-full px-4 font-medium text-muted-foreground hover:bg-white/40"
              activeProps={{ className: "bg-white text-[#2e3865]", "aria-current": "page" }}>
              <Icon size={20} strokeWidth={1.9} aria-hidden /> <span>{t(key)}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className={`mx-auto w-full flex-1 px-5 pb-28 pt-8 md:px-10 md:pb-10 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>{children}</main>

      <nav aria-label={t("nav.main")} className="fixed inset-x-4 z-40 mx-auto max-w-md md:hidden" style={{ bottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <ul className="flex gap-1 rounded-full bg-[#2e3865]/90 p-1.5 shadow-[0_14px_34px_-12px_rgba(46,56,101,0.75)] backdrop-blur-md">
          {NAV.map(({ to, key, Icon }) => (
            <li key={to} className="min-w-0 flex-1 transition-[flex-grow] duration-300 has-[[aria-current=page]]:flex-[1.8]">
              <Link to={to} activeOptions={{ exact: to === "/" }}
                className="flex min-h-12 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold text-white/75"
                activeProps={{ className: "bg-white !text-[#2e3865]", "aria-current": "page" }}>
                {() => <><Icon size={20} strokeWidth={1.9} aria-hidden /><span className="sr-only">{t(key)}</span></>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
