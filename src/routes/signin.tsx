import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
      { name: "description", content: "Retrouve ton compteur et tes raisons avec un lien de connexion." },
      { property: "og:title", content: "Connexion — Hold" },
      { property: "og:description", content: "Retrouve ton compteur et tes raisons avec un lien de connexion." },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "invalid">("idle");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setState("invalid"); return; }
    setState("sending");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin, shouldCreateUser: false } });
    setState(error ? "error" : "sent");
  };
  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col px-6 py-6">
      <div className="flex items-center justify-between">
        <Link to="/onboarding" aria-label={t("common.back")} className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground"><BackIcon /></Link>
        <LangSwitch />
      </div>
      <div className="my-8 flex justify-center"><Lumi size={70} stage={2} /></div>
      <h1 className="text-4xl">{t("signin.title")}</h1>
      <p className="mt-2 mb-6 text-muted-foreground">{t("signin.sub")}</p>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">{t("account.email")}
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="min-h-12 glass rounded-[20px] px-4 text-base text-foreground" />
        </label>
        <PrimaryButton arrow={false} type="submit" disabled={state === "sending"}>{t("signin.send")}</PrimaryButton>
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {state === "sent" && t("signin.sent")}{state === "error" && t("account.error")}{state === "invalid" && t("account.invalid")}
        </p>
      </form>
    </div>
  );
}
