import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Trash2, Wind } from "lucide-react";
import { useI18n } from "@/i18n";
import { useApp } from "@/lib/app-state";
import { AppShell } from "@/components/hold/AppShell";
import { Lumi } from "@/components/hold/Lumi";
import { Card, CrisisLink, useCrisisLine } from "@/components/hold/Common";
import { PhoneIcon } from "@/components/hold/Icons";
import { NoContactEditor } from "@/components/hold/NoContactEditor";
import { supabase } from "@/integrations/supabase/client";
import { sosReasons } from "@/lib/reasons";
import { addVault } from "@/lib/vault";
import { listFlags, pickRedFlags, type RedFlag } from "@/lib/keepsakes";
import { logEvent } from "@/lib/events";

export const Route = createFileRoute("/sos")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "SOS — Hold" },
      { name: "description", content: "L'envie d'écrire est là. Respire avec Lumi, purge ton message et relis tes raisons." },
      { property: "og:title", content: "SOS — Hold" },
      { property: "og:description", content: "L'envie d'écrire est là. Respire avec Lumi, purge ton message et relis tes raisons." },
    ],
  }),
  component: () => <AppShell><Sos /></AppShell>,
});

const Label = ({ children }: { children: React.ReactNode }) => <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{children}</h2>;

/** Cardiac coherence: 5 s in, 5 s out, six breaths = 60 s. Lumi swells and shrinks with the breath. */
const BREATH_TOTAL = 60;
const HALF = 5;

function BreathingCard() {
  const { t } = useI18n();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((e) => {
      if (e + 1 >= BREATH_TOTAL) { setRunning(false); toast(t("sos.breathDone")); return 0; }
      return e + 1;
    }), 1000);
    return () => clearInterval(id);
  }, [running, t]);
  const inhale = Math.floor(elapsed / HALF) % 2 === 0;
  const stop = () => { setRunning(false); setElapsed(0); };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <Label>{t("sos.breathLabel")}</Label>
        <Wind aria-hidden className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="relative mx-auto my-5 flex h-52 w-52 items-center justify-center">
        <span aria-hidden className="absolute inset-0 rounded-full bg-white/45 transition-transform ease-in-out"
          style={{ transform: `scale(${running ? (inhale ? 1 : 0.72) : 0.86})`, transitionDuration: `${HALF * 1000}ms` }} />
        <div className="relative flex flex-col items-center text-center">
          {running ? (
            <>
              <Lumi size={56} stage={3} emotion={inhale ? "support" : "neutral"} breathe={false} scale={inhale ? 1.25 : 0.9} transitionMs={HALF * 1000} label="" />
              <p className="mt-1 font-display text-2xl" aria-live="polite">{inhale ? t("sos.inhale") : t("sos.exhale")}</p>
              <p className="text-sm text-muted-foreground">{t("sos.remaining", { n: BREATH_TOTAL - elapsed })}</p>
            </>
          ) : (
            <>
              <p className="font-display text-3xl">{t("sos.breathIdle")}</p>
              <p className="mt-1 max-w-[150px] text-sm text-muted-foreground">{t("sos.breathHint")}</p>
            </>
          )}
        </div>
      </div>
      <button type="button" onClick={() => (running ? stop() : setRunning(true))}
        className={`flex min-h-12 w-full items-center justify-center rounded-full px-4 font-bold ${running ? "glass" : "bg-[#2e3865] text-white"}`}>
        {running ? t("sos.breathStop") : t("sos.breathStart")}
      </button>
    </Card>
  );
}

type Skin = "imessage" | "whatsapp" | "instagram";
const SKINS: Record<Skin, { screen: string; bubble: string; text: string }> = {
  imessage: { screen: "bg-white", bubble: "bg-[#0a7cff] text-white placeholder:text-white/70", text: "text-[#1c1c1e]" },
  whatsapp: { screen: "bg-[#efe7dd]", bubble: "bg-[#d9fdd3] text-[#111b21] placeholder:text-[#111b21]/50", text: "text-[#111b21]" },
  instagram: { screen: "bg-white", bubble: "bg-[linear-gradient(135deg,#7b3fe4,#d62f8a)] text-white placeholder:text-white/70", text: "text-[#111]" },
};

/**
 * Purge simulator: the user writes the message they want to send, in a look that feels like their messenger,
 * then destroys it (or keeps it in the on-device vault). Nothing ever leaves the device.
 */
function PurgeCard() {
  const { t } = useI18n();
  const [skin, setSkin] = useState<Skin>("whatsapp");
  const [text, setText] = useState("");
  const [burning, setBurning] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const s = SKINS[skin];

  const purge = () => {
    if (!text.trim() || burning) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setBurning(true);
    window.setTimeout(() => { setText(""); setBurning(false); toast(t("sos.purgedToast")); }, reduce ? 0 : 650);
  };
  const keep = async () => {
    if (!text.trim()) return;
    await addVault(text.trim());
    setText("");
    toast(t("sos.keptToast"));
  };

  return (
    <Card>
      <Label>{t("sos.purgeLabel")}</Label>
      <p className="mt-1 text-sm text-muted-foreground">{t("sos.purgeSub")}</p>
      <div role="radiogroup" aria-label={t("sos.purgeLabel")} className="mt-4 grid grid-cols-3 gap-1 rounded-full bg-white/40 p-1">
        {(Object.keys(SKINS) as Skin[]).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={skin === k} onClick={() => setSkin(k)}
            className={`min-h-10 rounded-full text-sm font-semibold ${skin === k ? "bg-white text-[#2e3865] shadow-sm" : "text-muted-foreground"}`}>{t(`sos.purgeSkins.${k}`)}</button>
        ))}
      </div>
      <div className={`mt-3 overflow-hidden rounded-[22px] ${s.screen}`}>
        <div className={`flex items-center gap-2 border-b border-black/5 px-4 py-2.5 text-sm font-semibold ${s.text}`}>
          <span aria-hidden className="h-7 w-7 rounded-full bg-black/10" />{t("sos.purgeTo")}
        </div>
        <div className="flex justify-end p-3">
          <label className="sr-only" htmlFor="purge-text">{t("sos.purgePh")}</label>
          <textarea id="purge-text" ref={area} value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={2000} placeholder={t("sos.purgePh")}
            className={`w-[88%] resize-none rounded-[18px] rounded-br-md px-3.5 py-2.5 text-[15px] leading-snug outline-none transition-[opacity,transform,filter] duration-[650ms] ${s.bubble} ${burning ? "translate-y-2 scale-90 opacity-0 blur-sm" : ""}`} />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("sos.localOnly")}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={keep} disabled={!text.trim() || burning} className="glass min-h-12 flex-1 rounded-full px-3 text-sm font-semibold disabled:opacity-40">{t("sos.keepVault")}</button>
        <button type="button" onClick={purge} disabled={!text.trim() || burning}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#f2998d] px-3 text-sm font-bold text-[#2e3865] disabled:opacity-40">
          <Trash2 aria-hidden className="h-4 w-4" />{t("sos.purge")}
        </button>
      </div>
    </Card>
  );
}

function Sos() {
  const { t } = useI18n();
  const { profile, session } = useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const line = useCrisisLine();
  const [flags, setFlags] = useState<RedFlag[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [extra, setExtra] = useState(0);
  useEffect(() => { listFlags().then((all) => setFlags(pickRedFlags(all, 3))).catch(() => {}); }, []);
  const reasons = sosReasons(profile?.reasons ?? [], profile?.motivation, profile?.situation_type, t);

  const events = useQuery({
    queryKey: ["events", session?.user.id],
    enabled: !!session,
    queryFn: async () => (await supabase.from("contact_events").select("*").order("occurred_at", { ascending: false }).limit(200)).data ?? [],
  });
  const fetched = (events.data ?? []).filter((e) => e.type === "resistance").length;
  useEffect(() => { setExtra(0); }, [events.dataUpdatedAt]);
  const wins = fetched + extra;

  const resisted = async () => {
    setExtra((n) => n + 1);
    toast(t("sos.resistedToast"));
    await logEvent({ type: "resistance", occurred_at: new Date().toISOString() });
    await qc.invalidateQueries({ queryKey: ["events"] });
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] leading-tight">{t("sos.title")}</h1>
          <p className="text-muted-foreground">{t("sos.sub")}</p>
        </div>
        <a href={`tel:${line.tel}`} aria-label={t("sos.crisisLabel", { number: line.number })}
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#f2998d]/40 px-3 text-sm font-bold text-[#7c2a22]">
          <PhoneIcon width={15} height={15} aria-hidden />{line.number}
        </a>
      </header>

      <section className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#6366F1_0%,#8B7CF8_100%)] p-5 text-white shadow-[0_14px_34px_-14px_rgba(99,102,241,0.8)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-white/80">{t("sos.victoriesLabel")}</h2>
            <p className="mt-1 font-display text-[30px] leading-tight" aria-live="polite">{wins === 1 ? t("sos.victory") : t("sos.victories", { n: wins })}</p>
          </div>
          <button type="button" onClick={resisted} className="flex min-h-12 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold text-[#2e3865] active:scale-95">
            {t("sos.resisted")}<ShieldCheck aria-hidden className="h-4 w-4 text-[#6366F1]" />
          </button>
        </div>
        <p className="mt-2 max-w-[260px] text-sm text-white/85">{t("sos.victoriesSub")}</p>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <BreathingCard />
        <PurgeCard />
      </div>

      {reasons.length > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <Label>{t("ownReasons.title")}</Label>
            <button type="button" onClick={() => setEditOpen(true)} className="-my-2 min-h-11 rounded-full px-3 text-sm font-semibold underline underline-offset-4">{t("home.reasonsEdit")}</button>
          </div>
          <ul className="mt-2 flex flex-col gap-2">
            {reasons.map((r) => <li key={r} className="font-display text-2xl leading-tight">{r}</li>)}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 text-lg font-semibold">{t("rem.sosTitle")}</h2>
        {flags.length > 0 && <ul className="mb-2 flex list-disc flex-col gap-1.5 pl-5">{flags.map((f) => <li key={f.id} className="break-words">{f.text}</li>)}</ul>}
        <Link to="/reminders" className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">{t("rem.sosMore")}</Link>
      </Card>

      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3">
          <Lumi size={44} stage={3} emotion="support" />
          <p>{t("sos.lumiLine")}</p>
        </div>
        <button type="button" onClick={() => navigate({ to: "/coach", search: { mode: "urge" } })}
          className="min-h-12 shrink-0 rounded-full bg-[#2e3865] px-5 font-bold text-white">{t("sos.talk")}</button>
      </Card>

      <div className="flex justify-center"><CrisisLink /></div>
      <NoContactEditor open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
