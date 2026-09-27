import { useCallback, useEffect, useState } from "react";
import { Alert } from "../components/Alert";
import { useLanguage } from "../context/LanguageContext";
import {
  ApiError,
  approveInvoice,
  getPendingInvoices,
  getReviewedInvoices,
  rejectInvoice,
} from "../lib/api";
import { formatPoints } from "../lib/format";
import { translateError } from "../i18n/translations";
import type { InvoiceStatus, PublicInvoice } from "../types";

type AdminInvoiceTab = "pending" | "history";

function statusBulletClass(status: InvoiceStatus) {
  if (status === "approved") return "bg-emerald-500";
  if (status === "pending") return "bg-amber-500";
  return "bg-red-500";
}

export function AdminInvoicesPage() {
  const { locale, messages } = useLanguage();
  const [tab, setTab] = useState<AdminInvoiceTab>("pending");
  const [pending, setPending] = useState<PublicInvoice[]>([]);
  const [reviewed, setReviewed] = useState<PublicInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingResult, reviewedResult] = await Promise.all([
        getPendingInvoices(),
        getReviewedInvoices(),
      ]);
      setPending(pendingResult.invoices);
      setReviewed(reviewedResult.invoices);
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : messages.admin.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    if (!window.confirm(messages.admin.approveInvoiceConfirm)) return;

    setBusyId(id);
    setError(null);
    setMessage(null);
    setRejectingId(null);
    try {
      const result = await approveInvoice(id);
      setMessage(result.message);
      setPending((current) => current.filter((invoice) => invoice.id !== id));
      setReviewed((current) => [result.invoice, ...current.filter((invoice) => invoice.id !== id)]);
      setNotes((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : messages.admin.actionFailed);
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    if (!window.confirm(messages.admin.rejectInvoiceConfirm)) return;

    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      const result = await rejectInvoice(id, notes[id] ?? "");
      setMessage(result.message);
      setPending((current) => current.filter((invoice) => invoice.id !== id));
      setReviewed((current) => [result.invoice, ...current.filter((invoice) => invoice.id !== id)]);
      setRejectingId(null);
      setNotes((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : messages.admin.actionFailed);
    } finally {
      setBusyId(null);
    }
  }

  const dateLocale = locale === "fr" ? "fr-FR" : "en-GB";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{messages.admin.invoices}</h1>
        <p className="mt-2 text-sm text-muted">
          {tab === "pending" ? messages.admin.invoicesDescription : messages.admin.invoicesHistoryDescription}
        </p>
      </div>

      <div className="flex gap-2 border-b border-line">
        <button
          type="button"
          onClick={() => setTab("pending")}
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === "pending"
              ? "border-sika-red text-sika-red-dark"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {messages.admin.invoicesPendingTab}
          {pending.length > 0 ? ` (${pending.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === "history"
              ? "border-sika-red text-sika-red-dark"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {messages.admin.invoicesHistoryTab}
          {reviewed.length > 0 ? ` (${reviewed.length})` : ""}
        </button>
      </div>

      {error ? <Alert>{error}</Alert> : null}
      {message ? <Alert tone="warning">{message}</Alert> : null}
      {loading ? (
        <p className="text-sm text-muted">{messages.nav.loading}</p>
      ) : tab === "pending" ? (
        pending.length === 0 ? (
          <p className="rounded-lg border border-line bg-white px-5 py-6 text-sm text-muted">
            {messages.admin.noPendingInvoices}
          </p>
        ) : (
          <div className="space-y-4">
            {pending.map((invoice) => (
              <article key={invoice.id} className="rounded-lg border border-line bg-white p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-sika-red">{invoice.reference}</p>
                    <h2 className="mt-1 text-lg font-semibold text-ink">
                      {invoice.userName} · {invoice.companyName}
                    </h2>
                    <p className="text-sm text-muted">
                      {new Date(invoice.createdAt).toLocaleString(dateLocale)}
                    </p>
                    <p className="mt-1 text-sm font-medium text-ink">
                      {messages.invoices.distributor}: {invoice.distributor}
                    </p>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-sika-red">
                    {formatPoints(invoice.estimatedPoints, locale)} pts
                  </p>
                </div>
                <ul className="mt-4 space-y-1 text-sm">
                  {invoice.products.map((line) => (
                    <li key={`${invoice.id}-${line.productId}-${line.distributor}-${line.quantity}`}>
                      {line.productName} · {line.distributor} · {line.quantity} rouleaux
                      {line.igolflexSeaux > 0
                        ? ` · Turbo Bonus Igolflex-115 EG ${line.igolflexSeaux} seaux (+${formatPoints(line.igolflexPoints, locale)})`
                        : ""}{" "}
                      · {formatPoints(line.points, locale)} pts
                    </li>
                  ))}
                </ul>
                {invoice.clientProblemReport ? (
                  <p className="mt-3 rounded-md border border-line bg-canvas px-3 py-2 text-sm">
                    <span className="font-semibold">{messages.invoices.clientReportLabel}:</span>{" "}
                    {invoice.clientProblemReport}
                  </p>
                ) : null}
                {rejectingId === invoice.id ? (
                  <label className="mt-4 block text-sm font-medium text-ink">
                    {messages.invoices.rejectReason}
                    <textarea
                      value={notes[invoice.id] ?? ""}
                      onChange={(event) =>
                        setNotes((current) => ({ ...current, [invoice.id]: event.target.value }))
                      }
                      placeholder={messages.invoices.adminNotePlaceholder}
                      rows={2}
                      className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-sika-red focus:ring-2 focus:ring-sika-red/20"
                    />
                  </label>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  {(invoice.fileUrls?.length ? invoice.fileUrls : [invoice.fileUrl]).map(
                    (url, index, list) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center rounded-md border border-line px-3 text-sm font-semibold hover:bg-canvas"
                      >
                        {list.length > 1
                          ? messages.invoices.viewFileN.replace("{n}", String(index + 1))
                          : messages.invoices.viewFile}
                      </a>
                    ),
                  )}
                  {rejectingId === invoice.id ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === invoice.id}
                        onClick={() => void reject(invoice.id)}
                        className="inline-flex h-9 items-center rounded-md bg-sika-red px-3 text-sm font-semibold text-white hover:bg-sika-red-dark disabled:opacity-60"
                      >
                        {messages.invoices.confirmReject}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === invoice.id}
                        onClick={() => {
                          setRejectingId(null);
                          setNotes((current) => {
                            const next = { ...current };
                            delete next[invoice.id];
                            return next;
                          });
                        }}
                        className="inline-flex h-9 items-center rounded-md border border-line px-3 text-sm font-semibold hover:bg-canvas disabled:opacity-60"
                      >
                        {messages.invoices.cancelReject}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={busyId === invoice.id}
                        onClick={() => void approve(invoice.id)}
                        className="inline-flex h-9 items-center rounded-md bg-sika-red px-3 text-sm font-semibold text-white hover:bg-sika-red-dark disabled:opacity-60"
                      >
                        {messages.admin.approve}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === invoice.id}
                        onClick={() => setRejectingId(invoice.id)}
                        className="inline-flex h-9 items-center rounded-md border border-line px-3 text-sm font-semibold hover:bg-canvas disabled:opacity-60"
                      >
                        {messages.admin.reject}
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )
      ) : reviewed.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-5 py-6 text-sm text-muted">
          {messages.admin.noReviewedInvoices}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">{messages.invoices.reference}</th>
                  <th className="px-4 py-3 font-medium">{messages.admin.name}</th>
                  <th className="px-4 py-3 font-medium">{messages.invoices.date}</th>
                  <th className="px-4 py-3 font-medium">{messages.admin.reviewedAt}</th>
                  <th className="px-4 py-3 font-medium">{messages.invoices.distributor}</th>
                  <th className="px-4 py-3 font-medium">{messages.invoices.products}</th>
                  <th className="px-4 py-3 font-medium">{messages.admin.pointsAwarded}</th>
                  <th className="px-4 py-3 font-medium">{messages.invoices.status}</th>
                  <th className="px-4 py-3 font-medium">{messages.invoices.adminNote}</th>
                  <th className="px-4 py-3 font-medium">{messages.admin.clientReportCol}</th>
                  <th className="px-4 py-3 font-medium">{messages.invoices.file}</th>
                </tr>
              </thead>
              <tbody>
                {reviewed.map((invoice) => {
                  const files = invoice.fileUrls?.length ? invoice.fileUrls : [invoice.fileUrl];
                  return (
                    <tr key={invoice.id} className="border-b border-line align-top last:border-0">
                      <td className="px-4 py-3 font-semibold text-sika-red">{invoice.reference}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{invoice.userName}</p>
                        <p className="text-xs text-muted">{invoice.companyName}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(invoice.createdAt).toLocaleString(dateLocale)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(invoice.updatedAt).toLocaleString(dateLocale)}
                      </td>
                      <td className="px-4 py-3">{invoice.distributor}</td>
                      <td className="px-4 py-3">
                        <ul className="min-w-[14rem] space-y-1">
                          {invoice.products.map((line) => (
                            <li key={`${invoice.id}-${line.productId}-${line.distributor}-${line.quantity}`}>
                              <span className="font-medium">{line.productName}</span>
                              <span className="text-muted">
                                {" "}
                                · {line.quantity}
                                {line.igolflexSeaux > 0
                                  ? ` · Igolflex ${line.igolflexSeaux} (+${formatPoints(line.igolflexPoints, locale)})`
                                  : ""}{" "}
                                · {formatPoints(line.points, locale)} pts
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold tabular-nums text-sika-red">
                        {formatPoints(
                          invoice.status === "approved" ? invoice.pointsAwarded : 0,
                          locale,
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2 font-medium text-ink">
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusBulletClass(invoice.status)}`}
                            aria-hidden="true"
                          />
                          {messages.invoices.statusLabels[invoice.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {invoice.adminNote?.trim() ? (
                          <p className="max-w-[14rem] leading-5">{invoice.adminNote}</p>
                        ) : (
                          <span className="text-muted">{messages.invoices.adminNoteEmpty}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {invoice.clientProblemReport?.trim() ? (
                          <p className="max-w-[14rem] leading-5 text-ink">{invoice.clientProblemReport}</p>
                        ) : (
                          <span className="text-muted">{messages.invoices.adminNoteEmpty}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {files.map((url, index) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-sika-red-dark hover:underline"
                            >
                              {files.length > 1
                                ? messages.invoices.viewFileN.replace("{n}", String(index + 1))
                                : messages.invoices.viewFile}
                            </a>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
