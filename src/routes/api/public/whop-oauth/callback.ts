import { createFileRoute } from "@tanstack/react-router";
import { OAUTH_COOKIE, WHOP_TOKEN_URL, WHOP_USERINFO_URL, readCookie, redirectUri, verifyState, type WhopUserInfo } from "@/lib/whop-oauth";

const clear = `${OAUTH_COOKIE}=; Path=/api/public/whop-oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

type Admin = {
  from: (t: string) => { select: (c: string) => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: { user_id: string } | null }> } } };
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  auth: { admin: {
    getUserById: (id: string) => Promise<{ data: { user: { id: string; email?: string | null } | null }; error: unknown }>;
    updateUserById: (id: string, attrs: Record<string, unknown>) => Promise<{ error: unknown }>;
    generateLink: (p: { type: "magiclink"; email: string; options: { redirectTo: string } }) => Promise<{ data: { properties?: { action_link?: string } } | null; error: unknown }>;
  } };
};

/**
 * Exchanges the code. Whop documents a JSON body with the PKCE verifier; some apps also need the client secret, so
 * the secret is added to the JSON body, then sent as a form as a last resort. Returns the status of the last try.
 */
async function exchangeCode(code: string, verifier: string, redirect_uri: string, clientId: string, clientSecret: string | undefined) {
  const fields: Record<string, string> = { grant_type: "authorization_code", code, redirect_uri, client_id: clientId, code_verifier: verifier };
  const attempts: RequestInit[] = [{ headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) }];
  if (clientSecret) {
    attempts.push({ headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fields, client_secret: clientSecret }) });
    attempts.push({ headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ ...fields, client_secret: clientSecret }) });
  }
  let status = 0;
  for (const init of attempts) {
    const res = await fetch(WHOP_TOKEN_URL, { method: "POST", ...init });
    status = res.status;
    if (res.ok) {
      const token = ((await res.json()) as { access_token?: string }).access_token;
      if (token) return { token, status };
    } else {
      console.error("whop token", res.status, (await res.text().catch(() => "")).slice(0, 300));
    }
  }
  return { token: null, status };
}

/**
 * Finds the Hold account behind a Whop sign-in, without ever creating one:
 * 1. the account whose subscription carries this Whop user id (written by the Whop webhook): works for the
 *    anonymous accounts the onboarding creates;
 * 2. otherwise the account with the same e-mail, but only if Whop says that e-mail is verified.
 */
async function findHoldUser(db: Admin, info: WhopUserInfo, email: string | null) {
  if (info.sub) {
    const { data } = await db.from("subscriptions").select("user_id").eq("whop_user_id", info.sub).maybeSingle();
    if (data?.user_id) return data.user_id;
  }
  if (email && info.email_verified === true) {
    const { data, error } = await db.rpc("hold_user_id_by_email", { p_email: email });
    if (!error && typeof data === "string") return data;
  }
  return null;
}

export const Route = createFileRoute("/api/public/whop-oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const redirect = redirectUri(request.url);
        const appOrigin = new URL(redirect).origin;
        const fail = (code: string) =>
          new Response(null, { status: 302, headers: { Location: `${appOrigin}/signin?error=${code}`, "Set-Cookie": clear, "Cache-Control": "no-store" } });

        const verifier = verifyState(readCookie(request.headers.get("cookie"), OAUTH_COOKIE), url.searchParams.get("state"));
        const code = url.searchParams.get("code");
        if (!code) return fail(url.searchParams.get("error") ? "whop_denied" : "whop_code");
        if (!verifier) return fail("whop_state"); // state cookie missing or different: sign-in started on another domain, or expired (10 min)

        const clientId = process.env["WHOP_OAUTH_CLIENT_ID"];
        if (!clientId) return fail("whop_config");

        try {
          const { token: accessToken, status } = await exchangeCode(code, verifier, redirect, clientId, process.env["WHOP_OAUTH_CLIENT_SECRET"]);
          if (!accessToken) return fail(`whop_token_${status}`);

          const infoRes = await fetch(WHOP_USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
          if (!infoRes.ok) { console.error("whop userinfo", infoRes.status); return fail(`whop_userinfo_${infoRes.status}`); }
          const info = (await infoRes.json()) as WhopUserInfo;
          const whopEmail = info.email?.trim().toLowerCase() || null;

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const db = supabaseAdmin as unknown as Admin;
          const userId = await findHoldUser(db, info, whopEmail);
          if (!userId) return fail("noaccount");

          const { data: found, error: userError } = await db.auth.admin.getUserById(userId);
          if (userError || !found.user) return fail("noaccount");

          // A magic link needs an e-mail. Anonymous accounts (found through their Whop subscription) get the Whop
          // e-mail, only when Whop has verified it, so that nobody can attach an address they don't own.
          let email = found.user.email?.trim().toLowerCase() || null;
          if (!email) {
            if (!whopEmail || info.email_verified !== true) return fail("unverified");
            const { error } = await db.auth.admin.updateUserById(userId, { email: whopEmail, email_confirm: true });
            if (error) { console.error("whop oauth: attach e-mail", error); return fail("whop_email"); }
            email = whopEmail;
          }

          const { data: link, error: linkError } = await db.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: `${appOrigin}/` } });
          if (linkError || !link?.properties?.action_link) { console.error("whop oauth: link", linkError); return fail("whop_link"); }
          return new Response(null, {
            status: 302,
            headers: { Location: link.properties.action_link, "Set-Cookie": clear, "Cache-Control": "no-store" },
          });
        } catch (e) {
          console.error("whop oauth", e);
          return fail("whop_exception");
        }
      },
    },
  },
});
