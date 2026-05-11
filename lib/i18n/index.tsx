"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import en from "@/locales/en.json";
import es from "@/locales/es.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Locale = "en" | "es";

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// ---------------------------------------------------------------------------
// Locale registry
// ---------------------------------------------------------------------------

const LOCALES: Record<Locale, Record<string, string>> = {
  en: en as Record<string, string>,
  es: es as Record<string, string>,
};

export const SUPPORTED_LOCALES: { id: Locale; label: string; flag: string }[] = [
  { id: "en", label: "English", flag: "🇺🇸" },
  { id: "es", label: "Español", flag: "🇪🇸" },
];

const STORAGE_KEY = "localpdf-lang";
const DEFAULT_LOCALE: Locale = "en";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectLocale(): Locale {
  // 1. localStorage
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in LOCALES) return stored as Locale;

    // 2. Browser language
    const nav = navigator.language?.split("-")[0];
    if (nav && nav in LOCALES) return nav as Locale;
  }
  return DEFAULT_LOCALE;
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return key in params ? String(params[key]) : `{${key}}`;
  });
}

function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const messages = LOCALES[locale] ?? LOCALES[DEFAULT_LOCALE];
  const fallback = LOCALES[DEFAULT_LOCALE];

  // Pluralization: if params.count exists, try _one / _other suffix
  if (params && "count" in params) {
    const count = Number(params.count);
    const pluralKey = count === 1 ? `${key}_one` : `${key}_other`;
    const pluralMsg = messages[pluralKey] ?? fallback[pluralKey];
    if (pluralMsg) return interpolate(pluralMsg, params);
  }

  const msg = messages[key] ?? fallback[key];

  if (!msg) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[i18n] Missing translation key: "${key}" for locale "${locale}"`);
    }
    return key;
  }

  return params ? interpolate(msg, params) : msg;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(detectLocale());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = locale;
      document.documentElement.dir = "ltr"; // RTL-ready for future locales
    }
  }, [locale, mounted]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newLocale);
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return ctx;
}
