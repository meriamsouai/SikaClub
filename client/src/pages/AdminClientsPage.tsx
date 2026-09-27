import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import { Alert } from "../components/Alert";
import { useLanguage } from "../context/LanguageContext";
import { ApiError, getAdminUserPoints, getClients, getLeaderboard } from "../lib/api";
import { formatPoints } from "../lib/format";
import { translateError } from "../i18n/translations";
import type { PublicPointEntry, PublicUser } from "../types";

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

export function AdminClientsPage() {
  const { locale, messages } = useLanguage();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [leaderboard, setLeaderboard] = useState<Array<PublicUser & { rank: number }>>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<PublicPointEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientsResult, leaderboardResult] = await Promise.all([getClients(), getLeaderboard()]);
      setUsers(clientsResult.users);
      setLeaderboard(leaderboardResult.users);
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : messages.admin.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredUsers = useMemo(() => users.filter((user) => matchesQuery(user, query)), [users, query]);

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
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : messages.admin.loadFailed);
      setExpandedId(null);
    } finally {
      setEntriesLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{messages.admin.clients}</h1>
          <p className="mt-2 text-sm text-muted">{messages.admin.clientsDescription}</p>
        </div>
        <label className="block max-w-xl text-sm font-medium text-ink">
          {messages.admin.searchClients}
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={messages.admin.searchClientsPlaceholder}
            className="mt-1.5 h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-sika-red focus:ring-2 focus:ring-sika-red/20"
          />
        </label>
        {error ? <Alert>{error}</Alert> : null}
        {loading ? (
          <p className="text-sm text-muted">{messages.nav.loading}</p>
        ) : filteredUsers.length === 0 ? (
          <p className="rounded-lg border border-line bg-white px-5 py-6 text-sm text-muted">
            {users.length === 0 ? messages.admin.noClients : messages.admin.noSearchResults}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">{messages.admin.name}</th>
                  <th className="px-4 py-3">{messages.auth.company}</th>
                  <th className="px-4 py-3">{messages.auth.email}</th>
                  <th className="px-4 py-3">{messages.auth.phone}</th>
                  <th className="px-4 py-3">{messages.admin.status}</th>
                  <th className="px-4 py-3">{messages.dashboard.points}</th>
                  <th className="px-4 py-3">{messages.admin.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <Fragment key={user.id}>
                    <tr className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-medium text-ink">
                        {user.firstName} {user.surname}
                      </td>
                      <td className="px-4 py-3">{user.companyName}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">{user.phone}</td>
                      <td className="px-4 py-3">{messages.admin.statusLabels[user.status]}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-sika-red">
                        {formatPoints(user.totalPoints, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void togglePoints(user.id)}
                          className="text-sm font-semibold text-sika-red-dark hover:underline"
                        >
                          {expandedId === user.id ? messages.admin.hidePoints : messages.admin.viewPoints}
                        </button>
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
                                    {new Date(entry.createdAt).toLocaleDateString(
                                      locale === "fr" ? "fr-FR" : "en-GB",
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4 border-t border-line pt-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">{messages.admin.leaderboard}</h2>
          <p className="mt-2 text-sm text-muted">{messages.admin.leaderboardDescription}</p>
        </div>
        {loading ? (
          <p className="text-sm text-muted">{messages.nav.loading}</p>
        ) : leaderboard.length === 0 ? (
          <p className="rounded-lg border border-line bg-white px-5 py-6 text-sm text-muted">
            {messages.admin.noLeaderboard}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">{messages.admin.rank}</th>
                  <th className="px-4 py-3">{messages.admin.name}</th>
                  <th className="px-4 py-3">{messages.auth.company}</th>
                  <th className="px-4 py-3">{messages.dashboard.points}</th>
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
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      {formatPoints(user.totalPoints, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
