import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { supabase } from "@/integrations/supabase/client";
import { Lumi } from "@/components/hold/Lumi";
import { Stage } from "@/components/hold/Common";
import { APP_NAME, SIMULATE_PAYMENT } from "@/config/app";

export const Route = createFileRoute("/subscribe/success")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Merci — Hold" },
      { name: "description", content: "Ton coach illimité est prêt." },
      { property: "og:title", content: "Merci — Hold" },
      { property: "og:description", content: "Ton coach illimité est prêt." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ simulate: typeof s["simulate"] === "string" ? s["simulate"] : undefined }),
  component: Success,
});

function Success() {
  const { t } = useI18n();
  const { session, reload } = useApp();
  const simulated = SIMULATE_PAYMENT && !!Route.useSearch().simulate; // preview from the pitch page: nothing is paid or stored
  const [state, setState] = useState<"pending" | "active" | "late">(simulated ? "active" : "pending");
  useEffect(() => {
    if (simulated || !session) return;
    let tries = 0;
    const id = setInterval(async () => {
      tries++;
      const { data } = await supabase.from("subscriptions").select("status").eq("user_id", session.user.id).maybeSingle();
      if (data?.status === "active") { setState("active"); clearInterval(id); void reload(); }
      else if (tries >= 10) { setState("late"); clearInterval(id); }
    }, 1500);
    return () => clearInterval(id);
  }, [session, reload, simulated]);
  const active = state === "active";
  return (
    <Stage tone="dusk">
      <div className="relative mx-auto flex min-h-svh max-w-[480px] flex-col items-center px-6 pb-8 pt-8 text-center text-white">
        <p className="font-display text-3xl">{APP_NAME}</p>
        {simulated && <p className="mt-2 rounded-full bg-[#f4b94e] px-3 py-1 text-xs font-semibold text-[#2e3865]">{t("subscribe.simulated")}</p>}
        <div className="flex flex-1 flex-col items-center justify-center">
          {/* Sunrise: a warm light rises behind Lumi, a ring of small stars slowly orbits her. */}
          <div className="relative flex h-[280px] w-[280px] items-center justify-center">
            <span aria-hidden className={`success-glow absolute inset-0 rounded-full ${active ? "success-glow-on" : ""}`} />
            {active && (
              <span aria-hidden className="success-orbit absolute inset-0">
                {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="success-star" style={{ "--a": `${i * 60}deg`, animationDelay: `${0.8 + i * 0.15}s` } as React.CSSProperties} />)}
              </span>
            )}
            <div className={active ? "success-float" : ""}><Lumi size={120} stage={active ? 4 : 3} emotion={active ? "proud" : "neutral"} label="" /></div>
          </div>
          <h1 className={`mt-8 text-4xl leading-tight ${active ? "fade-up" : ""}`} style={{ "--d": "700ms" } as React.CSSProperties}>{active ? t("subscribe.successTitle") : t("subscribe.successPending")}</h1>
          <p className={`mt-3 text-lg ${active ? "fade-up" : ""}`} style={{ "--d": "1000ms" } as React.CSSProperties} aria-live="polite">{active ? t("subscribe.successBody") : state === "late" ? t("subscribe.successLate") : ""}</p>
        </div>
        {state !== "pending" && (
          <Link to={simulated ? "/onboarding" : "/coach"} className="fade-up flex min-h-[68px] w-full items-center justify-center rounded-[26px] bg-white text-lg font-bold text-[#2e3865]" style={{ "--d": active ? "1400ms" : "0ms" } as React.CSSProperties}>{t("subscribe.toCoach")}</Link>
        )}
      </div>
    </Stage>
  );
}
