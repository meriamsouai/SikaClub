import { useCallback, useEffect, useState } from "react";
import { Alert } from "../components/Alert";
import { useLanguage } from "../context/LanguageContext";
import { ApiError, getLeaderboard } from "../lib/api";
import { formatPoints } from "../lib/format";
import { translateError } from "../i18n/translations";
import type { PublicUser } from "../types";

export function AdminLeaderboardPage() {
  const { locale, messages } = useLanguage();
  const [users, setUsers] = useState<Array<PublicUser & { rank: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getLeaderboard();
      setUsers(result.users);
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : messages.admin.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{messages.admin.leaderboard}</h1>
        <p className="mt-2 text-sm text-muted">{messages.admin.leaderboardDescription}</p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {loading ? (
        <p className="text-sm text-muted">{messages.nav.loading}</p>
      ) : users.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-5 py-6 text-sm text-muted">{messages.admin.noLeaderboard}</p>
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
              {users.map((user) => (
                <tr key={user.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-bold text-sika-red">{user.rank}</td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {user.firstName} {user.surname}
                  </td>
                  <td className="px-4 py-3">{user.companyName}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{formatPoints(user.totalPoints, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
