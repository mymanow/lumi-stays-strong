import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Mic, Pin, PinOff, Plus, Square, Trash2, Upload } from "lucide-react";
import { useI18n } from "@/i18n";
import { Card, PrimaryButton, SecondaryButton } from "./Common";
import {
  MAX_FLAGS, MAX_FLAG_LENGTH, addFlag, addMedia, getMediaBlob, listFlags, listMedia, removeFlag, removeMedia, togglePin,
  type MediaItem, type MediaRefusal, type RedFlag,
} from "@/lib/keepsakes";

const iconBtn = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-white/40";

export function RedFlagsList() {
  const { t } = useI18n();
  const [flags, setFlags] = useState<RedFlag[]>([]);
  const [text, setText] = useState("");
  const refresh = async () => setFlags(await listFlags());
  useEffect(() => { void refresh(); }, []);
  const sorted = [...flags].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl">{t("rem.flagsTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("rem.flagsSub")}</p>
      </div>
      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (await addFlag(text)) { setText(""); await refresh(); } }}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX_FLAG_LENGTH} placeholder={t("rem.flagPh")} aria-label={t("rem.flagsTitle")}
          disabled={flags.length >= MAX_FLAGS} className="min-h-12 flex-1 glass rounded-[20px] px-4" />
        <button type="submit" disabled={!text.trim() || flags.length >= MAX_FLAGS} aria-label={t("rem.flagAdd")}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"><Plus className="h-5 w-5" /></button>
      </form>
      {flags.length >= MAX_FLAGS && <p className="text-sm text-muted-foreground">{t("rem.flagLimit", { n: MAX_FLAGS })}</p>}
      {flags.length === 0 && <p className="text-muted-foreground">{t("rem.flagEmpty")}</p>}
      <ul className="flex flex-col gap-2">
        {sorted.map((f) => (
          <li key={f.id} className={`glass flex items-center gap-1 rounded-[20px] py-1 pl-4 pr-1 ${f.pinned ? "ring-2 ring-primary/50" : ""}`}>
            <span className="min-w-0 flex-1 break-words py-2">{f.text}</span>
            <button type="button" aria-pressed={f.pinned} aria-label={f.pinned ? t("rem.unpin") : t("rem.pin")} className={iconBtn}
              onClick={async () => { await togglePin(f.id); await refresh(); }}>{f.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}</button>
            <button type="button" aria-label={t("rem.delete")} className={iconBtn} onClick={async () => { await removeFlag(f.id); await refresh(); }}><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MediaCard({ item, onDelete }: { item: MediaItem; onDelete: () => void }) {
  const { t, lang } = useI18n();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let made: string | null = null;
    let alive = true;
    getMediaBlob(item.id).then((b) => { if (b && alive) { made = URL.createObjectURL(b); setUrl(made); } });
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [item.id]);
  return (
    <Card className="p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {url && item.kind === "image" && <img src={url} alt={item.caption || item.name} className="max-h-72 w-full rounded-[16px] object-contain" />}
          {url && item.kind === "video" && <video src={url} controls preload="metadata" playsInline className="max-h-72 w-full rounded-[16px]" />}
          {url && item.kind === "audio" && <audio src={url} controls preload="metadata" className="w-full" />}
          {item.caption && <p className="mt-2 break-words">{item.caption}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" })}</p>
        </div>
        <button type="button" aria-label={t("rem.delete")} className={iconBtn} onClick={onDelete}><Trash2 className="h-4 w-4" /></button>
      </div>
    </Card>
  );
}

export function MediaBox() {
  const { t } = useI18n();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [caption, setCaption] = useState("");
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const refresh = async () => setItems(await listMedia());
  useEffect(() => { void refresh(); return () => { recorder.current?.stream.getTracks().forEach((tr) => tr.stop()); }; }, []);

  const refusalText = (r: MediaRefusal) => t(r === "type" ? "rem.errType" : r === "size" ? "rem.errSize" : "rem.errStorage");
  const save = async (blob: Blob & { name?: string }) => {
    const refusal = await addMedia(blob, caption);
    if (refusal) { toast.error(refusalText(refusal)); return; }
    setCaption(""); toast(t("rem.added")); await refresh();
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { toast.error(t("rem.errNoMic")); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setRecording(false);
        void save(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
    } catch { toast.error(t("rem.errMic")); }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t("rem.mediaSub")}</p>
      <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={120} placeholder={t("rem.captionPh")} aria-label={t("rem.captionPh")} className="min-h-12 glass rounded-[20px] px-4" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input ref={fileInput} type="file" accept="image/*,audio/*,video/*" multiple hidden
          onChange={async (e) => { const files = [...(e.target.files ?? [])]; e.target.value = ""; for (const f of files) await save(f); }} />
        <SecondaryButton onClick={() => fileInput.current?.click()} className="flex items-center justify-center gap-2"><Upload className="h-4 w-4" />{t("rem.addFile")}</SecondaryButton>
        {recording
          ? <PrimaryButton arrow={false} onClick={() => recorder.current?.stop()} className="!min-h-14 gap-2 !text-base"><Square className="h-4 w-4" />{t("rem.stop")} · {t("rem.recording")}</PrimaryButton>
          : <SecondaryButton onClick={startRecording} className="flex items-center justify-center gap-2"><Mic className="h-4 w-4" />{t("rem.record")}</SecondaryButton>}
      </div>
      <p className="text-xs text-muted-foreground">{t("rem.privateNote")}</p>
      {items.length === 0 && <p className="text-muted-foreground">{t("rem.mediaEmpty")}</p>}
      <div className="flex flex-col gap-3">
        {items.map((m) => <MediaCard key={m.id} item={m} onDelete={async () => { await removeMedia(m.id); await refresh(); }} />)}
      </div>
    </div>
  );
}
