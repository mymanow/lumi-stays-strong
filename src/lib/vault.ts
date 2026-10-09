// Unsent messages live ONLY in this browser's IndexedDB. Never sent to the server.
import { get, set } from "idb-keyval";

export type VaultItem = { id: string; text: string; createdAt: string };
const KEY = "hold_vault";

export async function listVault(): Promise<VaultItem[]> {
  return ((await get(KEY)) as VaultItem[] | undefined) ?? [];
}
export async function addVault(text: string) {
  const items = await listVault();
  items.unshift({ id: crypto.randomUUID(), text, createdAt: new Date().toISOString() });
  await set(KEY, items);
}
export async function removeVault(id: string) {
  await set(KEY, (await listVault()).filter((i) => i.id !== id));
}
export async function clearVault() {
  await set(KEY, []);
}
