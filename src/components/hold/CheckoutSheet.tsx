import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TRIAL_DAYS, type PlanKey } from "@/config/whop";
import { createWhopCheckout } from "@/lib/account.functions";
import { Skeleton } from "@/components/ui/skeleton";

const WhopCheckout = lazy(() => import("./WhopCheckout"));
const PLANS: PlanKey[] = ["quarterly", "weekly"];
const returnUrl = () => window.location.origin + "/subscribe/success";

function CheckoutSkeleton() {
  return <div className="flex flex-col gap-3" aria-busy="true"><Skeleton className="h-12 rounded-[24px] bg-white/20" /><Skeleton className="h-40 rounded-[24px] bg-white/20" /><Skeleton className="h-12 rounded-[24px] bg-white/20" /></div>;
}

/**
 * The only place where a subscription is started: a bottom sheet with the Whop Elements checkout (email + card) of the
 * selected plan. Anonymous sessions pay directly: the checkout configuration carries the user id for the webhook, and
 * the success page then offers to link an email. `onPlan` adds a small plan switch (used from Settings and the coach,
 * where no plan was chosen beforehand).
 */
export function CheckoutSheet({ open, onOpenChange, plan, onPlan }: { open: boolean; onOpenChange: (o: boolean) => void; plan: PlanKey; onPlan?: ((p: PlanKey) => void) | undefined }) {
  const { t, lang } = useI18n();
  const { ready, session, isAnonymous } = useApp();
  const create = useServerFn(createWhopCheckout);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const configs = useRef<Partial<Record<PlanKey, string>>>({}); // a checkout configuration is reusable: mint once per plan

  const load = useCallback(async () => {
    if (!open || !session) return;
    setFailed(false);
    const cached = configs.current[plan];
    if (cached) { setSessionId(cached); return; }
    setLoading(true); setSessionId(null);
    try {
      const r = await create({ data: { plan, returnUrl: returnUrl() } });
      if (r.sessionId) { configs.current[plan] = r.sessionId; setSessionId(r.sessionId); } else setFailed(true);
    } catch { setFailed(true); }
    setLoading(false);
  }, [open, session, plan, create]);
  const retry = () => { delete configs.current[plan]; setAttempt((a) => a + 1); };

  useEffect(() => { void load(); }, [load, attempt]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92svh] overflow-y-auto rounded-t-[28px] border-0 bg-[#2a2f6e] px-6 pb-8 text-white">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-2xl text-white">{t("paywall.cta")}</SheetTitle>
          <SheetDescription className="text-white/80">{t(`paywall.${plan}.name`)} · {t(`paywall.${plan}.price`)} {t("paywall.perWeek")} · {t(`paywall.${plan}.billed`, { days: TRIAL_DAYS[plan] })}</SheetDescription>
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
          {!ready || loading ? <CheckoutSkeleton /> : failed || !sessionId ? (
            <div role="alert" className="glass rounded-[24px] p-5 text-center">
              <p>{t("subscribe.error")}</p>
              <button type="button" onClick={retry} className="mt-4 min-h-11 rounded-full border border-white/70 px-5">{t("common.retry")}</button>
            </div>
          ) : (
            <ClientOnly fallback={<CheckoutSkeleton />}>
              <Suspense fallback={<CheckoutSkeleton />}>
                <WhopCheckout key={`${sessionId}-${attempt}`} checkoutConfiguration={sessionId} locale={lang} returnUrl={returnUrl()}
                  email={!isAnonymous ? session?.user.email ?? undefined : undefined} onError={() => setFailed(true)} />
              </Suspense>
            </ClientOnly>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
