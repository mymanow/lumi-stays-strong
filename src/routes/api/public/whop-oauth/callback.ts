import { createFileRoute } from "@tanstack/react-router";
import { OAUTH_COOKIE, WHOP_TOKEN_URL, WHOP_USERINFO_URL, readCookie, verifyState } from "@/lib/whop-oauth";

const clear = `${OAUTH_COOKIE}=; Path=/api/public/whop-oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export const Route = createFileRoute("/api/public/whop-oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = url.origin;
        const fail = (code: string) =>
          new Response(null, { status: 302, headers: { Location: `${origin}/signin?error=${code}`, "Set-Cookie": clear } });

        const verifier = verifyState(readCookie(request.headers.get("cookie"), OAUTH_COOKIE), url.searchParams.get("state"));
        const code = url.searchParams.get("code");
        if (!verifier || !code) return fail("whop");

        const clientId = process.env["WHOP_OAUTH_CLIENT_ID"];
        const clientSecret = process.env["WHOP_OAUTH_CLIENT_SECRET"];
        if (!clientId || !clientSecret) return fail("whop");

        try {
          const tokenRes = await fetch(WHOP_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              code,
              redirect_uri: `${origin}/api/public/whop-oauth/callback`,
              client_id: clientId,
              client_secret: clientSecret,
              code_verifier: verifier,
            }),
          });
          if (!tokenRes.ok) { console.error("whop token", tokenRes.status); return fail("whop"); }
          const { access_token } = (await tokenRes.json()) as { access_token?: string };
          if (!access_token) return fail("whop");

          const infoRes = await fetch(WHOP_USERINFO_URL, { headers: { Authorization: `Bearer ${access_token}` } });
          if (!infoRes.ok) return fail("whop");
          const info = (await infoRes.json()) as { email?: string; email_verified?: boolean };
          const email = info.email?.trim().toLowerCase();
          if (!email) return fail("noaccount");

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email,
            options: { redirectTo: `${origin}/` },
          });
          if (error || !data.properties?.action_link) return fail("noaccount");
          // generateLink creates missing users: undo that, sign-in is only for existing Hold accounts.
          const created = Date.parse(data.user.created_at);
          if (Date.now() - created < 15_000 && !data.user.last_sign_in_at) {
            await supabaseAdmin.auth.admin.deleteUser(data.user.id);
            return fail("noaccount");
          }
          return new Response(null, {
            status: 302,
            headers: { Location: data.properties.action_link, "Set-Cookie": clear, "Cache-Control": "no-store" },
          });
        } catch (e) {
          console.error("whop oauth", e);
          return fail("whop");
        }
      },
    },
  },
});
