import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translations, type Locale, type Messages } from "../i18n/translations";

const STORAGE_KEY = "sika-locale";

type LanguageContextValue = {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "en" ? "en" : "fr";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readLocale);

  useEffect(() => {
    document.documentElement.lang = locale === "fr" ? "fr" : "en";
    document.title = translations[locale].meta.title;
    localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      messages: translations[locale],
      setLocale: setLocaleState,
    }),
    [locale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
