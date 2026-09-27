import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Alert } from "../components/Alert";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { ApiError, getAuditLogs } from "../lib/api";
import { isSuperAdmin } from "../lib/roles";
import { translateError } from "../i18n/translations";
import type { PublicAdminAuditLog } from "../types";

export function AdminAuditLogPage() {
  const { user } = useAuth();
  const { locale, messages } = useLanguage();
  const copy = messages.admin;
  const [entries, setEntries] = useState<PublicAdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAuditLogs(200);
      setEntries(result.entries);
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [copy.loadFailed, messages]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isSuperAdmin(user?.role)) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{copy.auditLog}</h1>
        <p className="mt-2 text-sm text-muted">{copy.auditLogDescription}</p>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      {loading ? (
        <p className="text-sm text-muted">{messages.nav.loading}</p>
      ) : entries.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-5 py-6 text-sm text-muted">{copy.noAuditLogs}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">{copy.auditWhen}</th>
                <th className="px-4 py-3">{copy.auditActor}</th>
                <th className="px-4 py-3">{copy.auditAction}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-line last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {new Date(entry.createdAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-ink">{entry.actorEmail}</span>
                    <span className="mt-0.5 block text-xs text-muted">{entry.actorRole}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-ink">{entry.summary}</p>
                    <p className="mt-0.5 text-xs text-muted">{entry.action}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
