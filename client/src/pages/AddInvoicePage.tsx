import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Alert } from "../components/Alert";
import { useLanguage } from "../context/LanguageContext";
import { ApiError, getProducts, submitInvoice } from "../lib/api";
import { formatPoints } from "../lib/format";
import { allocateProductPoints, igolflexPointsForSeaux } from "../lib/points";
import { translateError } from "../i18n/translations";
import { DISTRIBUTORS } from "../data/distributors";
import type { PublicProduct } from "../types";

type LineDraft = {
  key: string;
  productId: string;
  distributor: string;
  quantity: string;
  igolflexSeaux: string;
};

type WizardStep = "product" | "distributor" | "quantity" | "igolflex";

const MAX_INVOICE_FILES = 5;

function emptyDraft(): Omit<LineDraft, "key"> {
  return { productId: "", distributor: "", quantity: "", igolflexSeaux: "0" };
}

function ProductThumb({ product, alt }: { product: PublicProduct; alt: string }) {
  const [broken, setBroken] = useState(!product.imageUrl);
  if (broken) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sika-yellow-soft to-white px-2 text-center text-[11px] font-semibold leading-snug text-sika-red-dark">
        {product.name}
      </div>
    );
  }
  return (
    <img
      src={product.imageUrl}
      alt={alt}
      className="h-full w-full object-contain p-2"
      onError={() => setBroken(true)}
    />
  );
}

function DistributorLogo({ name, logoUrl }: { name: string; logoUrl: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
    return (
      <div className="flex h-16 w-full items-center justify-center rounded-md bg-sika-yellow-soft text-sm font-bold text-sika-red-dark">
        {initials}
      </div>
    );
  }
  return (
    <div className="flex h-16 w-full items-center justify-center rounded-md bg-white px-2">
      <img
        src={logoUrl}
        alt={name}
        className="max-h-14 w-auto max-w-full object-contain"
        onError={() => setBroken(true)}
      />
    </div>
  );
}

export function AddInvoicePage() {
  const { locale, messages } = useLanguage();
  const copy = messages.addInvoice;
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [wizardOpen, setWizardOpen] = useState(true);
  const [wizardStep, setWizardStep] = useState<WizardStep>("product");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingSnapshot, setEditingSnapshot] = useState<Omit<LineDraft, "key"> | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [igolflexChoice, setIgolflexChoice] = useState<"ask" | "yes" | "no">("ask");
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [pendingRemoveKey, setPendingRemoveKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await getProducts();
        if (!cancelled) {
          setProducts(result.products);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : copy.loadFailed);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const urls = files.map((item) => (item.type.startsWith("image/") ? URL.createObjectURL(item) : null));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [files]);

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const linePoints = useMemo(() => {
    const parsed = lines.map((line) => ({
      productId: line.productId,
      quantity: Number(line.quantity),
    }));
    const productAlloc = allocateProductPoints(parsed, (productId) => productMap.get(productId)?.tiers);
    return lines.map((line, index) => {
      const seaux = Number(line.igolflexSeaux);
      const bonus = Number.isFinite(seaux) && seaux > 0 ? igolflexPointsForSeaux(seaux) : 0;
      return {
        product: productAlloc[index] ?? 0,
        bonus,
        total: (productAlloc[index] ?? 0) + bonus,
      };
    });
  }, [lines, productMap]);

  const totalPoints = linePoints.reduce((sum, value) => sum + value.total, 0);
  const productsReady = lines.length > 0;
  const fileReady = files.length > 0;
  const step1Done = phase > 1;
  const step2Done = phase > 2;
  const step3Done = false;
  const currentStep = phase;

  const steps = [
    { number: 1, label: copy.step1, done: step1Done },
    { number: 2, label: copy.step2, done: step2Done },
    { number: 3, label: copy.step3, done: step3Done },
  ];

  const wizardSubsteps = [
    { id: "product" as const, label: copy.substepProduct },
    { id: "distributor" as const, label: copy.substepDistributor },
    { id: "quantity" as const, label: copy.substepQuantity },
    { id: "igolflex" as const, label: copy.substepTurbo },
  ];
  const wizardSubstepIndex =
    wizardStep === "product"
      ? 0
      : wizardStep === "distributor"
        ? 1
        : wizardStep === "quantity"
          ? 2
          : 3;
  const activeSubstepIndex = wizardSubstepIndex;
  const wizardSubstepTitle =
    wizardStep === "product"
      ? copy.pickProduct
      : wizardStep === "distributor"
        ? copy.pickDistributor
        : wizardStep === "quantity"
          ? copy.pickQuantity
          : copy.igolflexTitle;

  const draftProduct = productMap.get(draft.productId);
  const draftQty = Number(draft.quantity);
  const draftProductPoints = useMemo(() => {
    if (!draftProduct || !Number.isFinite(draftQty) || draftQty < 1) return 0;
    const simulated = [
      ...lines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity) })),
      { productId: draft.productId, quantity: draftQty },
    ];
    const alloc = allocateProductPoints(simulated, (productId) => productMap.get(productId)?.tiers);
    return alloc[alloc.length - 1] ?? 0;
  }, [draft.productId, draftProduct, draftQty, lines, productMap]);
  const draftBonusPoints = useMemo(() => {
    const seaux = Number(draft.igolflexSeaux);
    return Number.isFinite(seaux) && seaux > 0 ? igolflexPointsForSeaux(seaux) : 0;
  }, [draft.igolflexSeaux]);

  function beginNewRequest() {
    if (success) {
      setSuccess(null);
    }
  }

  function resetWizard() {
    setDraft(emptyDraft());
    setWizardStep("product");
    setEditingKey(null);
    setEditingSnapshot(null);
    setIgolflexChoice("ask");
  }

  function openWizard() {
    beginNewRequest();
    setPhase(1);
    resetWizard();
    setWizardOpen(true);
  }

  function cancelWizard() {
    if (lines.length === 0 && !editingKey) return;
    beginNewRequest();
    if (editingKey && editingSnapshot) {
      setLines((current) => [
        ...current,
        {
          key: editingKey,
          productId: editingSnapshot.productId,
          distributor: editingSnapshot.distributor,
          quantity: editingSnapshot.quantity,
          igolflexSeaux: editingSnapshot.igolflexSeaux,
        },
      ]);
    }
    resetWizard();
    setWizardOpen(false);
    setError(null);
  }

  function editLine(key: string) {
    const line = lines.find((item) => item.key === key);
    if (!line) return;
    beginNewRequest();
    const snapshot = {
      productId: line.productId,
      distributor: line.distributor,
      quantity: line.quantity,
      igolflexSeaux: line.igolflexSeaux,
    };
    setLines((current) => current.filter((item) => item.key !== key));
    setDraft(snapshot);
    setEditingKey(key);
    setEditingSnapshot(snapshot);
    setIgolflexChoice(Number(line.igolflexSeaux) > 0 ? "yes" : "ask");
    setWizardStep("product");
    setWizardOpen(true);
    setError(null);
  }

  function goBackWizard() {
    beginNewRequest();
    setError(null);
    if (wizardStep === "igolflex") {
      if (igolflexChoice === "yes") {
        setIgolflexChoice("ask");
        setDraft((current) => ({ ...current, igolflexSeaux: "0" }));
        return;
      }
      setWizardStep("quantity");
      setIgolflexChoice("ask");
      return;
    }
    if (wizardStep === "quantity") {
      setWizardStep("distributor");
      return;
    }
    if (wizardStep === "distributor") {
      setWizardStep("product");
      return;
    }
    cancelWizard();
  }

  function goToPhase(next: 1 | 2 | 3) {
    setPhase(next);
    setError(null);
  }

  function selectProduct(productId: string) {
    beginNewRequest();
    setDraft((current) => ({ ...current, productId }));
    setWizardStep("distributor");
  }

  function selectDistributor(distributor: string) {
    beginNewRequest();
    setDraft((current) => ({ ...current, distributor }));
    setWizardStep("quantity");
  }

  function continueFromQuantity() {
    const quantity = Number(draft.quantity);
    if (!draft.productId || !draft.distributor || !Number.isFinite(quantity) || quantity < 1) {
      setError(copy.needProduct);
      return;
    }
    beginNewRequest();
    setError(null);
    setIgolflexChoice("ask");
    setDraft((current) => ({ ...current, igolflexSeaux: "0" }));
    setWizardStep("igolflex");
  }

  function chooseIgolflexYes() {
    beginNewRequest();
    setIgolflexChoice("yes");
    setDraft((current) => ({
      ...current,
      igolflexSeaux: current.igolflexSeaux !== "0" ? current.igolflexSeaux : "",
    }));
  }

  function chooseIgolflexNo() {
    confirmLineWithSeaux(0);
  }

  function continueFromIgolflex() {
    const seaux = Number(draft.igolflexSeaux);
    if (igolflexChoice !== "yes" || !Number.isFinite(seaux) || seaux < 1) {
      setError(copy.igolflexSeauxLabel);
      return;
    }
    setError(null);
    confirmLineWithSeaux(Math.floor(seaux));
  }

  function confirmLineWithSeaux(igolflexSeaux: number) {
    const quantity = Number(draft.quantity);
    if (!draft.productId || !draft.distributor || !Number.isFinite(quantity) || quantity < 1) {
      setError(copy.needProduct);
      return;
    }
    beginNewRequest();
    const key = editingKey ?? crypto.randomUUID();
    setLines((current) => [
      ...current,
      {
        key,
        productId: draft.productId,
        distributor: draft.distributor,
        quantity: String(quantity),
        igolflexSeaux: String(Math.max(0, igolflexSeaux)),
      },
    ]);
    setWizardOpen(false);
    resetWizard();
    setError(null);
  }

  const showWizardBack = wizardStep !== "product" || lines.length > 0 || editingKey !== null;

  function removeLine(key: string) {
    beginNewRequest();
    setPendingRemoveKey(null);
    setLines((current) => {
      const next = current.filter((line) => line.key !== key);
      if (next.length === 0) {
        setPhase(1);
        setWizardOpen(true);
        resetWizard();
      }
      return next;
    });
  }

  const pendingRemoveLine = pendingRemoveKey
    ? lines.find((line) => line.key === pendingRemoveKey) ?? null
    : null;
  const pendingRemoveProduct = pendingRemoveLine
    ? productMap.get(pendingRemoveLine.productId)
    : null;

  function removeFileAt(index: number) {
    beginNewRequest();
    setFiles((current) => current.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming || incoming.length === 0) return;
    const selected = Array.from(incoming);
    beginNewRequest();
    setFiles((current) => {
      const next = [...current];
      for (const item of selected) {
        if (next.length >= MAX_INVOICE_FILES) break;
        next.push(item);
      }
      return next;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const prepared = lines
      .map((line) => ({
        productId: line.productId,
        distributor: line.distributor,
        quantity: Number(line.quantity),
        igolflexSeaux: Number(line.igolflexSeaux) || 0,
      }))
      .filter(
        (line) =>
          line.productId &&
          line.distributor &&
          Number.isFinite(line.quantity) &&
          line.quantity >= 1,
      );

    if (prepared.length === 0) {
      setError(copy.needProduct);
      return;
    }
    if (files.length === 0) {
      setError(copy.needFile);
      return;
    }

    setSubmitting(true);
    const submittedPoints = totalPoints;
    try {
      const body = new FormData();
      body.set("lines", JSON.stringify(prepared));
      files.forEach((item) => body.append("files", item));
      await submitInvoice(body);
      setSuccess(copy.submitSuccess.replace("{count}", formatPoints(submittedPoints, locale)));
      setLines([]);
      setWizardOpen(true);
      resetWizard();
      setPhase(1);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : copy.submitFailed);
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass =
    "mt-1.5 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-sika-red focus:ring-2 focus:ring-sika-red/20";

  function renderLinesTable(allowActions: boolean, showTotal = false) {
    if (lines.length === 0) {
      return (
        <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          {copy.noLinesYet}
        </p>
      );
    }

    if (allowActions) {
      return (
        <div className="space-y-2">
          {lines.map((line, index) => {
            const product = productMap.get(line.productId);
            const seaux = Number(line.igolflexSeaux);
            const hasBonus = Number.isFinite(seaux) && seaux > 0;
            const productPts = linePoints[index]?.product ?? 0;
            const bonusPts = linePoints[index]?.bonus ?? 0;
            return (
              <div
                key={line.key}
                className="flex items-start gap-3 rounded-lg border border-line bg-canvas/40 px-3 py-3"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-line bg-white">
                  {product ? <ProductThumb product={product} alt={product.name} /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-5 text-ink">{product?.name ?? "—"}</p>
                  <p className="mt-0.5 text-xs text-muted">{line.distributor}</p>
                  <p className="mt-1 text-xs text-ink">
                    {line.quantity} {product?.unit ?? "rouleaux"}
                  </p>
                  {hasBonus ? (
                    <p className="text-xs text-ink">
                      {copy.igolflexSeauxShort.replace("{count}", String(seaux))}
                    </p>
                  ) : null}
                  <p className="mt-1.5 text-xs font-semibold tabular-nums text-sika-red">
                    {copy.pointsLabel} : {formatPoints(productPts, locale)}
                  </p>
                  {hasBonus && bonusPts > 0 ? (
                    <p className="text-xs font-semibold tabular-nums text-sika-red">
                      {copy.bonusLabel} : +{formatPoints(bonusPts, locale)}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-start gap-1">
                  <button
                    type="button"
                    title={copy.editLine}
                    aria-label={copy.editLine}
                    onClick={() => editLine(line.key)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:border-sika-red hover:text-sika-red"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" aria-hidden="true">
                      <path
                        d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    title={copy.removeLine}
                    aria-label={copy.removeLine}
                    onClick={() => setPendingRemoveKey(line.key)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-sika-red hover:border-sika-red hover:bg-sika-yellow-soft"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" aria-hidden="true">
                      <path
                        d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-xl border-2 border-ink/20">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-3 font-medium">{copy.product}</th>
              <th className="px-3 py-3 font-medium">{copy.distributor}</th>
              <th className="px-3 py-3 font-medium">{copy.quantity}</th>
              <th className="px-3 py-3 font-medium">{copy.turboBonusColumn}</th>
              <th className="px-3 py-3 font-medium">{copy.linePoints}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const product = productMap.get(line.productId);
              const distributor = DISTRIBUTORS.find((item) => item.name === line.distributor);
              const seaux = Number(line.igolflexSeaux);
              const hasBonus = Number.isFinite(seaux) && seaux > 0;
              return (
                <tr key={line.key} className="border-b border-line last:border-0">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-line bg-white">
                        {product ? <ProductThumb product={product} alt={product.name} /> : null}
                      </div>
                      <span className="font-medium">{product?.name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {distributor ? (
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-line bg-white p-0.5">
                          <DistributorLogo name={distributor.name} logoUrl={distributor.logoUrl} />
                        </div>
                      ) : null}
                      <span>{line.distributor}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {line.quantity} {product?.unit}
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {hasBonus ? copy.igolflexSeauxShort.replace("{count}", String(seaux)) : "—"}
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    <div className="space-y-0.5">
                      <p className="font-bold text-sika-red">
                        {formatPoints(linePoints[index]?.product ?? 0, locale)}
                      </p>
                      {hasBonus ? (
                        <p className="text-xs font-semibold text-sika-red">
                          +{formatPoints(linePoints[index]?.bonus ?? 0, locale)}
                        </p>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {showTotal ? (
            <tfoot>
              <tr className="bg-sika-yellow-soft">
                <td colSpan={4} className="px-3 py-3 text-sm font-semibold text-ink">
                  {copy.estimatedPoints}
                </td>
                <td className="px-3 py-3 text-xl font-bold tabular-nums text-sika-red">
                  {formatPoints(totalPoints, locale)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-center text-xl font-semibold tracking-tight text-ink sm:text-2xl">{copy.catalogTitle}</h2>

      <ol className="mx-auto flex w-full max-w-2xl items-start justify-center gap-0 px-2">
        {steps.map((step, index) => {
          const active = currentStep === step.number && !step.done;
          const circleClass = step.done
            ? "border-sika-red bg-sika-red text-white"
            : active
              ? "border-sika-red bg-sika-yellow text-ink"
              : "border-line bg-white text-muted";
          return (
            <li key={step.number} className="flex flex-1 items-start">
              <div className="flex w-full flex-col items-center text-center">
                <div className="flex w-full items-center">
                  {index > 0 ? (
                    <div
                      className={`h-0.5 flex-1 ${steps[index - 1]?.done ? "bg-sika-red" : "bg-line"}`}
                      aria-hidden="true"
                    />
                  ) : (
                    <div className="flex-1" aria-hidden="true" />
                  )}
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${circleClass}`}
                  >
                    {step.done ? "✓" : step.number}
                  </span>
                  {index < steps.length - 1 ? (
                    <div className={`h-0.5 flex-1 ${step.done ? "bg-sika-red" : "bg-line"}`} aria-hidden="true" />
                  ) : (
                    <div className="flex-1" aria-hidden="true" />
                  )}
                </div>
                <p
                  className={`mt-2 max-w-[7.5rem] text-xs font-semibold leading-4 sm:max-w-[9rem] sm:text-sm ${
                    step.done || active ? "text-ink" : "text-muted"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {error ? <Alert>{error}</Alert> : null}
      {success ? (
        <Alert tone="warning">
          {success}{" "}
          <Link to="/historique" className="font-semibold text-sika-red-dark hover:underline">
            {copy.trackRequest}
          </Link>
        </Alert>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">{messages.nav.loading}</p>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit}>
          {phase === 1 ? (
          <section
            className={`overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-colors ${
              !step1Done ? "border-sika-yellow" : "border-line"
            }`}
          >
            <div className="border-b border-line bg-canvas/80 px-5 py-4">
              <div className="flex flex-wrap items-start gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    step1Done ? "bg-sika-red text-white" : "bg-sika-yellow text-ink"
                  }`}
                >
                  {step1Done ? "✓" : "1"}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-ink sm:text-lg">
                    {wizardOpen ? wizardSubstepTitle : copy.addedProducts}
                  </h2>
                </div>
              </div>

              {wizardOpen ? (
                <ol className="mt-4 flex items-start">
                  {wizardSubsteps.map((sub, index) => {
                    const done = index < activeSubstepIndex;
                    const active = index === activeSubstepIndex;
                    const circleClass = done
                      ? "border-sika-red bg-sika-red text-white"
                      : active
                        ? "border-sika-red bg-sika-yellow text-ink"
                        : "border-line bg-white text-muted";
                    return (
                      <li key={sub.id} className="flex min-w-0 flex-1 items-start">
                        <div className="flex w-full flex-col items-center text-center">
                          <div className="flex w-full items-center">
                            {index > 0 ? (
                              <div
                                className={`h-0.5 flex-1 ${index <= activeSubstepIndex ? "bg-sika-red" : "bg-line"}`}
                                aria-hidden="true"
                              />
                            ) : (
                              <div className="flex-1" aria-hidden="true" />
                            )}
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${circleClass}`}
                            >
                              {done ? "✓" : index + 1}
                            </span>
                            {index < wizardSubsteps.length - 1 ? (
                              <div
                                className={`h-0.5 flex-1 ${index < activeSubstepIndex ? "bg-sika-red" : "bg-line"}`}
                                aria-hidden="true"
                              />
                            ) : (
                              <div className="flex-1" aria-hidden="true" />
                            )}
                          </div>
                          <p
                            className={`mt-1.5 max-w-full truncate px-0.5 text-[10px] font-semibold leading-tight sm:text-xs ${
                              done || active ? "text-ink" : "text-muted"
                            }`}
                          >
                            {sub.label}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : null}

              {wizardOpen ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{copy.draftLine}</p>
                  <div className="overflow-x-auto rounded-xl border-2 border-ink/25 bg-white">
                    <div className="flex min-w-[48rem] items-stretch divide-x divide-line">
                      <div className="flex min-w-0 flex-[1.4] flex-col gap-2 p-3">
                        {draft.productId && draftProduct ? (
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-canvas">
                              <ProductThumb product={draftProduct} alt={draftProduct.name} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                                {copy.product}
                              </p>
                              <p className="text-sm font-semibold leading-snug text-ink">{draftProduct.name}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="h-14 w-14 shrink-0 rounded-lg border border-dashed border-line bg-canvas" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                                {copy.product}
                              </p>
                              <p className="text-sm text-muted">—</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-[1.4] flex-col gap-2 p-3">
                        {draft.distributor ? (
                          <div className="flex min-w-0 items-center gap-3">
                            {(() => {
                              const distributor = DISTRIBUTORS.find((item) => item.name === draft.distributor);
                              return distributor ? (
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-white p-1">
                                  <DistributorLogo name={distributor.name} logoUrl={distributor.logoUrl} />
                                </div>
                              ) : null;
                            })()}
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                                {copy.distributor}
                              </p>
                              <p className="text-sm font-semibold leading-snug text-ink">{draft.distributor}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="h-14 w-14 shrink-0 rounded-lg border border-dashed border-line bg-canvas" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                                {copy.distributor}
                              </p>
                              <p className="text-sm text-muted">—</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-[0.8] flex-col justify-center gap-2 p-3">
                        {draft.quantity && Number(draft.quantity) >= 1 ? (
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                              {copy.quantity}
                            </p>
                            <p className="text-sm font-semibold text-ink">
                              {draft.quantity} {draftProduct?.unit}
                            </p>
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                              {copy.quantity}
                            </p>
                            <p className="text-sm text-muted">—</p>
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-[0.9] flex-col justify-center gap-2 p-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                            {copy.turboBonusColumn}
                          </p>
                          <p className="text-sm font-semibold text-ink">
                            {Number(draft.igolflexSeaux) > 0
                              ? copy.igolflexSeauxShort.replace("{count}", draft.igolflexSeaux)
                              : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex w-28 shrink-0 flex-col items-center justify-center bg-sika-yellow-soft p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                          {copy.linePoints}
                        </p>
                        <p className="text-xl font-bold tabular-nums text-sika-red">
                          {formatPoints(draftProductPoints, locale)}
                        </p>
                        {draftBonusPoints > 0 ? (
                          <p className="text-xs font-semibold tabular-nums text-sika-red">
                            +{formatPoints(draftBonusPoints, locale)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-5 p-5">
              {wizardOpen ? (
                <div className="space-y-5">
                  {showWizardBack ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={goBackWizard}
                        className="inline-flex h-11 items-center justify-center rounded-lg border border-line px-5 text-sm font-semibold text-ink hover:bg-canvas"
                      >
                        {copy.back}
                      </button>
                      {lines.length > 0 ? (
                        <p className="text-sm font-semibold text-ink">
                          {copy.addedProductsCount.split("{count}")[0]}
                          <span className="text-sika-red">{lines.length}</span>
                          {copy.addedProductsCount.split("{count}")[1] ?? ""}
                        </p>
                      ) : (
                        <span />
                      )}
                    </div>
                  ) : null}

                  {wizardStep === "product" ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {products.map((product) => {
                        const selected = draft.productId === product.id;
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => selectProduct(product.id)}
                            className={`overflow-hidden rounded-xl border-2 bg-white text-left transition-all hover:border-sika-red hover:shadow-md ${
                              selected ? "border-sika-red shadow-md ring-2 ring-sika-red/20" : "border-ink/20"
                            }`}
                          >
                            <div className="aspect-[4/3] bg-canvas">
                              <ProductThumb product={product} alt={product.name} />
                            </div>
                            <p className="px-2 py-3 text-center text-sm font-semibold leading-snug text-ink">
                              {product.name}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {wizardStep === "distributor" ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {DISTRIBUTORS.map((item) => {
                        const selected = draft.distributor === item.name;
                        return (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => selectDistributor(item.name)}
                            className={`flex flex-col items-center gap-2 rounded-xl border-2 bg-white p-3 text-center transition-all hover:border-sika-red hover:shadow-md ${
                              selected ? "border-sika-red shadow-md ring-2 ring-sika-red/20" : "border-ink/20"
                            }`}
                          >
                            <DistributorLogo name={item.name} logoUrl={item.logoUrl} />
                            <span className="text-xs font-semibold leading-snug text-ink">{item.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {wizardStep === "quantity" ? (
                    <div className="mx-auto max-w-md space-y-3">
                      <label className="block text-sm font-medium text-ink">
                        {copy.quantity} ({draftProduct?.unit ?? "rouleaux"})
                        <input
                          type="number"
                          min={1}
                          value={draft.quantity}
                          placeholder={copy.quantityPlaceholder}
                          onChange={(event) => {
                            beginNewRequest();
                            setDraft((current) => ({ ...current, quantity: event.target.value }));
                          }}
                          className={fieldClass}
                          autoFocus
                        />
                      </label>
                      {draft.quantity && Number(draft.quantity) >= 1 ? (
                        <button
                          type="button"
                          onClick={continueFromQuantity}
                          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-sika-red px-4 text-sm font-semibold text-white hover:bg-sika-red-dark"
                        >
                          {copy.continueWizard}
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {wizardStep === "igolflex" ? (
                    <div className="mx-auto max-w-2xl space-y-4">
                      {igolflexChoice === "ask" ? (
                        <>
                          <div className="flex flex-col gap-4 rounded-xl border border-line bg-canvas/40 p-4 sm:flex-row sm:items-center sm:gap-5">
                            <div className="min-w-0 flex-1 space-y-3">
                              <p className="text-sm leading-6 text-ink">
                                {copy.igolflexQuestionLead.split("{product}")[0]}
                                <strong className="font-bold text-ink">{copy.igolflexProductName}</strong>
                                {copy.igolflexQuestionLead.split("{product}")[1] ?? ""}
                              </p>
                              <p className="text-sm leading-6 text-muted">
                                {copy.igolflexQuestionHintBefore}
                                <strong className="font-bold text-ink">{copy.igolflexQuestionHintBonus}</strong>
                                {copy.igolflexQuestionHintAfter}
                              </p>
                              <div className="flex flex-wrap gap-3 pt-1">
                                <button
                                  type="button"
                                  onClick={chooseIgolflexYes}
                                  className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-sika-red px-4 text-sm font-semibold text-white hover:bg-sika-red-dark sm:flex-none sm:min-w-[7rem]"
                                >
                                  {copy.igolflexYes}
                                </button>
                                <button
                                  type="button"
                                  onClick={chooseIgolflexNo}
                                  className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-canvas sm:flex-none sm:min-w-[7rem]"
                                >
                                  {copy.igolflexNo}
                                </button>
                              </div>
                            </div>
                            <div className="mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-line bg-white p-2 sm:mx-0 sm:h-32 sm:w-32">
                              <img
                                src="/images/igolflex.png"
                                alt={copy.igolflexProductName}
                                className="h-full w-full object-contain"
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <label className="block text-sm font-medium text-ink">
                            {copy.igolflexSeauxLabel}
                            <input
                              type="number"
                              min={1}
                              value={draft.igolflexSeaux === "0" ? "" : draft.igolflexSeaux}
                              placeholder={copy.igolflexSeauxPlaceholder}
                              onChange={(event) => {
                                beginNewRequest();
                                setError(null);
                                setDraft((current) => ({ ...current, igolflexSeaux: event.target.value }));
                              }}
                              className={fieldClass}
                              autoFocus
                            />
                          </label>
                          {Number(draft.igolflexSeaux) >= 1 ? (
                            <p className="text-sm font-semibold text-sika-red">
                              {copy.igolflexBonus}: +{formatPoints(draftBonusPoints, locale)}
                            </p>
                          ) : null}
                          <button
                            type="button"
                            onClick={continueFromIgolflex}
                            disabled={!draft.igolflexSeaux || Number(draft.igolflexSeaux) < 1}
                            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-sika-red px-4 text-sm font-semibold text-white hover:bg-sika-red-dark disabled:opacity-50"
                          >
                            {copy.confirmLine}
                          </button>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  {renderLinesTable(true)}
                  <div className="space-y-3 rounded-lg border-2 border-sika-yellow bg-sika-yellow-soft p-4">
                    <p className="text-sm font-medium text-ink">{copy.afterAddChoice}</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={openWizard}
                        className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-sika-yellow bg-white px-4 text-sm font-semibold text-ink hover:bg-sika-yellow/40"
                      >
                        {copy.addAnother}
                      </button>
                      <button
                        type="button"
                        disabled={lines.length === 0}
                        onClick={() => goToPhase(2)}
                        className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-sika-red px-4 text-sm font-semibold text-white hover:bg-sika-red-dark disabled:opacity-50"
                      >
                        {copy.continueToUpload}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
          ) : null}

          {phase === 2 ? (
          <section
            className={`overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-colors ${
              !step2Done ? "border-sika-yellow" : "border-line"
            }`}
          >
            <div className="flex items-center gap-3 border-b border-line bg-canvas/80 px-5 py-4">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  step2Done ? "bg-sika-red text-white" : "bg-sika-yellow text-ink"
                }`}
              >
                {step2Done ? "✓" : "2"}
              </span>
              <div>
                <h2 className="text-base font-semibold text-ink sm:text-lg">{copy.uploadLabel}</h2>
                <p className="text-xs text-muted sm:text-sm">{copy.uploadHint}</p>
              </div>
            </div>

            <div className="p-5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="sr-only"
                onChange={(event) => addFiles(event.target.files)}
              />
              {files.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-sika-red/40 bg-sika-yellow-soft/40 px-6 py-10 text-center transition-colors hover:border-sika-red hover:bg-sika-yellow-soft"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sika-red shadow-sm">
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" aria-hidden="true">
                      <path d="M12 16V8M8 12l4-4 4 4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="text-base font-semibold text-ink">{copy.chooseFile}</span>
                  <span className="text-xs text-muted">{copy.uploadHint}</span>
                </button>
              ) : (
                <div className="space-y-3">
                  {files.map((item, index) => (
                    <div
                      key={`${item.name}-${item.size}-${index}`}
                      className="flex flex-col gap-4 rounded-xl border border-line bg-canvas/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        {previewUrls[index] ? (
                          <img
                            src={previewUrls[index]!}
                            alt={item.name}
                            className="h-24 w-24 shrink-0 rounded-lg border border-line object-cover"
                          />
                        ) : (
                          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-line bg-white px-2 text-center text-xs font-semibold text-muted">
                            {copy.pdfSelected}
                          </div>
                        )}
                        <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFileAt(index)}
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold text-sika-red hover:bg-white"
                      >
                        {copy.removeFile}
                      </button>
                    </div>
                  ))}
                  {files.length < MAX_INVOICE_FILES ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-dashed border-sika-red px-5 text-sm font-semibold text-sika-red-dark hover:bg-sika-yellow-soft"
                    >
                      + {copy.addMoreFiles}
                    </button>
                  ) : (
                    <p className="text-center text-xs text-muted">{copy.maxFilesReached}</p>
                  )}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => goToPhase(1)}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-line px-5 text-sm font-semibold text-ink hover:bg-canvas"
                >
                  {copy.backToProducts}
                </button>
                <button
                  type="button"
                  disabled={!fileReady}
                  onClick={() => goToPhase(3)}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-sika-red px-5 text-sm font-semibold text-white hover:bg-sika-red-dark disabled:opacity-50"
                >
                  {copy.continueToSubmit}
                </button>
              </div>
            </div>
          </section>
          ) : null}

          {phase === 3 ? (
          <section
            className={`overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-colors ${
              !step3Done ? "border-sika-yellow" : "border-line"
            }`}
          >
            <div className="border-b border-line bg-canvas/80 px-5 py-4">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    step3Done ? "bg-sika-red text-white" : "bg-sika-yellow text-ink"
                  }`}
                >
                  {step3Done ? "✓" : "3"}
                </span>
                <div>
                  <h2 className="text-base font-semibold text-ink sm:text-lg">{copy.step3}</h2>
                  <p className="text-xs text-muted sm:text-sm">{copy.recapTable}</p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5">
              {renderLinesTable(false, true)}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => goToPhase(2)}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-line px-5 text-sm font-semibold text-ink hover:bg-canvas"
                >
                  {copy.backToUpload}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !productsReady || !fileReady || wizardOpen}
                  className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-sika-red px-6 text-base font-semibold text-white hover:bg-sika-red-dark disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {submitting ? copy.submitting : copy.submit}
                </button>
              </div>
            </div>
          </section>
          ) : null}
        </form>
      )}

      {pendingRemoveKey
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/45 p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="remove-line-title"
                className="w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-lg"
              >
                <h2 id="remove-line-title" className="text-lg font-semibold text-ink">
                  {copy.removeLine}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">{copy.removeLineConfirm}</p>
                {pendingRemoveLine ? (
                  <div className="mt-3 space-y-1 rounded-lg border border-line bg-canvas/50 px-3 py-3 text-sm">
                    {pendingRemoveProduct ? (
                      <p className="font-semibold text-ink">{pendingRemoveProduct.name}</p>
                    ) : null}
                    <p className="text-muted">
                      {copy.distributor} :{" "}
                      <span className="font-medium text-ink">{pendingRemoveLine.distributor}</span>
                    </p>
                    <p className="text-muted">
                      {copy.quantity} :{" "}
                      <span className="font-medium text-ink">
                        {pendingRemoveLine.quantity}{" "}
                        {pendingRemoveProduct?.unit ?? "rouleaux"}
                      </span>
                    </p>
                    {Number(pendingRemoveLine.igolflexSeaux) > 0 ? (
                      <p className="text-muted">
                        {copy.turboBonusColumn} :{" "}
                        <span className="font-medium text-ink">
                          {copy.igolflexSeauxShort.replace(
                            "{count}",
                            String(pendingRemoveLine.igolflexSeaux),
                          )}
                        </span>
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingRemoveKey(null)}
                    className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-canvas"
                  >
                    {copy.removeLineConfirmNo}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLine(pendingRemoveKey)}
                    className="inline-flex h-10 items-center rounded-md bg-sika-red px-4 text-sm font-semibold text-white hover:bg-sika-red-dark"
                  >
                    {copy.removeLineConfirmYes}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
