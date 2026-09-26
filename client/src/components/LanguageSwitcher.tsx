import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { localeLabels, locales, type Locale } from "../i18n/translations";

export function LanguageSwitcher() {
  const { locale, setLocale, messages } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(next: Locale) {
    setLocale(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-ink hover:bg-black/5"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={messages.meta.language}
        onClick={() => setOpen((current) => !current)}
      >
        <GlobeIcon />
        <span>{localeLabels[locale]}</span>
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label={messages.meta.language}
          className="absolute right-0 z-20 mt-1 min-w-28 overflow-hidden rounded-md border border-line bg-white py-1 shadow-lg"
        >
          {locales.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={option === locale}
                className={`flex w-full items-center px-3 py-2 text-left text-sm font-semibold ${
                  option === locale ? "bg-sika-yellow-soft text-ink" : "text-ink hover:bg-canvas"
                }`}
                onClick={() => choose(option)}
              >
                {localeLabels[option]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 12h18M5 7.5h14M5 16.5h14" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
