import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fr } from "./fr";
import { en } from "./en";
import { APP_NAME, COMPANION_NAME, SHOW_LANGUAGE_SWITCH } from "@/config/app";

export type Lang = "fr" | "en";
const dicts = { fr, en };

function lookup(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

export function interpolate(s: string, vars: Record<string, string | number> = {}) {
  const all = { app: APP_NAME, companion: COMPANION_NAME, ...vars };
  return s.replace(/\{(\w+)\}/g, (_, k) => String(all[k as keyof typeof all] ?? `{${k}}`));
}

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
  tl: <T = unknown>(path: string) => T;
};
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");
  useEffect(() => {
    if (!SHOW_LANGUAGE_SWITCH) return; // French only: a saved "en" is ignored
    const stored = localStorage.getItem("hold_lang");
    if (stored === "fr" || stored === "en") setLangState(stored);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    if (!SHOW_LANGUAGE_SWITCH) return; // French only
    localStorage.setItem("hold_lang", l);
    setLangState(l);
  }, []);
  const value = useMemo<Ctx>(() => ({
    lang,
    setLang,
    t: (path, vars) => {
      const v = lookup(dicts[lang], path) ?? lookup(fr, path);
      return typeof v === "string" ? interpolate(v, vars) : path;
    },
    tl: <T,>(path: string) => (lookup(dicts[lang], path) ?? lookup(fr, path)) as T,
  }), [lang, setLang]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n outside provider");
  return c;
}
