import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { AccountLinker } from "./AccountLinker";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { WHOP_PLANS, type PlanKey } from "@/config/whop";
import { createWhopCheckout } from "@/lib/account.functions";

const WhopEmbed = lazy(() => import("./WhopEmbed"));
const PLANS: PlanKey[] = ["quarterly", "weekly"];

function CheckoutSkeleton() {
  return <div className="flex flex-col gap-3" aria-busy="true"><Skeleton className="h-12 rounded-[24px] bg-white/20" /><Skeleton className="h-40 rounded-[24px] bg-white/20" /><Skeleton className="h-12 rounded-[24px] bg-white/20" /></div>;
}

/**
 * The only place where a subscription is started: a bottom sheet with the Whop checkout of the selected plan.
 * Without an email-linked account it first asks for the email (the webhook needs the user id). `onPlan` adds a small plan
 * switch (used from Settings and the coach, where no plan was chosen beforehand).
 */
export function CheckoutSheet({ open, onOpenChange, plan, onPlan }: { open: boolean; onOpenChange: (o: boolean) => void; plan: PlanKey; onPlan?: ((p: PlanKey) => void) | undefined }) {
  const { t } = useI18n();
  const { ready, session, isAnonymous } = useApp();
  const create = useServerFn(createWhopCheckout);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    if (!open || !session || isAnonymous) return;
    setLoading(true); setFailed(false); setSessionId(null);
    try {
      const r = await create({ data: { planId: WHOP_PLANS[plan], returnUrl: window.location.origin + "/subscribe/success" } });
      if (r.sessionId) setSessionId(r.sessionId); else setFailed(true);
    } catch { setFailed(true); }
    setLoading(false);
  }, [open, session, isAnonymous, plan, create]);

  useEffect(() => { void load(); }, [load, attempt]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92svh] overflow-y-auto rounded-t-[28px] border-0 bg-[#2a2f6e] px-6 pb-8 text-white">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-2xl text-white">{t("paywall.cta")}</SheetTitle>
          <SheetDescription className="text-white/80">{t(`paywall.${plan}.name`)} · {t(`paywall.${plan}.price`)} {t("paywall.perWeek")} · {t(`paywall.${plan}.billed`)}</SheetDescription>
        </SheetHeader>
        {onPlan && (
          <div role="radiogroup" aria-label={t("paywall.plans")} className="mt-4 grid grid-cols-2 gap-2">
            {PLANS.map((k) => (
              <button key={k} type="button" role="radio" aria-checked={plan === k} onClick={() => onPlan(k)}
                className={`min-h-12 rounded-2xl px-3 text-sm font-semibold ${plan === k ? "bg-white text-[#2e3865]" : "bg-white/12 ring-1 ring-white/30"}`}>{t(`paywall.${k}.name`)}</button>
            ))}
          </div>
        )}
        <div className="mt-5">
          {!ready ? <CheckoutSkeleton /> : isAnonymous ? (
            <div>
              <p className="mb-4 text-white/85">{t("subscribe.needEmail")}</p>
              <AccountLinker redirectPath="/" />
            </div>
          ) : loading ? <CheckoutSkeleton /> : failed || !sessionId ? (
            <div role="alert" className="glass rounded-[24px] p-5 text-center">
              <p>{t("subscribe.error")}</p>
              <button type="button" onClick={() => setAttempt((a) => a + 1)} className="mt-4 min-h-11 rounded-full border border-white/70 px-5">{t("common.retry")}</button>
            </div>
          ) : (
            <ClientOnly fallback={<CheckoutSkeleton />}>
              <Suspense fallback={<CheckoutSkeleton />}>
                <WhopEmbed sessionId={sessionId} email={session?.user.email ?? undefined} />
              </Suspense>
            </ClientOnly>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
