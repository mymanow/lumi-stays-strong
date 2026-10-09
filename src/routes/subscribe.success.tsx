import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { supabase } from "@/integrations/supabase/client";
import { Lumi } from "@/components/hold/Lumi";

export const Route = createFileRoute("/subscribe/success")({
  head: () => ({
    meta: [
      { title: "Merci — Hold" },
      { name: "description", content: "Ton coach illimité est prêt." },
      { property: "og:title", content: "Merci — Hold" },
      { property: "og:description", content: "Ton coach illimité est prêt." },
    ],
  }),
  component: Success,
});

function Success() {
  const { t } = useI18n();
  const { session, reload } = useApp();
  const [state, setState] = useState<"pending" | "active" | "late">("pending");
  useEffect(() => {
    if (!session) return;
    let tries = 0;
    const id = setInterval(async () => {
      tries++;
      const { data } = await supabase.from("subscriptions").select("status").eq("user_id", session.user.id).maybeSingle();
      if (data?.status === "active") { setState("active"); clearInterval(id); void reload(); }
      else if (tries >= 10) { setState("late"); clearInterval(id); }
    }, 1500);
    return () => clearInterval(id);
  }, [session, reload]);
  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center px-6 text-center">
      <Lumi size={100} stage={state === "active" ? 4 : 3} />
      <h1 className="mt-8 text-3xl font-semibold">{state === "active" ? t("subscribe.successTitle") : t("subscribe.successPending")}</h1>
      <p className="mt-3 text-muted-foreground" aria-live="polite">{state === "active" ? t("subscribe.successBody") : state === "late" ? t("subscribe.successLate") : ""}</p>
      <Link to="/coach" className="mt-10 flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground">{t("subscribe.toCoach")}</Link>
    </div>
  );
}
