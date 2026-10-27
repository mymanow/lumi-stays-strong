import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory service-role client: Hold users, subscriptions linked to a Whop user, and the e-mail lookup.
type User = { id: string; email: string | null };
const users = new Map<string, User>();
const subs = new Map<string, string>(); // whop_user_id -> user_id
const calls = { update: [] as unknown[], links: [] as string[], deleted: 0 };

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({ select: () => ({ eq: (_c: string, v: string) => ({ maybeSingle: async () => ({ data: subs.has(v) ? { user_id: subs.get(v)! } : null }) }) }) }),
    rpc: async (_fn: string, { p_email }: { p_email: string }) => {
      const u = [...users.values()].find((x) => x.email === p_email);
      return { data: u?.id ?? null, error: null };
    },
    auth: { admin: {
      getUserById: async (id: string) => ({ data: { user: users.get(id) ?? null }, error: null }),
      updateUserById: async (id: string, attrs: { email: string }) => { calls.update.push({ id, ...attrs }); users.set(id, { id, email: attrs.email }); return { error: null }; },
      generateLink: async ({ email }: { email: string }) => { calls.links.push(email); return { data: { properties: { action_link: `https://supabase.test/verify?e=${email}` } }, error: null }; },
      deleteUser: async () => { calls.deleted++; return { error: null }; },
    } },
  },
}));

process.env["WHOP_OAUTH_CLIENT_ID"] = "app_test";
process.env["WHOP_OAUTH_REDIRECT_URI"] = "https://hold-no-contact.vercel.app/api/public/whop-oauth/callback";

const { Route } = await import("@/routes/api/public/whop-oauth/callback");
const handler = (Route.options as unknown as { server: { handlers: { GET: (a: { request: Request }) => Promise<Response> } } }).server.handlers.GET;

let userinfo: Record<string, unknown> = {};
let tokenBody = "";
beforeEach(() => {
  users.clear(); subs.clear(); calls.update = []; calls.links = []; calls.deleted = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/oauth/token")) { tokenBody = String(init?.body); return new Response(JSON.stringify({ access_token: "tok" })); }
    return new Response(JSON.stringify(userinfo));
  }));
});

const call = (state = "st") => handler({ request: new Request(`https://preview-xyz.vercel.app/api/public/whop-oauth/callback?code=c&state=${state}`, { headers: { cookie: "hold_whop_oauth=st.ver" } }) });
const location = (r: Response) => r.headers.get("location") ?? "";

describe("whop oauth callback", () => {
  it("rejects a bad state", async () => {
    expect(location(await call("other"))).toBe("https://hold-no-contact.vercel.app/signin?error=whop");
  });

  it("uses the pinned redirect URI and the JSON body with the PKCE verifier", async () => {
    users.set("u1", { id: "u1", email: "a@b.co" });
    subs.set("user_whop1", "u1");
    userinfo = { sub: "user_whop1", email: "a@b.co", email_verified: true };
    await call();
    expect(JSON.parse(tokenBody)).toMatchObject({ code_verifier: "ver", redirect_uri: "https://hold-no-contact.vercel.app/api/public/whop-oauth/callback" });
  });

  it("signs in the anonymous account linked by its Whop subscription, attaching the verified Whop e-mail", async () => {
    users.set("anon", { id: "anon", email: null });
    subs.set("user_whop1", "anon");
    userinfo = { sub: "user_whop1", email: "Lea@Mail.com", email_verified: true };
    const res = await call();
    expect(calls.update).toEqual([{ id: "anon", email: "lea@mail.com", email_confirm: true }]);
    expect(location(res)).toBe("https://supabase.test/verify?e=lea@mail.com");
  });

  it("never attaches an unverified e-mail to an anonymous account", async () => {
    users.set("anon", { id: "anon", email: null });
    subs.set("user_whop1", "anon");
    userinfo = { sub: "user_whop1", email: "x@mail.com", email_verified: false };
    expect(location(await call())).toContain("error=unverified");
    expect(calls.update).toHaveLength(0);
    expect(calls.links).toHaveLength(0);
  });

  it("matches by e-mail only when Whop has verified it", async () => {
    users.set("victim", { id: "victim", email: "victim@mail.com" });
    userinfo = { sub: "user_attacker", email: "victim@mail.com", email_verified: false };
    expect(location(await call())).toContain("error=noaccount");
    expect(calls.links).toHaveLength(0);
    userinfo = { ...userinfo, email_verified: true };
    expect(location(await call())).toBe("https://supabase.test/verify?e=victim@mail.com");
  });

  it("never creates nor deletes an account when nothing matches", async () => {
    userinfo = { sub: "user_new", email: "new@mail.com", email_verified: true };
    expect(location(await call())).toContain("error=noaccount");
    expect(calls.links).toHaveLength(0);
    expect(calls.deleted).toBe(0);
  });
});
