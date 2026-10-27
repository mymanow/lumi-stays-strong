// Whop OAuth helpers (PKCE + state), Web Crypto only (workerd-safe).
export const WHOP_AUTHORIZE_URL = "https://api.whop.com/oauth/authorize";
export const WHOP_TOKEN_URL = "https://api.whop.com/oauth/token";
export const WHOP_USERINFO_URL = "https://api.whop.com/oauth/userinfo";
export const OAUTH_COOKIE = "hold_whop_oauth";
export const CALLBACK_PATH = "/api/public/whop-oauth/callback";

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function randomToken(len = 32) {
  return b64url(crypto.getRandomValues(new Uint8Array(len)));
}

export async function pkceChallenge(verifier: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(hash));
}

export function readCookie(header: string | null, name: string) {
  for (const part of (header ?? "").split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}

/** Returns the PKCE verifier when the returned state matches the cookie, else null. */
export function verifyState(cookie: string | null, state: string | null): string | null {
  if (!cookie || !state) return null;
  const [saved, verifier] = cookie.split(".");
  if (!saved || !verifier || saved !== state) return null;
  return verifier;
}

/**
 * The redirect URI registered at Whop (exact match required). WHOP_OAUTH_REDIRECT_URI pins it, e.g.
 * https://hold-no-contact.vercel.app/api/public/whop-oauth/callback, so preview deployments use the same one.
 * Without it, the callback on the requesting origin.
 */
export function redirectUri(requestUrl: string) {
  return process.env["WHOP_OAUTH_REDIRECT_URI"] || `${new URL(requestUrl).origin}${CALLBACK_PATH}`;
}

export type WhopUserInfo = { sub?: string; email?: string; email_verified?: boolean };
