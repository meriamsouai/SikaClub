import type { ReactNode } from "react";
import { useLanguage } from "../context/LanguageContext";
import { AuthFooter } from "./AuthFooter";
import { LanguageSwitcher } from "./LanguageSwitcher";

type AuthLayoutProps = {
  title: string;
  description?: string;
  compact?: boolean;
  children: ReactNode;
};

export function AuthLayout({ title, description, compact = false, children }: AuthLayoutProps) {
  const { messages } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-sika-yellow px-3 py-2.5 sm:gap-4 sm:px-6">
        <span aria-hidden="true" />
        <h1 className="whitespace-nowrap text-center text-[clamp(0.58rem,1.7vw,1.45rem)] font-semibold uppercase tracking-tight text-ink [text-shadow:0_2px_6px_rgba(28,28,28,0.35)]">
          {messages.auth.loyaltyTitle}
        </h1>
        <div className="justify-self-end">
          <LanguageSwitcher />
        </div>
      </header>
      <div aria-hidden="true" className="h-1.5 bg-sika-red" />
      <main className="flex flex-1 items-center justify-center bg-[url('/images/background-3.png')] bg-cover bg-center bg-no-repeat px-4 py-10 sm:px-8">
        <div className={`w-full max-w-[35.2rem] rounded-lg border-4 border-sika-red bg-transparent text-ink sm:px-8 ${compact ? "px-6 py-5" : "px-6 py-8"}`}>
          <h2 className="text-center text-3xl font-semibold uppercase tracking-tight text-ink [text-shadow:0_2px_6px_rgba(28,28,28,0.35)] sm:text-4xl">{title}</h2>
          <div className="mt-4 flex justify-center">
            <img
              src="/images/logo-club.png"
              alt={messages.meta.title}
              className="h-20 w-auto object-contain sm:h-24"
            />
          </div>
          {description ? <p className="mt-2 text-center text-sm leading-6 text-ink/70">{description}</p> : null}
          <div className={compact ? "mt-5" : "mt-8"}>{children}</div>
        </div>
      </main>
      <AuthFooter />
    </div>
  );
}
