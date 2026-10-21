// "Mes rappels": the user's red flags and the photos, voice notes and videos they keep for hard moments.
// Everything lives ONLY in this browser's IndexedDB (like the unsent-message vault). Never sent to the server.
import { del, get, set } from "idb-keyval";

export type RedFlag = { id: string; text: string; pinned: boolean; createdAt: string };
export type MediaKind = "image" | "audio" | "video";
export type MediaItem = { id: string; kind: MediaKind; name: string; mime: string; size: number; caption: string; createdAt: string };

export const MAX_FLAGS = 100;
export const MAX_FLAG_LENGTH = 200;
export const MAX_FILE_BYTES = 30 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 200 * 1024 * 1024;

const FLAGS_KEY = "hold_redflags";
const MEDIA_KEY = "hold_media_index";
const blobKey = (id: string) => `hold_media_blob_${id}`;

export function mediaKindFor(mime: string): MediaKind | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return null;
}

export type MediaRefusal = "type" | "size" | "storage";
/** Why a file can't be added (null when it can). Pure so it can be tested without IndexedDB. */
export function mediaRefusal(file: { type: string; size: number }, existing: { size: number }[]): MediaRefusal | null {
  if (!mediaKindFor(file.type)) return "type";
  if (file.size > MAX_FILE_BYTES) return "size";
  if (existing.reduce((n, m) => n + m.size, 0) + file.size > MAX_TOTAL_BYTES) return "storage";
  return null;
}

/** Pinned red flags first, then random ones to fill up to `n`. */
export function pickRedFlags(flags: RedFlag[], n: number, rng: () => number = Math.random): RedFlag[] {
  const pinned = flags.filter((f) => f.pinned);
  const rest = flags.filter((f) => !f.pinned);
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [rest[i], rest[j]] = [rest[j]!, rest[i]!]; }
  return [...pinned, ...rest].slice(0, n);
}

export async function listFlags(): Promise<RedFlag[]> {
  return ((await get(FLAGS_KEY)) as RedFlag[] | undefined) ?? [];
}
export async function addFlag(text: string): Promise<boolean> {
  const clean = text.trim().slice(0, MAX_FLAG_LENGTH);
  const flags = await listFlags();
  if (!clean || flags.length >= MAX_FLAGS) return false;
  await set(FLAGS_KEY, [{ id: crypto.randomUUID(), text: clean, pinned: false, createdAt: new Date().toISOString() }, ...flags]);
  return true;
}
export async function removeFlag(id: string) {
  await set(FLAGS_KEY, (await listFlags()).filter((f) => f.id !== id));
}
export async function togglePin(id: string) {
  await set(FLAGS_KEY, (await listFlags()).map((f) => (f.id === id ? { ...f, pinned: !f.pinned } : f)));
}

export async function listMedia(): Promise<MediaItem[]> {
  return ((await get(MEDIA_KEY)) as MediaItem[] | undefined) ?? [];
}
export async function addMedia(file: Blob & { name?: string }, caption = ""): Promise<MediaRefusal | null> {
  const existing = await listMedia();
  const refusal = mediaRefusal(file, existing);
  if (refusal) return refusal;
  const item: MediaItem = {
    id: crypto.randomUUID(), kind: mediaKindFor(file.type)!, name: file.name ?? "", mime: file.type, size: file.size,
    caption: caption.trim().slice(0, 120), createdAt: new Date().toISOString(),
  };
  await set(blobKey(item.id), file);
  await set(MEDIA_KEY, [item, ...existing]);
  return null;
}
export async function getMediaBlob(id: string): Promise<Blob | undefined> {
  return (await get(blobKey(id))) as Blob | undefined;
}
export async function removeMedia(id: string) {
  await del(blobKey(id));
  await set(MEDIA_KEY, (await listMedia()).filter((m) => m.id !== id));
}

/** Wipes red flags and media from this device (used when the account is deleted). */
export async function clearKeepsakes() {
  for (const m of await listMedia()) await del(blobKey(m.id));
  await set(MEDIA_KEY, []);
  await set(FLAGS_KEY, []);
}
