import { useCallback, useEffect, useState } from "react";
import { Alert } from "../components/Alert";
import { useLanguage } from "../context/LanguageContext";
import { ApiError, getAdminRedemptions, updateRedemptionStatus } from "../lib/api";
import { formatPoints } from "../lib/format";
import { translateError } from "../i18n/translations";
import type { PublicGiftRedemption, RedemptionStatus } from "../types";

export function AdminRedemptionsPage() {
  const { locale, messages } = useLanguage();
  const copy = messages.gifts;
  const [redemptions, setRedemptions] = useState<PublicGiftRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminRedemptions();
      setRedemptions(result.redemptions);
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : messages.admin.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: RedemptionStatus) {
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      const result = await updateRedemptionStatus(id, status);
      setMessage(result.message);
      setRedemptions((current) => current.map((item) => (item.id === id ? result.redemption : item)));
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : messages.admin.actionFailed);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{messages.admin.redemptions}</h1>
        <p className="mt-2 text-sm text-muted">{messages.admin.redemptionsDescription}</p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {message ? <Alert tone="warning">{message}</Alert> : null}
      {loading ? (
        <p className="text-sm text-muted">{messages.nav.loading}</p>
      ) : redemptions.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-5 py-6 text-sm text-muted">{messages.admin.noRedemptions}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">{copy.redemptionReference}</th>
                <th className="px-4 py-3">{messages.admin.name}</th>
                <th className="px-4 py-3">{copy.redemptionGift}</th>
                <th className="px-4 py-3">{copy.redemptionPoints}</th>
                <th className="px-4 py-3">{copy.redemptionStatus}</th>
                <th className="px-4 py-3">{messages.invoices.date}</th>
                <th className="px-4 py-3">{messages.admin.actions}</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.map((item) => (
                <tr key={item.id} className="border-b border-line last:border-0 align-top">
                  <td className="px-4 py-3 font-semibold text-sika-red">{item.reference}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.userName}</p>
                    <p className="text-xs text-muted">{item.companyName}</p>
                  </td>
                  <td className="px-4 py-3">{item.giftName}</td>
                  <td className="px-4 py-3 tabular-nums">{formatPoints(item.pointsSpent, locale)}</td>
                  <td className="px-4 py-3 font-medium">{copy.statusLabels[item.status]}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    {item.status === "en_cours" ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void setStatus(item.id, "claimed")}
                          className="inline-flex h-8 items-center rounded-md bg-sika-red px-2.5 text-xs font-semibold text-white hover:bg-sika-red-dark disabled:opacity-60"
                        >
                          {messages.admin.markClaimed}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void setStatus(item.id, "cancelled")}
                          className="inline-flex h-8 items-center rounded-md border border-line px-2.5 text-xs font-semibold hover:bg-canvas disabled:opacity-60"
                        >
                          {messages.admin.cancelRedemption}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
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
