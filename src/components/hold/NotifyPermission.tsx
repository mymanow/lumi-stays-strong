import { useState } from "react";
import { Info, PlusSquare, Share, Smartphone, Check } from "lucide-react";
import { useI18n } from "@/i18n";
import { APP_NAME } from "@/config/app";
import { isIOS, isStandalone, notifySupport, requestNotifyPermission } from "@/lib/notify";

type Mode = "install" | "ask" | "granted" | "denied" | "unsupported" | "declined";

function detect(): Mode {
  if (isIOS() && !isStandalone()) return "install";
  const s = notifySupport();
  return s === "default" ? "ask" : s === "granted" ? "granted" : s === "denied" ? "denied" : "unsupported";
}

function Title({ text }: { text: string }) {
  return <>{text.split(/(\[[^\]]+\])/).map((p, i) => p.startsWith("[") ? <span key={i} className="text-[#8B6FE8]">{p.slice(1, -1)}</span> : <span key={i}>{p}</span>)}</>;
}

/**
 * Asks for notification permission after explaining it. On iPhone/iPad Safari (not installed) it first explains how to add
 * the web app to the home screen, because notifications only exist there. The in-page dialog is ours; "Allow" triggers the real prompt.
 */
export function NotifyPermission({ onEnabled }: { onEnabled: () => void }) {
  const { t, tl } = useI18n();
  const [mode, setMode] = useState<Mode>(detect);
  const allow = async () => {
    const r = await requestNotifyPermission();
    if (r === "granted") { onEnabled(); setMode("granted"); } else setMode(r === "unsupported" ? "unsupported" : "denied");
  };
  const titleKey = { install: "notify.titleInstall", ask: "notify.titleAsk", granted: "notify.titleGranted", denied: "notify.titleDenied", unsupported: "notify.titleDenied", declined: "notify.titleDeclined" }[mode];
  const stepIcons = [Share, PlusSquare, Smartphone];

  return (
    <div className="flex flex-1 flex-col items-center text-center" style={{ color: "#2e3865" }}>
      <h1 id="q18n" className="font-display mt-10 text-[30px] leading-tight"><Title text={t(titleKey, { app: APP_NAME })} /></h1>

      <div className="mt-10 flex w-full flex-1 flex-col items-center">
        {mode === "ask" && (
          <div role="group" aria-label={t("notify.dialogTitle", { app: APP_NAME })} className="notify-dialog w-full max-w-[340px] rounded-[28px] bg-white/90 p-5 text-left shadow-[0_18px_50px_-18px_rgba(46,56,101,0.45)]">
            <p className="text-[17px] font-semibold leading-snug text-[#14172b]">{t("notify.dialogTitle", { app: APP_NAME })}</p>
            <p className="mt-2 text-[14.5px] leading-snug text-[#6b6f85]">{t("notify.dialogBody")}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setMode("declined")} className="min-h-12 rounded-full bg-[#d4d4da] px-3 text-[15px] font-semibold text-[#14172b] active:scale-[0.97]">{t("notify.dontAllow")}</button>
              <button type="button" onClick={allow} className="min-h-12 rounded-full bg-[#6366F1] px-3 text-[15px] font-semibold text-white active:scale-[0.97]">{t("notify.allow")}</button>
            </div>
          </div>
        )}

        {mode === "install" && (
          <div className="glass w-full rounded-[28px] p-5 text-left">
            <p className="mb-4 text-[15px] leading-snug">{t("notify.why")}</p>
            <ol className="flex flex-col gap-3">
              {tl<string[]>("notify.installSteps").map((s, i) => {
                const Icon = stepIcons[i]!;
                return (
                  <li key={s} className="flex items-center gap-3">
                    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/60"><Icon size={19} /></span>
                    <span className="text-[15px] leading-snug"><b className="font-semibold">{i + 1}.</b> {s.replace("{app}", APP_NAME)}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {mode === "granted" && (
          <div className="flex flex-col items-center gap-3">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#58B368] text-white"><Check size={34} strokeWidth={3} aria-hidden /></span>
            <p className="text-base font-medium">{t("notify.granted")}</p>
          </div>
        )}
        {mode === "declined" && <p className="max-w-[300px] text-base font-medium">{t("notify.declined")}</p>}
        {(mode === "denied" || mode === "unsupported") && <p role="alert" className="max-w-[300px] text-base font-medium">{t(mode === "denied" ? "plan.denied" : "plan.unsupported")} {t("notify.later")}</p>}
      </div>

      <p className="mt-6 flex items-center gap-2 text-sm font-medium"><Info size={16} aria-hidden />{t("notify.anytime")}</p>
      <p className="mt-1 max-w-[320px] text-xs opacity-70">{t("plan.note")}</p>
    </div>
  );
}
