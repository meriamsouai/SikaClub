import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Alert } from "../components/Alert";
import { ImageUploadField } from "../components/ImageUploadField";
import { TextField } from "../components/TextField";
import { useLanguage } from "../context/LanguageContext";
import {
  ApiError,
  createGift,
  getAdminGifts,
  hideGift,
  restoreGift,
  updateGift,
} from "../lib/api";
import { formatPoints, formatTnd } from "../lib/format";
import { translateError } from "../i18n/translations";
import type { PublicGift } from "../types";

const emptyForm = {
  name: "",
  valueTnd: "",
  pointsRequired: "",
};

const API_URL = import.meta.env.VITE_API_URL ?? "";

function giftImageSrc(imageUrl: string) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://") || imageUrl.startsWith("/images/")) {
    return imageUrl;
  }
  return `${API_URL}${imageUrl}`;
}

export function AdminGiftsPage() {
  const { locale, messages } = useLanguage();
  const [gifts, setGifts] = useState<PublicGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminGifts();
      setGifts(result.gifts);
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : messages.admin.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(gift: PublicGift) {
    setEditingId(gift.id);
    setForm({
      name: gift.name,
      valueTnd: String(gift.valueTnd),
      pointsRequired: String(gift.pointsRequired),
    });
    setImageFile(null);
    setEditingImageUrl(giftImageSrc(gift.imageUrl));
    setMessage(null);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setEditingImageUrl("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const body = new FormData();
      body.set("name", form.name.trim());
      body.set("valueTnd", form.valueTnd);
      body.set("pointsRequired", form.pointsRequired);
      if (imageFile) body.set("image", imageFile);

      if (editingId) {
        await updateGift(editingId, body);
        setMessage(messages.admin.giftUpdated);
      } else {
        await createGift(body);
        setMessage(messages.admin.giftCreated);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : messages.admin.actionFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(gift: PublicGift) {
    setError(null);
    setMessage(null);
    try {
      if (gift.active) {
        await hideGift(gift.id);
        setMessage(messages.admin.giftHidden);
      } else {
        await restoreGift(gift.id);
        setMessage(messages.admin.giftRestored);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : messages.admin.actionFailed);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{messages.admin.gifts}</h1>
        <p className="mt-2 text-sm text-muted">{messages.admin.giftsDescription}</p>
      </div>

      {error ? <Alert>{error}</Alert> : null}
      {message ? <Alert tone="warning">{message}</Alert> : null}

      <form className="space-y-4 rounded-lg border border-line bg-white p-5" onSubmit={handleSubmit}>
        <h2 className="text-lg font-semibold text-ink">
          {editingId ? messages.admin.editGift : messages.admin.addGift}
        </h2>
        <TextField
          label={messages.admin.giftName}
          name="name"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={messages.admin.giftValue}
            name="valueTnd"
            type="number"
            min={0}
            value={form.valueTnd}
            onChange={(event) => setForm((current) => ({ ...current, valueTnd: event.target.value }))}
            required
          />
          <TextField
            label={messages.admin.giftPoints}
            name="pointsRequired"
            type="number"
            min={0}
            value={form.pointsRequired}
            onChange={(event) => setForm((current) => ({ ...current, pointsRequired: event.target.value }))}
            required
          />
        </div>
        <div className="max-w-sm">
          <ImageUploadField
            label={messages.admin.giftImage}
            chooseLabel={messages.admin.imageChoose}
            clearLabel={messages.admin.imageClear}
            file={imageFile}
            onFileChange={setImageFile}
            existingUrl={editingImageUrl}
            previewAspectClassName="aspect-[4/3]"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 items-center rounded-md bg-sika-red px-4 text-sm font-semibold text-white hover:bg-sika-red-dark disabled:opacity-60"
          >
            {submitting ? messages.admin.saving : editingId ? messages.admin.saveGift : messages.admin.createGift}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-canvas"
            >
              {messages.dashboard.cancel}
            </button>
          ) : null}
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-muted">{messages.nav.loading}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {gifts.map((gift) => (
            <article key={gift.id} className={`rounded-lg border bg-white p-4 ${gift.active ? "border-line" : "border-dashed border-muted opacity-80"}`}>
              <div className="mb-3 aspect-[4/3] overflow-hidden rounded-md bg-sika-yellow-soft p-3">
                <img
                  src={giftImageSrc(gift.imageUrl) || "/images/gifts-temp.jpg"}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </div>
              <h3 className="text-sm font-semibold text-ink">{gift.name}</h3>
              <p className="mt-2 text-xs text-muted">
                {formatTnd(gift.valueTnd, locale)} · {formatPoints(gift.pointsRequired, locale)} {messages.admin.pointsShort}
              </p>
              <p className="mt-1 text-xs font-medium text-ink">
                {gift.active ? messages.admin.visible : messages.admin.hidden}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(gift)}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:bg-canvas"
                >
                  {messages.admin.edit}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleActive(gift)}
                  className="rounded-md bg-sika-yellow px-3 py-1.5 text-xs font-semibold text-ink hover:bg-sika-yellow/80"
                >
                  {gift.active ? messages.admin.hide : messages.admin.restore}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
