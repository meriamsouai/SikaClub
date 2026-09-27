import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { isSuperAdmin } from "../lib/roles";
import { AuthFooter } from "./AuthFooter";

function navClass(isActive: boolean) {
  return `flex items-center gap-3 whitespace-nowrap border-l-2 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? "border-sika-red bg-sika-yellow-soft text-ink"
      : "border-transparent text-muted hover:bg-canvas hover:text-ink"
  }`;
}

export function AdminShell() {
  const { user, logout } = useAuth();
  const { messages } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { to: "/admin", label: messages.admin.pending },
    { to: "/admin/factures", label: messages.admin.invoices },
    { to: "/admin/echanges", label: messages.admin.redemptions },
    { to: "/admin/clients", label: messages.admin.clients },
    { to: "/admin/cadeaux", label: messages.admin.gifts },
    { to: "/admin/publicites", label: messages.admin.ads },
    ...(isSuperAdmin(user?.role)
      ? [
          { to: "/admin/equipe", label: messages.admin.staff },
          { to: "/admin/journal", label: messages.admin.auditLog },
        ]
      : []),
  ];

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="h-1 shrink-0 bg-sika-yellow" />
      <div className="flex flex-1">
        <aside className="group relative z-20 hidden w-16 shrink-0 lg:block">
          <div className="absolute inset-y-0 left-0 flex w-16 flex-col overflow-hidden border-r border-sika-yellow bg-white transition-[width,box-shadow] duration-200 ease-out group-hover:w-64 group-hover:shadow-lg">
            <div className="flex items-center border-b border-line px-3 py-4">
              <img
                src="/images/logo-club.png"
                alt={messages.meta.title}
                className="h-10 w-10 shrink-0 object-contain group-hover:h-auto group-hover:w-24"
              />
            </div>
            <p className="hidden px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-muted group-hover:block">
              {messages.admin.workspace}
            </p>
            <nav className="flex-1 space-y-1 overflow-hidden px-2 py-4" aria-label={messages.nav.main}>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/admin"}
                  title={item.label}
                  className={({ isActive }) => `${navClass(isActive)} px-2 group-hover:px-4`}
                >
                  <span className="mx-auto flex h-7 w-7 shrink-0 items-center justify-center rounded bg-sika-yellow-soft text-xs font-bold uppercase text-sika-red-dark group-hover:hidden">
                    {item.label.trim().charAt(0)}
                  </span>
                  <span className="hidden truncate group-hover:inline">{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-ink">
                {messages.dashboard.hello}, {user?.firstName} {user?.surname}
              </p>
              <p className="truncate text-sm text-muted">{messages.admin.workspace}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="inline-flex flex-col items-center gap-0.5 text-sika-red-dark hover:opacity-80"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                  <path
                    d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M14 12H21M18 8l4 4-4 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-xs font-semibold sm:text-sm">{messages.nav.logout}</span>
              </button>
              <button
                type="button"
                className="rounded-md border border-line px-3 py-2 text-sm font-medium lg:hidden"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {messages.nav.menu}
              </button>
            </div>
          </header>
          <div aria-hidden="true" className="h-px shrink-0 bg-sika-yellow" />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            <Outlet />
          </main>
        </div>
      </div>
      <AuthFooter />

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label={messages.nav.closeMenu}
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-4">
              <div>
                <img src="/images/logo-club.png" alt={messages.meta.title} className="h-auto w-24 object-contain" />
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">{messages.admin.workspace}</p>
              </div>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4" aria-label={messages.nav.main}>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/admin"}
                  className={({ isActive }) => `${navClass(isActive)} px-4`}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
