import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "../components/Alert";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { ApiError, getActiveGifts, redeemGift } from "../lib/api";
import { formatPoints, formatTnd } from "../lib/format";
import { translateError } from "../i18n/translations";
import type { PublicGift } from "../types";

export function GiftsPage() {
  const { user, refreshUser } = useAuth();
  const { locale, messages } = useLanguage();
  const [gifts, setGifts] = useState<PublicGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const points = user?.totalPoints ?? 0;
  const copy = messages.gifts;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const giftsResult = await getActiveGifts();
      setGifts(giftsResult.gifts);
      await refreshUser();
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

  const sortedGifts = useMemo(() => {
    return [...gifts].sort((a, b) => a.pointsRequired - b.pointsRequired || a.valueTnd - b.valueTnd);
  }, [gifts]);

  async function handleRedeem(giftId: string) {
    setBusyId(giftId);
    setError(null);
    setMessage(null);
    try {
      const result = await redeemGift(giftId);
      setMessage(copy.redeemSuccess.replace("{ref}", result.redemption.reference));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : copy.redeemFailed);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{copy.description}</p>
        <p className="mt-4 text-base font-semibold text-ink">
          {copy.yourPoints}:{" "}
          <span className="text-2xl font-bold tabular-nums text-sika-red">{formatPoints(points, locale)}</span>
        </p>
      </div>

      {error ? <Alert>{error}</Alert> : null}
      {message ? <Alert tone="warning">{message}</Alert> : null}
      {loading ? <p className="text-sm text-muted">{messages.nav.loading}</p> : null}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {sortedGifts.map((gift) => {
          const affordable = points >= gift.pointsRequired;
          const pointsLeft = Math.max(gift.pointsRequired - points, 0);
          return (
            <article
              key={gift.id}
              className={`group overflow-hidden rounded-lg border bg-white shadow-sm transition-colors ${
                affordable ? "border-sika-yellow" : "border-line"
              }`}
            >
              <div className="aspect-[4/3] bg-sika-yellow-soft p-4">
                <div
                  className={`h-full w-full transition-[filter] duration-200 ${
                    affordable ? "" : "grayscale group-hover:grayscale-0"
                  }`}
                >
                  <img
                    src={gift.imageUrl || "/images/gifts-temp.jpg"}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
              <div className="space-y-3 px-5 py-4">
                <h2 className="text-sm font-semibold leading-5 text-ink">{gift.name}</h2>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">{copy.value}</dt>
                    <dd className="mt-1 font-semibold text-ink">{formatTnd(gift.valueTnd, locale)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">{copy.pointsNeeded}</dt>
                    <dd className="mt-1 font-bold tabular-nums text-sika-red">
                      {formatPoints(gift.pointsRequired, locale)}
                    </dd>
                  </div>
                </dl>
                <p className={`text-xs font-medium ${affordable ? "text-ink" : "text-muted"}`}>
                  {affordable
                    ? copy.available
                    : copy.pointsLeftNeeded.replace("{count}", formatPoints(pointsLeft, locale))}
                </p>
                <button
                  type="button"
                  disabled={!affordable || busyId === gift.id}
                  onClick={() => void handleRedeem(gift.id)}
                  className="inline-flex h-10 w-full items-center justify-center rounded-md bg-sika-red px-3 text-sm font-semibold text-white hover:bg-sika-red-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyId === gift.id ? copy.redeeming : copy.redeem}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
