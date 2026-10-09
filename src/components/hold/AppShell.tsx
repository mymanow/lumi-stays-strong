import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { APP_NAME } from "@/config/app";
import { CoachIcon, HistoryIcon, HomeIcon, SettingsIcon } from "./Icons";
import { FullLoader } from "./Common";
import { Lumi } from "./Lumi";

const NAV = [
  { to: "/", key: "nav.home", Icon: HomeIcon },
  { to: "/history", key: "nav.history", Icon: HistoryIcon },
  { to: "/coach", key: "nav.coach", Icon: CoachIcon },
  { to: "/settings", key: "nav.settings", Icon: SettingsIcon },
] as const;

/** Main app layout: bottom tabs on phones, sidebar from 768px. Redirects to onboarding when unfinished. */
export function AppShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const { t } = useI18n();
  const { ready, profile } = useApp();
  const navigate = useNavigate();
  useEffect(() => {
    if (ready && profile && !profile.onboarding_completed) navigate({ to: "/onboarding" });
  }, [ready, profile, navigate]);
  if (!ready || !profile || !profile.onboarding_completed) return <FullLoader />;

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-2 border-r border-line bg-surface/40 p-5 md:flex">
        <div className="mb-6 flex items-center gap-2">
          <Lumi size={22} breathe={false} label="" />
          <span className="font-display text-2xl">{APP_NAME}</span>
        </div>
        <nav aria-label={t("nav.main")} className="flex flex-col gap-1">
          {NAV.map(({ to, key, Icon }) => (
            <Link key={to} to={to} activeOptions={{ exact: to === "/" }}
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-muted-foreground hover:bg-surface"
              activeProps={{ className: "bg-surface text-foreground", "aria-current": "page" }}>
              <Icon /> <span>{t(key)}</span>
            </Link>
          ))}
        </nav>
        <Link to="/sos" className="mt-auto flex min-h-14 items-center justify-center rounded-2xl bg-primary px-4 text-center font-semibold text-primary-foreground">
          {t("home.sos")}
        </Link>
      </aside>

      <main className={`mx-auto w-full flex-1 px-5 pb-28 pt-8 md:px-10 md:pb-10 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>{children}</main>

      <nav aria-label={t("nav.main")} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <ul className="grid grid-cols-4">
          {NAV.map(({ to, key, Icon }) => (
            <li key={to}>
              <Link to={to} activeOptions={{ exact: to === "/" }}
                className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
                activeProps={{ className: "text-secondary", "aria-current": "page" }}>
                <Icon /> {t(key)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
