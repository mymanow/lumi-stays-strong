import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { PrimaryButton } from "./Common";
import { OAUTH_PROVIDERS } from "@/config/auth";
import { lovableOAuth } from "@/lib/oauth";

/** Links an email to the current (anonymous) account via a confirmation link. */
export function AccountLinker({ redirectPath = "/settings" }: { redirectPath?: string }) {
  const { t } = useI18n();
  const { session, isAnonymous } = useApp();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "invalid">("idle");

  if (session && !isAnonymous && session.user.email) {
    return <p className="rounded-2xl border border-secondary/40 bg-secondary/10 p-4 text-foreground">{t("account.linked", { email: session.user.email })}</p>;
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setState("invalid"); return; }
    setState("sending");
    const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: window.location.origin + redirectPath });
    setState(error ? "error" : "sent");
  };

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={send} className="flex flex-col gap-3" noValidate>
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">{t("account.email")}
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={state === "invalid"}
            className="min-h-12 rounded-xl border border-line bg-surface px-4 text-base text-foreground" />
        </label>
        <PrimaryButton type="submit" disabled={state === "sending"}>{t("account.send")}</PrimaryButton>
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {state === "sent" && t("account.sent")}{state === "error" && t("account.error")}{state === "invalid" && t("account.invalid")}
        </p>
      </form>
      {OAUTH_PROVIDERS.map((p) => (
        <button key={p} type="button" onClick={() => lovableOAuth(p)} className="min-h-12 rounded-2xl border border-line bg-surface font-medium">
          {t(p === "google" ? "account.google" : "account.apple")}
        </button>
      ))}
    </div>
  );
}
