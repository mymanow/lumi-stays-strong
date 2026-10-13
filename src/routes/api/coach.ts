import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { detectCrisis } from "@/lib/domain";
import { FREE_COACH_MESSAGES_PER_DAY, PREMIUM_COACH_DAILY_CAP } from "@/config/app";

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) })).min(1).max(30),
  mode: z.enum(["urge", "relapse", "bad"]),
  tone: z.enum(["gentle", "direct"]),
  lang: z.enum(["fr", "en"]),
});

function json(status: number, body: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...extra } });
}

function systemPrompt(ctx: { lang: string; mode: string; tone: string; reasons: string[]; motivation: string | null; situation: string | null; days: number; lastRelapse: string | null; crisis: boolean }) {
  const language = ctx.lang === "fr" ? "French" : "English";
  return [
    `You are Lumi, a small, warm blob-shaped companion in a no-contact breakup recovery app. Speak in first person as Lumi, in ${language}.`,
    `Be warm, short and practical: at most 120 words, a few short sentences, no lists unless helpful.`,
    ctx.tone === "direct" ? "Tone: direct, clear and honest, still kind." : "Tone: gentle, soft and reassuring.",
    "Never diagnose, never claim to be a therapist or provide therapy.",
    "NEVER suggest contacting the ex, never help write, edit or plan a message to the ex, and never promise or suggest getting the ex back, even if the user's motivation is to win them back.",
    "Encourage: slow breathing, delaying the urge (wait 20 minutes), rereading their own reasons, opening the SOS in the app, and reaching out to a trusted friend or family member. You accompany; you do not replace real people.",
    "Never shame or punish. After a relapse, say you start again together.",
    "If the user expresses suicidal thoughts, self-harm or severe distress: respond with care first, and immediately give crisis resources (France 3114, US 988, UK/Ireland Samaritans 116 123, findahelpline.com elsewhere) and encourage calling now or contacting someone nearby.",
    ctx.crisis ? "IMPORTANT: the latest message may indicate a crisis. Lead with care and the crisis resources." : "",
    `Context — entry mode: ${ctx.mode}; days without contact: ${ctx.days}; last relapse: ${ctx.lastRelapse ?? "none"}; motivation: ${ctx.motivation ?? "unknown"}; situation: ${ctx.situation ?? "unknown"}.`,
    ctx.reasons.length ? `The user's own reasons for no contact: ${ctx.reasons.map((r) => `"${r}"`).join("; ")}.` : "",
  ].filter(Boolean).join("\n");
}

export const Route = createFileRoute("/api/coach")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
        if (!token || token.split(".").length !== 3) return json(401, { error: "unauthorized" });
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json(400, { error: "invalid" });
        const { messages, mode, tone, lang } = parsed.data;

        const url = process.env["SUPABASE_URL"]!;
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const userClient = createClient<Database>(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            headers: { Authorization: `Bearer ${token}` },
            fetch: (input, init) => { const h = new Headers(init?.headers); h.set("apikey", key); return fetch(input, { ...init, headers: h }); },
          },
        });
        const { data: userData, error: userErr } = await userClient.auth.getUser(token);
        if (userErr || !userData.user) return json(401, { error: "unauthorized" });
        const userId = userData.user.id;

        const [{ data: profile }, { data: sub }, { data: lastRelapse }] = await Promise.all([
          userClient.from("profiles").select("reasons, motivation, situation_type, coach_tone, last_contact_at").eq("id", userId).maybeSingle(),
          userClient.from("subscriptions").select("status").eq("user_id", userId).maybeSingle(),
          userClient.from("contact_events").select("occurred_at").eq("type", "relapse").order("occurred_at", { ascending: false }).limit(1).maybeSingle(),
        ]);
        const premium = sub?.status === "active";
        const cap = premium ? PREMIUM_COACH_DAILY_CAP : FREE_COACH_MESSAGES_PER_DAY;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const day = new Date().toISOString().slice(0, 10);
        const { data: usage } = await supabaseAdmin.from("ai_usage").select("count").eq("user_id", userId).eq("day", day).maybeSingle();
        if ((usage?.count ?? 0) >= cap) return json(429, { error: "limit" }, { "X-Remaining": "0" });
        const { data: newCount } = await supabaseAdmin.rpc("increment_ai_usage", { _user: userId, _day: day });
        const remaining = premium ? 999 : Math.max(0, cap - (newCount ?? 1));

        const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
        const crisis = detectCrisis(lastUser);
        const days = profile?.last_contact_at ? Math.floor((Date.now() - new Date(profile.last_contact_at).getTime()) / 86400000) : 0;

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json(500, { error: "config" });
        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          signal: request.signal,
          headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            instructions: systemPrompt({ lang, mode, tone: profile?.coach_tone ?? tone, reasons: profile?.reasons ?? [], motivation: profile?.motivation ?? null, situation: profile?.situation_type ?? null, days, lastRelapse: lastRelapse?.occurred_at?.slice(0, 10) ?? null, crisis }),
            input: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
            stream: true,
            store: false,
            reasoning: { effort: "low" },
          }),
        });
        const baseHeaders: Record<string, string> = { "X-Remaining": String(remaining), "X-Crisis": crisis ? "1" : "0" };
        if (!upstream.ok || !upstream.body) {
          console.error("coach upstream", upstream.status, await upstream.text().catch(() => ""));
          return json(upstream.status === 429 ? 503 : 502, { error: "upstream" }, baseHeaders);
        }

        // Convert Responses SSE into a plain text stream of answer deltas.
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let buffer = "";
        const stream = upstream.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            buffer += decoder.decode(chunk, { stream: true });
            const frames = buffer.split("\n\n");
            buffer = frames.pop() ?? "";
            for (const frame of frames) {
              for (const line of frame.split("\n")) {
                if (!line.startsWith("data:")) continue;
                const data = line.slice(5).trim();
                if (!data || data === "[DONE]") continue;
                try {
                  const evt = JSON.parse(data) as { type?: string; delta?: string };
                  if (evt.type === "response.output_text.delta" && evt.delta) controller.enqueue(encoder.encode(evt.delta));
                } catch { /* ignore partial */ }
              }
            }
          },
        }));
        return new Response(stream, { headers: { ...baseHeaders, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
      },
    },
  },
});
