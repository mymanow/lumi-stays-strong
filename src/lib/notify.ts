/** Milliseconds until the next occurrence of "HH:MM" (today if still ahead, otherwise tomorrow). */
export function msUntilNext(time: string, now = new Date()): number {
  const [h = "0", m = "0"] = time.split(":");
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(h), Number(m), 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

export type NotifySupport = "unsupported" | "denied" | "default" | "granted";
export function notifySupport(): NotifySupport {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  return Notification.permission as NotifySupport;
}

/** Asks for permission (must be called from a click) and reports the result. */
export async function requestNotifyPermission(): Promise<NotifySupport> {
  const current = notifySupport();
  if (current !== "default") return current;
  try { return (await Notification.requestPermission()) as NotifySupport; } catch { return "denied"; }
}

export async function showNotification(title: string, body: string) {
  if (notifySupport() !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: "/icon.svg", tag: "hold-daily" });
    else new Notification(title, { body, icon: "/icon.svg", tag: "hold-daily" });
  } catch { /* notifications are best effort */ }
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
}
/** True when the app runs from the home screen (installed PWA) rather than in a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
/** iPhone/iPad Safari only exposes notifications to installed web apps, so there the screen explains how to install. */
export function notifyScreenApplicable(): boolean {
  return notifySupport() !== "unsupported" || (isIOS() && !isStandalone());
}
