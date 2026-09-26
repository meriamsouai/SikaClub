import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { localeLabels, locales, type Locale } from "../i18n/translations";
import { AdsRail } from "./AdsRail";
import { AuthFooter } from "./AuthFooter";
import { formatPoints } from "../lib/format";

function topNavClass(active: boolean) {
  return `text-sm font-bold uppercase tracking-wide transition-colors sm:text-base ${
    active ? "text-sika-red" : "text-ink hover:text-sika-red"
  }`;
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const { locale, setLocale, messages } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountOpen(false);
    }
    function onClickOutside(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    // Use click (not mousedown) so menu item clicks register before outside-close.
    document.addEventListener("click", onClickOutside);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClickOutside);
    };
  }, [accountOpen]);

  async function handleLogout() {
    setAccountOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  function chooseLocale(next: Locale) {
    setLocale(next);
  }

  const mainLinks = [
    { to: "/factures/nouvelle", label: messages.nav.addInvoice },
    { to: "/cadeaux", label: messages.nav.gifts },
    { to: "/historique", label: messages.nav.history },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="fixed inset-x-0 top-0 z-50">
        <div className="h-1 bg-sika-yellow" />
        <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-sika-yellow bg-white px-4 py-2.5 shadow-sm sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <Link to="/factures/nouvelle" className="shrink-0">
              <img
                src="/images/logo-club.png"
                alt={messages.meta.title}
                className="h-14 w-auto object-contain sm:h-16 md:h-[4.5rem]"
              />
            </Link>

            <div className="min-w-0">
              <p className="truncate text-base font-semibold sm:text-lg">
                {messages.dashboard.hello},{" "}
                <span className="text-sika-red">
                  {user?.firstName} {user?.surname}
                </span>
              </p>
              {user?.companyName ? (
                <p className="truncate text-sm text-muted">{user.companyName}</p>
              ) : null}
            </div>

            <div className="shrink-0 border-l border-line pl-3 sm:pl-5">
              <p className="text-xs font-bold leading-4 text-ink sm:text-sm">{messages.dashboard.points}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <p className="text-2xl font-bold tabular-nums leading-none text-sika-red sm:text-3xl">
                  {formatPoints(user?.totalPoints ?? 0, locale)}
                </p>
                <img src="/images/currency.png" alt="" className="h-6 w-6 object-contain sm:h-7 sm:w-7" />
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3 sm:gap-4 xl:gap-6">
            <nav className="hidden items-center gap-3 lg:flex xl:gap-5" aria-label={messages.nav.main}>
              {mainLinks.map((item, index) => (
                <span key={item.to} className="flex items-center gap-3 xl:gap-5">
                  {index > 0 ? <span className="h-5 w-px shrink-0 bg-line" aria-hidden="true" /> : null}
                  <Link to={item.to} className={topNavClass(location.pathname === item.to)}>
                    {item.label}
                  </Link>
                </span>
              ))}
            </nav>

            <div ref={accountRef} className="relative">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line text-ink hover:bg-canvas"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                aria-label={messages.nav.menu}
                onClick={(event) => {
                  event.stopPropagation();
                  setAccountOpen((open) => !open);
                }}
              >
                <MenuIcon />
              </button>

              {accountOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-[60] mt-2 w-56 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lg"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="lg:hidden">
                    {mainLinks.map((item) => (
                      <Link
                        key={item.to}
                        role="menuitem"
                        to={item.to}
                        className={`block px-4 py-2.5 text-sm font-semibold ${
                          location.pathname === item.to
                            ? "bg-sika-yellow-soft text-sika-red"
                            : "text-ink hover:bg-canvas"
                        }`}
                        onClick={() => setAccountOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                    <div className="my-1 border-t border-line" />
                  </div>

                  <Link
                    role="menuitem"
                    to="/profil"
                    className="block px-4 py-2.5 text-sm font-semibold text-ink hover:bg-sika-yellow-soft hover:text-sika-red"
                    onClick={() => setAccountOpen(false)}
                  >
                    {messages.dashboard.editProfile}
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-sika-red hover:bg-sika-yellow-soft"
                    onClick={() => void handleLogout()}
                  >
                    {messages.nav.logout}
                  </button>

                  <div className="my-1 border-t border-line" />
                  <p className="px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                    {messages.meta.language}
                  </p>
                  {locales.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="menuitem"
                      className={`block w-full px-4 py-2 text-left text-sm font-semibold ${
                        option === locale ? "bg-sika-yellow-soft text-ink" : "text-ink hover:bg-canvas"
                      }`}
                      onClick={() => chooseLocale(option)}
                    >
                      {localeLabels[option]}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </header>
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col pt-[5.75rem] sm:pt-[6.25rem] md:pt-[6.75rem]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[url('/images/background-3.png')] bg-cover bg-center bg-no-repeat blur-[2px] brightness-110"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-white/55" />

        <AdsRail variant="mobile" />
        <div className="relative z-0 flex min-h-0 flex-1">
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            <Outlet />
          </main>
          <AdsRail variant="desktop" />
        </div>
      </div>
      <AuthFooter />
    </div>
  );
}
