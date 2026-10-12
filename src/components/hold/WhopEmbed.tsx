import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { Skeleton } from "@/components/ui/skeleton";
import { WHOP_ACCENT } from "@/config/whop";

export default function WhopEmbed({ sessionId, email }: { sessionId: string; email?: string | undefined }) {
  return (
    <WhopCheckoutEmbed
      sessionId={sessionId}
      returnUrl={window.location.origin + "/subscribe/success"}
      theme="dark"
      themeOptions={{ accentColor: WHOP_ACCENT } as never}
      {...(email ? { prefill: { email } } : {})}
      fallback={<Skeleton className="h-64 rounded-xl bg-surface" />}
    />
  );
}
