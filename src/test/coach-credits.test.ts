import { beforeEach, describe, expect, it, vi } from "vitest";
import { creditState } from "@/lib/credits";

const DAY = 86_400_000;
const rules = [{ key: "welcome", amount: 12 }, { key: "premium_monthly", amount: 300 }];

describe("creditState (what the coach shows)", () => {
  const now = Date.parse("2026-10-28T12:00:00Z");
  it("shows the welcome gift before the first message", () => {
    expect(creditState(null, rules, false, now)).toMatchObject({ balance: 12, nextRefill: null });
  });
  it("shows the stored balance of a free account", () => {
    expect(creditState({ balance: 3, premium_refill_at: null }, rules, false, now).balance).toBe(3);
  });
  it("shows the monthly amount to a subscriber whose refill is due, never less than what is left", () => {
    expect(creditState({ balance: 4, premium_refill_at: null }, rules, true, now).balance).toBe(300);
    expect(creditState({ balance: 4, premium_refill_at: new Date(now - 31 * DAY).toISOString() }, rules, true, now).balance).toBe(300);
    expect(creditState({ balance: 420, premium_refill_at: null }, rules, true, now).balance).toBe(420);
  });
  it("gives a subscriber the date of the next refill", () => {
    const at = new Date(now - 10 * DAY).toISOString();
    const s = creditState({ balance: 0, premium_refill_at: at }, rules, true, now);
    expect(s.balance).toBe(0);
    expect(s.nextRefill?.getTime()).toBe(now + 20 * DAY);
  });
});

// /api/coach: 1 message = 1 credit, refused without credits, given back when the AI does not answer.
let balance = 0;
const rpcCalls: string[] = [];
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: async (fn: string) => {
      rpcCalls.push(fn);
      if (fn === "coach_credit_spend") { if (balance <= 0) return { data: -1, error: null }; balance -= 1; return { data: balance, error: null }; }
      if (fn === "coach_credit_refund") { balance += 1; return { data: balance, error: null }; }
      return { data: null, error: null };
    },
  },
}));
vi.mock("@supabase/supabase-js", () => {
  const chain = { select: () => chain, eq: () => chain, order: () => chain, limit: () => chain, maybeSingle: async () => ({ data: null }) };
  return { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) }, from: () => chain }) };
});

process.env["SUPABASE_URL"] = "https://sb.test";
process.env["SUPABASE_PUBLISHABLE_KEY"] = "pk";
process.env["LOVABLE_API_KEY"] = "lk";

const { Route } = await import("@/routes/api/coach");
const handler = (Route.options as unknown as { server: { handlers: { POST: (a: { request: Request }) => Promise<Response> } } }).server.handlers.POST;
const ask = () => handler({ request: new Request("https://app.test/api/coach", {
  method: "POST",
  headers: { Authorization: "Bearer a.b.c", "Content-Type": "application/json" },
  body: JSON.stringify({ messages: [{ role: "user", content: "Je vais craquer" }], mode: "urge", tone: "gentle", lang: "fr" }),
}) });

describe("/api/coach credits", () => {
  beforeEach(() => { rpcCalls.length = 0; vi.unstubAllGlobals(); });

  it("refuses with 402 and calls no AI when the balance is empty", async () => {
    balance = 0;
    const ai = vi.fn();
    vi.stubGlobal("fetch", ai);
    const res = await ask();
    expect(res.status).toBe(402);
    expect(res.headers.get("X-Credits")).toBe("0");
    expect(ai).not.toHaveBeenCalled();
  });

  it("debits one credit and reports the new balance", async () => {
    balance = 5;
    vi.stubGlobal("fetch", vi.fn(async () => new Response('data: {"type":"response.output_text.delta","delta":"Respire."}\n\n')));
    const res = await ask();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Credits")).toBe("4");
    expect(await res.text()).toBe("Respire.");
    expect(balance).toBe(4);
  });

  it("gives the credit back when the AI fails", async () => {
    balance = 5;
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));
    const res = await ask();
    expect(res.status).toBe(502);
    expect(balance).toBe(5);
    expect(res.headers.get("X-Credits")).toBe("5");
    expect(rpcCalls).toEqual(["coach_credit_spend", "coach_credit_refund"]);
  });
});
