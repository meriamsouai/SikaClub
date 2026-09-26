import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { Alert } from "../components/Alert";
import { PointsBalanceChart } from "../components/PointsBalanceChart";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { ApiError, getMyInvoices, getMyPoints, getMyRedemptions, reportInvoiceProblem } from "../lib/api";
import { formatPoints } from "../lib/format";
import { translateError } from "../i18n/translations";
import type { InvoiceStatus, PublicGiftRedemption, PublicInvoice, PublicPointEntry } from "../types";

type HistoryTab = "factures" | "points";
type ReportStep = "confirm" | "form";

function statusBulletClass(status: InvoiceStatus) {
  if (status === "approved") return "bg-emerald-500";
  if (status === "pending") return "bg-amber-500";
  return "bg-red-500";
}

function isDecidedStatus(status: string) {
  return status === "approved" || status === "rejected";
}

function ProblemIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M20 6L9 17l-5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HistoryPage() {
  const { user, refreshUser } = useAuth();
  const { locale, messages } = useLanguage();
  const invoicesCopy = messages.invoices;
  const pointsCopy = messages.points;
  const giftsCopy = messages.gifts;
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: HistoryTab = tabParam === "points" ? "points" : "factures";

  const [invoices, setInvoices] = useState<PublicInvoice[]>([]);
  const [pointEntries, setPointEntries] = useState<PublicPointEntry[]>([]);
  const [redemptions, setRedemptions] = useState<PublicGiftRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportDraft, setReportDraft] = useState("");
  const [reportBusyId, setReportBusyId] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportInvoiceRef, setReportInvoiceRef] = useState<PublicInvoice | null>(null);
  const [reportStep, setReportStep] = useState<ReportStep>("confirm");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invoiceResult, pointsResult, redemptionsResult] = await Promise.all([
        getMyInvoices(),
        getMyPoints(),
        getMyRedemptions(),
      ]);
      setInvoices(invoiceResult.invoices);
      setPointEntries(pointsResult.entries);
      setRedemptions(redemptionsResult.redemptions);
      await refreshUser();
    } catch (err) {
      setError(
        err instanceof ApiError ? translateError(err.code, err.message, messages) : invoicesCopy.loadFailed,
      );
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function setTab(next: HistoryTab) {
    setSearchParams(next === "factures" ? {} : { tab: next }, { replace: true });
  }

  function entryLabel(entry: PublicPointEntry) {
    if (entry.type === "welcome") return pointsCopy.welcomeBonus;
    return entry.label;
  }

  function openReport(invoice: PublicInvoice) {
    if (!isDecidedStatus(invoice.status) || invoice.clientProblemReport?.trim()) return;
    setReportTargetId(invoice.id);
    setReportInvoiceRef(invoice);
    setReportStep("confirm");
    setReportDraft("");
    setError(null);
  }

  function closeReport() {
    setReportTargetId(null);
    setReportInvoiceRef(null);
    setReportStep("confirm");
    setReportDraft("");
  }

  async function submitReport() {
    if (!reportTargetId) return;
    const message = reportDraft.trim();
    if (!message) return;
    setReportBusyId(reportTargetId);
    setReportMessage(null);
    setError(null);
    try {
      const result = await reportInvoiceProblem(reportTargetId, message);
      setInvoices((current) =>
        current.map((item) => (item.id === reportTargetId ? result.invoice : item)),
      );
      setReportMessage(invoicesCopy.clientReportSaved);
      closeReport();
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : invoicesCopy.loadFailed);
    } finally {
      setReportBusyId(null);
    }
  }

  const reportInvoice =
    reportInvoiceRef ??
    (reportTargetId ? invoices.find((item) => item.id === reportTargetId) ?? null : null);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted">{messages.nav.history}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{messages.nav.history}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {tab === "factures" ? invoicesCopy.description : pointsCopy.description}
        </p>
      </div>

      <div className="flex gap-2 border-b border-line">
        <button
          type="button"
          onClick={() => setTab("factures")}
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === "factures"
              ? "border-sika-red text-sika-red-dark"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {messages.nav.invoices}
        </button>
        <button
          type="button"
          onClick={() => setTab("points")}
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === "points"
              ? "border-sika-red text-sika-red-dark"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {messages.nav.points}
        </button>
      </div>

      {tab === "factures" ? (
        <div className="space-y-4">
          {error && !reportTargetId ? <Alert>{error}</Alert> : null}
          {reportMessage ? <Alert tone="warning">{reportMessage}</Alert> : null}
          {loading ? (
            <p className="text-sm text-muted">{messages.nav.loading}</p>
          ) : invoices.length === 0 ? (
            <p className="rounded-lg border border-line bg-white px-5 py-6 text-sm text-muted">{invoicesCopy.empty}</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-line bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">{invoicesCopy.reference}</th>
                      <th className="px-4 py-3 font-medium">{invoicesCopy.date}</th>
                      <th className="px-4 py-3 font-medium">{invoicesCopy.distributor}</th>
                      <th className="px-4 py-3 font-medium">{invoicesCopy.products}</th>
                      <th className="px-4 py-3 font-medium">{invoicesCopy.points}</th>
                      <th className="px-4 py-3 font-medium">{invoicesCopy.status}</th>
                      <th className="px-4 py-3 font-medium">{invoicesCopy.adminNote}</th>
                      <th className="px-4 py-3 font-medium">{invoicesCopy.file}</th>
                      <th className="px-4 py-3 font-medium text-center">{invoicesCopy.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => {
                      const points =
                        invoice.status === "approved" ? invoice.pointsAwarded : invoice.estimatedPoints;
                      const files = invoice.fileUrls?.length ? invoice.fileUrls : [invoice.fileUrl];
                      const alreadyReported = Boolean(invoice.clientProblemReport?.trim());
                      const canReport = !alreadyReported && isDecidedStatus(invoice.status);

                      return (
                        <tr key={invoice.id} className="border-b border-line align-top last:border-0">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-sika-red">{invoice.reference}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-ink">
                            {new Date(invoice.createdAt).toLocaleDateString(
                              locale === "fr" ? "fr-FR" : "en-GB",
                            )}
                          </td>
                          <td className="px-4 py-3 text-ink">{invoice.distributor}</td>
                          <td className="px-4 py-3">
                            <ul className="min-w-[12rem] space-y-3 text-ink">
                              {invoice.products.map((line) => (
                                <li key={`${invoice.id}-${line.productId}-${line.distributor}-${line.quantity}`}>
                                  <p className="font-medium leading-5">{line.productName}</p>
                                  <p className="text-sm text-muted">
                                    {line.quantity} {invoicesCopy.rolls}
                                  </p>
                                  {line.igolflexSeaux > 0 ? (
                                    <p className="text-sm text-muted">
                                      {line.igolflexSeaux} {invoicesCopy.igolflexBuckets}
                                    </p>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-semibold tabular-nums text-sika-red">
                            {formatPoints(points, locale)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-2 font-medium text-ink">
                              <span
                                className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusBulletClass(invoice.status)}`}
                                aria-hidden="true"
                              />
                              {invoicesCopy.statusLabels[invoice.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {invoice.adminNote?.trim() ? (
                              <p className="max-w-[16rem] text-sm leading-5 text-ink">{invoice.adminNote}</p>
                            ) : (
                              <span className="text-muted">{invoicesCopy.adminNoteEmpty}</span>
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
                                    ? invoicesCopy.viewFileN.replace("{n}", String(index + 1))
                                    : invoicesCopy.viewFile}
                                </a>
                              ))}
                            </div>
                          </td>
                          <td className="relative z-10 px-4 py-3 text-center">
                            {alreadyReported ? (
                              <span
                                title={invoicesCopy.clientReportDone}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-2 text-emerald-600"
                              >
                                <CheckIcon />
                              </span>
                            ) : canReport ? (
                              <button
                                type="button"
                                title={invoicesCopy.clientReport}
                                aria-label={invoicesCopy.clientReport}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  openReport(invoice);
                                }}
                                className="relative z-10 inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-xs font-semibold text-ink hover:border-sika-red hover:text-sika-red"
                              >
                                <ProblemIcon />
                                <span className="hidden sm:inline">{invoicesCopy.clientReport}</span>
                              </button>
                            ) : (
                              <span
                                title={invoicesCopy.clientReportUnavailable}
                                className="inline-flex h-9 items-center justify-center rounded-md border border-dashed border-line px-2 text-muted"
                              >
                                <ProblemIcon />
                              </span>
                            )}
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
      ) : (
        <div className="space-y-6">
          {error ? <Alert>{error}</Alert> : null}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
            <section className="overflow-hidden rounded-lg border border-line bg-white">
              <div className="h-1 bg-sika-red" />
              <div className="px-6 py-6">
                <p className="text-sm font-medium text-muted">{pointsCopy.total}</p>
                <p className="mt-2 text-4xl font-semibold tabular-nums">
                  {formatPoints(user?.totalPoints ?? 0, locale)}
                </p>
              </div>
            </section>

            {!loading && pointEntries.length > 0 ? (
              <PointsBalanceChart
                entries={pointEntries}
                locale={locale}
                title={pointsCopy.chartTitle}
                peakLabel={pointsCopy.chartPeak}
                emptyLabel={pointsCopy.chartEmpty}
                hoverHint={pointsCopy.chartHoverHint}
              />
            ) : null}
          </div>

          <div className="overflow-hidden rounded-lg border border-line bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">{pointsCopy.invoice}</th>
                    <th className="px-4 py-3 font-medium">{pointsCopy.eyebrow}</th>
                    <th className="px-4 py-3 font-medium">{invoicesCopy.date}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-12 text-center text-muted">
                        {messages.nav.loading}
                      </td>
                    </tr>
                  ) : pointEntries.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-12 text-center text-muted">
                        {pointsCopy.empty}
                      </td>
                    </tr>
                  ) : (
                    pointEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3">{entryLabel(entry)}</td>
                        <td
                          className={`px-4 py-3 font-semibold tabular-nums ${
                            entry.points < 0 ? "text-ink" : "text-sika-red"
                          }`}
                        >
                          {entry.points > 0 ? "+" : ""}
                          {formatPoints(entry.points, locale)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(entry.createdAt).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-ink">{giftsCopy.myRedemptions}</h2>
            {loading ? (
              <p className="text-sm text-muted">{messages.nav.loading}</p>
            ) : redemptions.length === 0 ? (
              <p className="rounded-lg border border-line bg-white px-5 py-6 text-sm text-muted">
                {giftsCopy.noRedemptions}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-line bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">{giftsCopy.redemptionReference}</th>
                      <th className="px-4 py-3 font-medium">{giftsCopy.redemptionGift}</th>
                      <th className="px-4 py-3 font-medium">{giftsCopy.redemptionPoints}</th>
                      <th className="px-4 py-3 font-medium">{giftsCopy.redemptionStatus}</th>
                      <th className="px-4 py-3 font-medium">{invoicesCopy.date}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redemptions.map((item) => (
                      <tr key={item.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 font-semibold text-sika-red">{item.reference}</td>
                        <td className="px-4 py-3">{item.giftName}</td>
                        <td className="px-4 py-3 tabular-nums">{formatPoints(item.pointsSpent, locale)}</td>
                        <td className="px-4 py-3 font-medium">{giftsCopy.statusLabels[item.status]}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {reportInvoice
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/45 p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="report-problem-title"
                className="w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-lg"
                onClick={(event) => event.stopPropagation()}
              >
                {error ? <div className="mb-3"><Alert>{error}</Alert></div> : null}
                {reportStep === "confirm" ? (
                  <>
                    <h2 id="report-problem-title" className="text-lg font-semibold text-ink">
                      {invoicesCopy.clientReport}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-muted">{invoicesCopy.clientReportConfirm}</p>
                    <p className="mt-2 text-sm font-semibold text-sika-red">{reportInvoice.reference}</p>
                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={closeReport}
                        className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-canvas"
                      >
                        {invoicesCopy.clientReportConfirmNo}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportStep("form")}
                        className="inline-flex h-10 items-center rounded-md bg-sika-red px-4 text-sm font-semibold text-white hover:bg-sika-red-dark"
                      >
                        {invoicesCopy.clientReportConfirmYes}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 id="report-problem-title" className="text-lg font-semibold text-ink">
                      {invoicesCopy.clientReport}
                    </h2>
                    <p className="mt-1 text-sm text-muted">{reportInvoice.reference}</p>
                    <label className="mt-4 block text-sm font-medium text-ink">
                      {invoicesCopy.clientReportLabel}
                      <textarea
                        value={reportDraft}
                        onChange={(event) => setReportDraft(event.target.value)}
                        placeholder={invoicesCopy.clientReportPlaceholder}
                        rows={4}
                        className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-sika-red focus:ring-2 focus:ring-sika-red/20"
                      />
                    </label>
                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={closeReport}
                        className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-canvas"
                      >
                        {invoicesCopy.clientReportCancel}
                      </button>
                      <button
                        type="button"
                        disabled={reportBusyId === reportInvoice.id || !reportDraft.trim()}
                        onClick={() => void submitReport()}
                        className="inline-flex h-10 items-center rounded-md bg-sika-red px-4 text-sm font-semibold text-white hover:bg-sika-red-dark disabled:opacity-60"
                      >
                        {invoicesCopy.clientReportSubmit}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
