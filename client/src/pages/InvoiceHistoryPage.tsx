import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../components/Alert";
import { useLanguage } from "../context/LanguageContext";
import { ApiError, getMyInvoices } from "../lib/api";
import { formatPoints } from "../lib/format";
import { translateError } from "../i18n/translations";
import type { PublicInvoice } from "../types";

export function InvoiceHistoryPage() {
  const { locale, messages } = useLanguage();
  const copy = messages.invoices;
  const [invoices, setInvoices] = useState<PublicInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMyInvoices();
      setInvoices(result.invoices);
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : copy.loadFailed);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted">{copy.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{messages.nav.invoices}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{copy.description}</p>
        </div>
        <Link
          to="/factures/nouvelle"
          className="inline-flex h-10 items-center justify-center rounded-md bg-sika-red px-4 text-sm font-semibold text-white hover:bg-sika-red-dark"
        >
          {messages.nav.addInvoice}
        </Link>
      </div>

      {error ? <Alert>{error}</Alert> : null}
      {loading ? (
        <p className="text-sm text-muted">{messages.nav.loading}</p>
      ) : invoices.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-5 py-6 text-sm text-muted">{copy.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{copy.date}</th>
                <th className="px-4 py-3 font-medium">{copy.distributor}</th>
                <th className="px-4 py-3 font-medium">{copy.status}</th>
                <th className="px-4 py-3 font-medium">{copy.details}</th>
                <th className="px-4 py-3 font-medium">{copy.points}</th>
                <th className="px-4 py-3 font-medium">{copy.file}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-line last:border-0 align-top">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(invoice.createdAt).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB")}
                  </td>
                  <td className="px-4 py-3">{invoice.distributor}</td>
                  <td className="px-4 py-3 font-medium">{copy.statusLabels[invoice.status]}</td>
                  <td className="px-4 py-3">
                    <ul className="space-y-1">
                      {invoice.products.map((line) => (
                        <li key={`${invoice.id}-${line.productId}-${line.distributor}-${line.quantity}`}>
                          {line.productName} · {line.distributor} · {line.quantity} ·{" "}
                          {formatPoints(line.points, locale)} pts
                        </li>
                      ))}
                    </ul>
                    {invoice.adminNote ? (
                      <p className="mt-2 text-xs text-muted">
                        {copy.adminNote}: {invoice.adminNote}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-sika-red">
                    {invoice.status === "approved"
                      ? formatPoints(invoice.pointsAwarded, locale)
                      : formatPoints(invoice.estimatedPoints, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {(invoice.fileUrls?.length ? invoice.fileUrls : [invoice.fileUrl]).map((url, index, list) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-sika-red-dark hover:underline"
                        >
                          {list.length > 1 ? copy.viewFileN.replace("{n}", String(index + 1)) : copy.viewFile}
                        </a>
                      ))}
                    </div>
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
