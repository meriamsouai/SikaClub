import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Alert } from "../components/Alert";
import { ImageUploadField } from "../components/ImageUploadField";
import { TextField } from "../components/TextField";
import { useLanguage } from "../context/LanguageContext";
import {
  ApiError,
  createAd,
  getAdminAds,
  hideAd,
  restoreAd,
  updateAd,
} from "../lib/api";
import { translateError } from "../i18n/translations";
import type { PublicAd } from "../types";

const emptyForm = {
  title: "",
  linkUrl: "",
};

const API_URL = import.meta.env.VITE_API_URL ?? "";

function adImageSrc(imageUrl: string) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  return `${API_URL}${imageUrl}`;
}

export function AdminAdsPage() {
  const { messages } = useLanguage();
  const copy = messages.admin;
  const [ads, setAds] = useState<PublicAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDesktopUrl, setEditingDesktopUrl] = useState("");
  const [editingMobileUrl, setEditingMobileUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminAds();
      setAds(result.ads);
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [copy.loadFailed, messages]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(ad: PublicAd) {
    setEditingId(ad.id);
    setForm({
      title: ad.title,
      linkUrl: ad.linkUrl,
    });
    setDesktopFile(null);
    setMobileFile(null);
    setEditingDesktopUrl(adImageSrc(ad.imageUrlDesktop || ad.imageUrl));
    setEditingMobileUrl(adImageSrc(ad.imageUrlMobile || ad.imageUrlDesktop || ad.imageUrl));
    setMessage(null);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setDesktopFile(null);
    setMobileFile(null);
    setEditingDesktopUrl("");
    setEditingMobileUrl("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const body = new FormData();
      body.set("title", form.title.trim());
      body.set("linkUrl", form.linkUrl.trim());
      if (desktopFile) body.set("imageDesktop", desktopFile);
      if (mobileFile) body.set("imageMobile", mobileFile);

      if (editingId) {
        await updateAd(editingId, body);
        setMessage(copy.adUpdated);
      } else {
        if (!desktopFile || !mobileFile) {
          setError(copy.adImagesRequired);
          setSubmitting(false);
          return;
        }
        await createAd(body);
        setMessage(copy.adCreated);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : copy.actionFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(ad: PublicAd) {
    setError(null);
    setMessage(null);
    try {
      if (ad.active) {
        await hideAd(ad.id);
        setMessage(copy.adHidden);
      } else {
        await restoreAd(ad.id);
        setMessage(copy.adRestored);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : copy.actionFailed);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{copy.ads}</h1>
        <p className="mt-2 text-sm text-muted">{copy.adsDescription}</p>
      </div>

      {error ? <Alert>{error}</Alert> : null}
      {message ? <Alert tone="warning">{message}</Alert> : null}

      <form className="space-y-4 rounded-lg border border-line bg-white p-5" onSubmit={handleSubmit}>
        <h2 className="text-lg font-semibold text-ink">{editingId ? copy.editAd : copy.addAd}</h2>
        <TextField
          label={copy.adTitle}
          name="title"
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          required
        />
        <TextField
          label={copy.adLink}
          name="linkUrl"
          type="url"
          placeholder="https://"
          value={form.linkUrl}
          onChange={(event) => setForm((current) => ({ ...current, linkUrl: event.target.value }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUploadField
            label={copy.adImageDesktop}
            hint={copy.adImageDesktopHint}
            chooseLabel={copy.imageChoose}
            clearLabel={copy.imageClear}
            required={!editingId}
            file={desktopFile}
            onFileChange={setDesktopFile}
            existingUrl={editingDesktopUrl}
            previewAspectClassName="aspect-[4/5]"
          />
          <ImageUploadField
            label={copy.adImageMobile}
            hint={copy.adImageMobileHint}
            chooseLabel={copy.imageChoose}
            clearLabel={copy.imageClear}
            required={!editingId}
            file={mobileFile}
            onFileChange={setMobileFile}
            existingUrl={editingMobileUrl}
            previewAspectClassName="aspect-[3/1]"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 items-center rounded-md bg-sika-red px-4 text-sm font-semibold text-white hover:bg-sika-red-dark disabled:opacity-60"
          >
            {submitting ? copy.saving : editingId ? copy.saveAd : copy.createAd}
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
      ) : ads.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          {copy.noAds}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ads.map((ad) => (
            <article
              key={ad.id}
              className={`rounded-lg border bg-white p-4 ${ad.active ? "border-line" : "border-dashed border-muted opacity-80"}`}
            >
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{copy.adImageDesktop}</p>
                  <div className="aspect-[4/5] overflow-hidden rounded-md bg-sika-yellow-soft">
                    {ad.imageUrlDesktop || ad.imageUrl ? (
                      <img
                        src={adImageSrc(ad.imageUrlDesktop || ad.imageUrl)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted">{copy.noImage}</div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{copy.adImageMobile}</p>
                  <div className="aspect-[3/1] overflow-hidden rounded-md bg-sika-yellow-soft">
                    {ad.imageUrlMobile || ad.imageUrlDesktop || ad.imageUrl ? (
                      <img
                        src={adImageSrc(ad.imageUrlMobile || ad.imageUrlDesktop || ad.imageUrl)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted">{copy.noImage}</div>
                    )}
                  </div>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-ink">{ad.title}</h3>
              <p className="mt-1 truncate text-xs text-muted">{ad.linkUrl || copy.adNoLink}</p>
              <p className="mt-2 text-xs font-medium text-ink">{ad.active ? copy.visible : copy.hidden}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(ad)}
                  className="inline-flex h-9 items-center rounded-md border border-line px-3 text-xs font-semibold text-ink hover:bg-canvas"
                >
                  {copy.edit}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleActive(ad)}
                  className="inline-flex h-9 items-center rounded-md border border-line px-3 text-xs font-semibold text-ink hover:bg-canvas"
                >
                  {ad.active ? copy.hide : copy.restore}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
