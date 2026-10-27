import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { LangSwitch, PrimaryButton } from "@/components/hold/Common";
import { Lumi } from "@/components/hold/Lumi";
import { BackIcon } from "@/components/hold/Icons";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Connexion — Hold" },
      { name: "description", content: "Retrouve ton compteur et tes raisons en te connectant avec Whop." },
      { property: "og:title", content: "Connexion — Hold" },
      { property: "og:description", content: "Retrouve ton compteur et tes raisons en te connectant avec Whop." },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [going, setGoing] = useState(false);
  useEffect(() => { setError(new URLSearchParams(window.location.search).get("error")); }, []);
  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col px-6 py-6">
      <div className="flex items-center justify-between">
        <Link to="/onboarding" aria-label={t("common.back")} className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground"><BackIcon /></Link>
        <LangSwitch />
      </div>
      <div className="my-8 flex justify-center"><Lumi size={70} stage={2} /></div>
      <h1 className="text-4xl">{t("signin.title")}</h1>
      <p className="mt-2 mb-6 text-muted-foreground">{t("signin.sub")}</p>
      <div className="flex flex-col gap-3">
        <PrimaryButton arrow={false} type="button" disabled={going}
          onClick={() => { setGoing(true); window.location.href = "/api/public/whop-oauth/start"; }}>
          {t("signin.whop")}
        </PrimaryButton>
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {error === "noaccount" && t("signin.noAccount")}{error === "whop" && t("account.error")}
        </p>
      </div>
    </div>
  );
}
