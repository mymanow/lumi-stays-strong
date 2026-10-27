import { createFileRoute } from "@tanstack/react-router";
import { OAUTH_COOKIE, WHOP_AUTHORIZE_URL, pkceChallenge, randomToken } from "@/lib/whop-oauth";

export const Route = createFileRoute("/api/public/whop-oauth/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId = process.env["WHOP_OAUTH_CLIENT_ID"];
        const origin = new URL(request.url).origin;
        if (!clientId) return Response.redirect(`${origin}/signin?error=whop`, 302);
        const state = randomToken(16);
        const verifier = randomToken(32);
        const url = new URL(WHOP_AUTHORIZE_URL);
        url.search = new URLSearchParams({
          client_id: clientId,
          redirect_uri: `${origin}/api/public/whop-oauth/callback`,
          response_type: "code",
          scope: "openid profile email",
          state,
          nonce: randomToken(16),
          code_challenge: await pkceChallenge(verifier),
          code_challenge_method: "S256",
        }).toString();
        return new Response(null, {
          status: 302,
          headers: {
            Location: url.toString(),
            "Set-Cookie": `${OAUTH_COOKIE}=${state}.${verifier}; Path=/api/public/whop-oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
