"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Locale, Dictionary } from "./types";
import { en } from "./locales/en";
import { vi } from "./locales/vi";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
}

const dictionaries: Record<Locale, Dictionary> = {
  en,
  vi,
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("vi"); // default to vi or en

  useEffect(() => {
    // Check localStorage first
    const saved = localStorage.getItem("flae_landing_locale") as Locale | null;
    if (saved && (saved === "en" || saved === "vi")) {
      setLocaleState(saved);
      return;
    }

    // Otherwise detect browser language
    if (typeof navigator !== "undefined") {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith("vi")) {
        setLocaleState("vi");
      } else {
        setLocaleState("en");
      }
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem("flae_landing_locale", newLocale);
      document.documentElement.lang = newLocale;
    } catch {
      // ignore
    }
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: dictionaries[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within a LanguageProvider");
  }
  return context;
}
