import { useState } from "react";
import { loadWhop, type WhopLoad } from "@whop/elements";
import { Checkout, CheckoutElement, WhopElements } from "@whop/elements-react";
import { Skeleton } from "@/components/ui/skeleton";
import { WHOP_APPEARANCE } from "@/config/whop";

// Lazy chunk, mounted under <ClientOnly>: the hosted SDK script is injected once, in the browser only.
// A failed load is held by the SDK, so the next mount (the sheet's "retry") starts a fresh one.
let whopLoad: WhopLoad | null = null;
let loadFailed = false;
function getWhop(): WhopLoad {
  if (!whopLoad) whopLoad = loadWhop();
  else if (loadFailed) { loadFailed = false; whopLoad = whopLoad.retry(); }
  return whopLoad;
}

function CheckoutSkeleton() {
  return <div className="flex flex-col gap-3" aria-busy="true"><Skeleton className="h-12 rounded-[24px] bg-white/20" /><Skeleton className="h-40 rounded-[24px] bg-white/20" /><Skeleton className="h-12 rounded-[24px] bg-white/20" /></div>;
}

type Props = {
  /** Checkout configuration ID (`ch_…`) minted server-side for the selected plan. */
  checkoutConfiguration: string;
  locale: "fr" | "en";
  /** Prefilled when the account already has an email; Whop asks for it otherwise. */
  email?: string | undefined;
  returnUrl: string;
  onError: () => void;
};

/**
 * Whop Elements checkout (email + card + pay) rendered inside our CheckoutSheet.
 * Every option is fixed at mount: the parent re-keys this component to change plan.
 * Fulfilment happens in the webhook, never here.
 */
export default function WhopCheckout({ checkoutConfiguration, locale, email, returnUrl, onError }: Props) {
  const [elements] = useState(getWhop);
  return (
    <WhopElements elements={elements} appearance={WHOP_APPEARANCE} locale={locale} onLoadError={() => { loadFailed = true; onError(); }}>
      <Checkout checkoutConfiguration={checkoutConfiguration} returnUrl={returnUrl} fallback={<CheckoutSkeleton />}>
        <CheckoutElement {...(email ? { buyerEmail: email } : {})} onError={onError} />
      </Checkout>
    </WhopElements>
  );
}
