import { useCallback, useEffect, useMemo, useState, Fragment, type ReactNode } from "react";
import { AdminPageTabs } from "../components/AdminPageTabs";
import { Alert } from "../components/Alert";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useLanguage } from "../context/LanguageContext";
import {
  ApiError,
  banClient,
  getAdminUserPoints,
  getClients,
  getLeaderboard,
  unbanClient,
} from "../lib/api";
import { formatPoints } from "../lib/format";
import { translateError } from "../i18n/translations";
import type { PublicPointEntry, PublicUser } from "../types";

type LeaderboardUser = PublicUser & {
  rank: number;
  lifetimePoints: number;
  currentPoints: number;
};

type ClientSort = "name" | "status";

function matchesQuery(user: PublicUser, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    user.firstName,
    user.surname,
    `${user.firstName} ${user.surname}`,
    user.companyName,
    user.email,
    user.phone,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function fullName(user: PublicUser) {
  return `${user.firstName} ${user.surname}`.trim();
}

function sortClients(list: PublicUser[], sortBy: ClientSort, locale: string) {
  const collator = new Intl.Collator(locale === "fr" ? "fr" : "en", { sensitivity: "base" });
  return [...list].sort((a, b) => {
    if (sortBy === "status") {
      const statusCmp = collator.compare(a.status, b.status);
      if (statusCmp !== 0) return statusCmp;
    }
    return collator.compare(fullName(a), fullName(b));
  });
}

export function AdminClientsPage() {
  const { locale, messages } = useLanguage();
  const copy = messages.admin;
  const [tab, setTab] = useState<"form" | "list">("form");
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<ClientSort>("name");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<PublicPointEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [banTarget, setBanTarget] = useState<PublicUser | null>(null);
  const [banBusy, setBanBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientsResult, leaderboardResult] = await Promise.all([getClients(), getLeaderboard()]);
      setUsers(clientsResult.users);
      setLeaderboard(leaderboardResult.users);
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [copy.loadFailed, messages]);

  useEffect(() => {
    void load();
  }, [load]);

  const { activeUsers, bannedUsers, rejectedUsers } = useMemo(() => {
    const matched = users.filter((user) => matchesQuery(user, query));
    const active = sortClients(
      matched.filter((user) => user.status !== "banned" && user.status !== "rejected"),
      sortBy,
      locale,
    );
    const banned = sortClients(
      matched.filter((user) => user.status === "banned"),
      sortBy === "status" ? "name" : sortBy,
      locale,
    );
    const rejected = sortClients(
      matched.filter((user) => user.status === "rejected"),
      sortBy === "status" ? "name" : sortBy,
      locale,
    );
    return { activeUsers: active, bannedUsers: banned, rejectedUsers: rejected };
  }, [users, query, sortBy, locale]);

  async function togglePoints(userId: string) {
    if (expandedId === userId) {
      setExpandedId(null);
      setEntries([]);
      return;
    }
    setExpandedId(userId);
    setEntriesLoading(true);
    setError(null);
    try {
      const result = await getAdminUserPoints(userId);
      setEntries(result.entries);
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : copy.loadFailed);
      setExpandedId(null);
    } finally {
      setEntriesLoading(false);
    }
  }

  async function confirmBanToggle() {
    if (!banTarget) return;
    const isBanned = banTarget.status === "banned";
    setBanBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (isBanned) {
        const result = await unbanClient(banTarget.id);
        setMessage(result.message || copy.clientUnbanned);
      } else if (banTarget.status === "approved") {
        const result = await banClient(banTarget.id);
        setMessage(result.message || copy.clientBanned);
      }
      setBanTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : copy.actionFailed);
    } finally {
      setBanBusy(false);
    }
  }

  function renderClientRows(list: PublicUser[], muted = false): ReactNode {
    return list.map((user) => (
      <Fragment key={user.id}>
        <tr className={`border-b border-line last:border-0 ${muted ? "bg-canvas/40" : ""}`}>
          <td className="px-4 py-3 font-medium text-ink">
            {user.firstName} {user.surname}
          </td>
          <td className="px-4 py-3">{user.companyName}</td>
          <td className="px-4 py-3">{user.email}</td>
          <td className="px-4 py-3">{user.phone}</td>
          <td className="px-4 py-3">
            <span className="inline-flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${user.status === "approved" ? "bg-emerald-500" : user.status === "banned" ? "bg-red-600" : "bg-slate-400"}`} />
              {copy.statusLabels[user.status]}
            </span>
          </td>
          <td className="px-4 py-3 font-semibold tabular-nums text-sika-red">
            {formatPoints(user.totalPoints, locale)}
          </td>
          <td className="px-4 py-3">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void togglePoints(user.id)}
                className="text-sm font-semibold text-sika-red-dark hover:underline"
              >
                {expandedId === user.id ? copy.hidePoints : copy.viewPoints}
              </button>
              {user.status === "approved" || user.status === "banned" ? (
                <button
                  type="button"
                  onClick={() => setBanTarget(user)}
                  title={user.status === "banned" ? copy.unbanClient : copy.banClient}
                  aria-label={user.status === "banned" ? copy.unbanClient : copy.banClient}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
                    user.status === "banned"
                      ? "border-emerald-600/40 text-emerald-700 hover:bg-emerald-50"
                      : "border-sika-red/40 text-sika-red hover:bg-sika-red/5"
                  }`}
                >
                  {user.status === "banned" ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M5.6 5.6l12.8 12.8" />
                    </svg>
                  )}
                </button>
              ) : null}
            </div>
          </td>
        </tr>
        {expandedId === user.id ? (
          <tr className="border-b border-line bg-canvas/50">
            <td colSpan={7} className="px-4 py-3">
              {entriesLoading ? (
                <p className="text-sm text-muted">{messages.nav.loading}</p>
              ) : entries.length === 0 ? (
                <p className="text-sm text-muted">{messages.points.empty}</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {entries.map((entry) => (
                    <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>{entry.label}</span>
                      <span className="font-semibold tabular-nums text-sika-red">
                        {entry.points > 0 ? "+" : ""}
                        {formatPoints(entry.points, locale)} ·{" "}
                        {new Date(entry.createdAt).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </td>
          </tr>
        ) : null}
      </Fragment>
    ));
  }

  const hasResults = activeUsers.length > 0 || bannedUsers.length > 0 || rejectedUsers.length > 0;
  const banIsUnban = banTarget?.status === "banned";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{copy.clients}</h1>
        <p className="mt-2 text-sm text-muted">{copy.clientsDescription}</p>
      </div>

      <AdminPageTabs
        formLabel={copy.tabClients}
        listLabel={copy.tabLeaderboard}
        active={tab}
        onChange={setTab}
      />

      {error ? <Alert>{error}</Alert> : null}
      {message ? <Alert tone="warning">{message}</Alert> : null}

      {tab === "form" ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="block max-w-xl flex-1 text-sm font-medium text-ink">
              {copy.searchClients}
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.searchClientsPlaceholder}
                className="mt-1.5 h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-sika-red focus:ring-2 focus:ring-sika-red/20"
              />
            </label>
            <label className="block text-sm font-medium text-ink sm:w-56">
              {copy.sortBy}
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as ClientSort)}
                className="mt-1.5 h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-sika-red focus:ring-2 focus:ring-sika-red/20"
              >
                <option value="name">{copy.sortByName}</option>
                <option value="status">{copy.sortByStatus}</option>
              </select>
            </label>
          </div>
          {loading ? (
            <p className="text-sm text-muted">{messages.nav.loading}</p>
          ) : !hasResults ? (
            <p className="rounded-lg border border-line bg-white px-5 py-6 text-sm text-muted">
              {users.length === 0 ? copy.noClients : copy.noSearchResults}
            </p>
          ) : (
            <div className="space-y-6">
              {activeUsers.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-line bg-white">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-4 py-3">{copy.name}</th>
                        <th className="px-4 py-3">{messages.auth.company}</th>
                        <th className="px-4 py-3">{messages.auth.email}</th>
                        <th className="px-4 py-3">{messages.auth.phone}</th>
                        <th className="px-4 py-3">{copy.status}</th>
                        <th className="px-4 py-3">{copy.pointsCurrent}</th>
                        <th className="px-4 py-3">{copy.actions}</th>
                      </tr>
                    </thead>
                    <tbody>{renderClientRows(activeUsers)}</tbody>
                  </table>
                </div>
              ) : null}

              {bannedUsers.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-line" />
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                      {copy.bannedClientsSection}
                      {` (${bannedUsers.length})`}
                    </h2>
                    <div className="h-px flex-1 bg-line" />
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-dashed border-line bg-white">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-4 py-3">{copy.name}</th>
                          <th className="px-4 py-3">{messages.auth.company}</th>
                          <th className="px-4 py-3">{messages.auth.email}</th>
                          <th className="px-4 py-3">{messages.auth.phone}</th>
                          <th className="px-4 py-3">{copy.status}</th>
                          <th className="px-4 py-3">{copy.pointsCurrent}</th>
                          <th className="px-4 py-3">{copy.actions}</th>
                        </tr>
                      </thead>
                      <tbody>{renderClientRows(bannedUsers, true)}</tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              {rejectedUsers.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-line" />
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-red-700">
                      {copy.rejectedClientsSection} ({rejectedUsers.length})
                    </h2>
                    <div className="h-px flex-1 bg-line" />
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-red-200 bg-red-50/40">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-red-200 bg-red-100/60 text-xs uppercase tracking-wide text-red-800">
                        <tr>
                          <th className="px-4 py-3">{copy.name}</th>
                          <th className="px-4 py-3">{messages.auth.company}</th>
                          <th className="px-4 py-3">{messages.auth.email}</th>
                          <th className="px-4 py-3">{messages.auth.phone}</th>
                          <th className="px-4 py-3">{copy.status}</th>
                          <th className="px-4 py-3">{copy.pointsCurrent}</th>
                          <th className="px-4 py-3">{copy.actions}</th>
                        </tr>
                      </thead>
                      <tbody>{renderClientRows(rejectedUsers, true)}</tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">{copy.leaderboardDescription}</p>
          {loading ? (
            <p className="text-sm text-muted">{messages.nav.loading}</p>
          ) : leaderboard.length === 0 ? (
            <p className="rounded-lg border border-line bg-white px-5 py-6 text-sm text-muted">{copy.noLeaderboard}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-line bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">{copy.rank}</th>
                    <th className="px-4 py-3">{copy.name}</th>
                    <th className="px-4 py-3">{messages.auth.company}</th>
                    <th className="px-4 py-3">{copy.pointsLifetime}</th>
                    <th className="px-4 py-3">{copy.pointsCurrent}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((user) => (
                    <tr key={user.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-bold text-sika-red">{user.rank}</td>
                      <td className="px-4 py-3 font-medium text-ink">
                        {user.firstName} {user.surname}
                      </td>
                      <td className="px-4 py-3">{user.companyName}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-sika-red">
                        {formatPoints(user.lifetimePoints, locale)}
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums">
                        {formatPoints(user.currentPoints, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(banTarget)}
        title={messages.admin.confirmTitle}
        message={banIsUnban ? copy.unbanConfirm : copy.banConfirm}
        confirmLabel={banIsUnban ? copy.unbanClient : copy.banClient}
        cancelLabel={copy.cancel}
        busy={banBusy}
        tone={banIsUnban ? "primary" : "danger"}
        onCancel={() => {
          if (!banBusy) setBanTarget(null);
        }}
        onConfirm={() => void confirmBanToggle()}
      />
    </div>
  );
}
