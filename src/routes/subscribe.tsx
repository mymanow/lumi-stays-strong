import { createFileRoute, Link, Outlet, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { CloseIcon } from "@/components/hold/Icons";
import { AccountLinker } from "@/components/hold/AccountLinker";
import { Skeleton } from "@/components/ui/skeleton";
import { WHOP_PLANS, type PlanKey } from "@/config/whop";
import { createWhopCheckout } from "@/lib/account.functions";

const WhopEmbed = lazy(() => import("@/components/hold/WhopEmbed"));

export const Route = createFileRoute("/subscribe")({
  validateSearch: z.object({ from: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Coach illimité — Hold" },
      { name: "description", content: "Un coach quand l'envie est trop forte. Le compteur, le SOS et le journal restent gratuits." },
      { property: "og:title", content: "Coach illimité — Hold" },
      { property: "og:description", content: "Un coach quand l'envie est trop forte. Le compteur, le SOS et le journal restent gratuits." },
    ],
  }),
  component: SubscribeLayout,
});

function SubscribeLayout() {
  const match = useMatchRoute();
  if (match({ to: "/subscribe/success" })) return <Outlet />;
  return <Subscribe />;
}

function CheckoutSkeleton() {
  return <div className="flex flex-col gap-3" aria-busy="true"><Skeleton className="h-12 rounded-xl bg-surface" /><Skeleton className="h-40 rounded-xl bg-surface" /><Skeleton className="h-12 rounded-xl bg-surface" /></div>;
}

function Subscribe() {
  const { t, tl } = useI18n();
  const { ready, session, isAnonymous } = useApp();
  const navigate = useNavigate();
  const create = useServerFn(createWhopCheckout);
  const [plan, setPlan] = useState<PlanKey>("yearly");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const close = () => navigate({ to: "/" });

  const load = useCallback(async () => {
    if (!session || isAnonymous) return;
    setLoading(true); setFailed(false); setSessionId(null);
    try {
      const r = await create({ data: { planId: WHOP_PLANS[plan], returnUrl: window.location.origin + "/subscribe/success" } });
      if (r.sessionId) setSessionId(r.sessionId); else setFailed(true);
    } catch { setFailed(true); }
    setLoading(false);
  }, [session, isAnonymous, plan, create]);

  useEffect(() => { void load(); }, [load, attempt]);

  return (
    <div className="mx-auto min-h-screen max-w-[480px] px-6 pb-10 pt-4">
      <div className="flex justify-end">
        <button type="button" onClick={close} aria-label={t("common.close")} className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-surface"><CloseIcon /></button>
      </div>
      <h1 className="mt-2 text-3xl font-semibold leading-tight">{t("subscribe.title")}</h1>
      <ul className="mt-6 flex flex-col gap-3">
        {tl<string[]>("subscribe.benefits").map((b) => (
          <li key={b} className="flex items-center gap-3">
            <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg>
            </span>{b}
          </li>
        ))}
      </ul>
      <p className="mt-6 rounded-2xl border border-line bg-surface p-4 text-sm text-muted-foreground">{t("subscribe.free")}</p>

      <div role="radiogroup" aria-label="Plan" className="mt-6 grid grid-cols-2 gap-3">
        {(["monthly", "yearly"] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={plan === k} onClick={() => setPlan(k)}
            className={`flex min-h-20 flex-col items-start justify-center rounded-2xl border px-4 text-left ${plan === k ? "border-secondary bg-secondary/10" : "border-line bg-surface"}`}>
            <span className="font-medium">{t(`subscribe.${k}`)}</span>
            <span className="font-display text-lg">{t(k === "monthly" ? "subscribe.priceMonthly" : "subscribe.priceYearly")}</span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {!ready ? <CheckoutSkeleton /> : isAnonymous ? (
          <div>
            <p className="mb-4 text-muted-foreground">{t("subscribe.needEmail")}</p>
            <AccountLinker redirectPath="/subscribe" />
          </div>
        ) : loading ? <CheckoutSkeleton /> : failed || !sessionId ? (
          <div role="alert" className="rounded-2xl border border-line bg-surface p-5 text-center">
            <p>{t("subscribe.error")}</p>
            <button type="button" onClick={() => setAttempt((a) => a + 1)} className="mt-4 min-h-11 rounded-xl border border-line px-5">{t("common.retry")}</button>
          </div>
        ) : (
          <ClientOnly fallback={<CheckoutSkeleton />}>
            <Suspense fallback={<CheckoutSkeleton />}>
              <WhopEmbed sessionId={sessionId} email={session?.user.email ?? undefined} />
            </Suspense>
          </ClientOnly>
        )}
      </div>

      <button type="button" onClick={close} className="mt-6 min-h-12 w-full text-foreground underline-offset-4 hover:underline">{t("common.later")}</button>
      <p className="mt-2 text-center text-xs text-muted-foreground"><Link to="/terms" className="underline">{t("settings.terms")}</Link></p>
    </div>
  );
}
