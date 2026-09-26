import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { useLanguage } from "../context/LanguageContext";
import { getAds, getProducts } from "../lib/api";
import { formatPoints } from "../lib/format";
import { IGOLFLEX_TIERS } from "../lib/points";
import type { PublicAd, PublicProduct } from "../types";

const ROTATE_MS = 6000;
const SWIPE_THRESHOLD_PX = 40;
const API_URL = import.meta.env.VITE_API_URL ?? "";
const IGOLFLEX_IMAGE = "/images/igolflex.png";

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M15 6l-6 6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M9 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type PromoSlide =
  | {
      id: string;
      kind: "product";
      name: string;
      imageUrl: string;
      unit: string;
      tiers: Array<{ minQty: number; maxQty: number | null; points: number }>;
    }
  | {
      id: string;
      kind: "bonus";
      name: string;
      imageUrl: string;
      unit: string;
      tiers: Array<{ minQty: number; maxQty: number | null; points: number }>;
    };

function adImageSrc(imageUrl: string) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  return `${API_URL}${imageUrl}`;
}

function AdSlide({ ad, className }: { ad: PublicAd; className: string }) {
  const image = (
    <img src={adImageSrc(ad.imageUrl)} alt={ad.title} className={className} />
  );
  if (!ad.linkUrl) return image;
  return (
    <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
      {image}
    </a>
  );
}

function AdLabel({ text }: { text: string }) {
  return (
    <span className="pointer-events-none absolute left-0 top-0 z-10 rounded-br-md bg-ink/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
      {text}
    </span>
  );
}

function formatTierRange(minQty: number, maxQty: number | null, orMore: string): string {
  if (maxQty == null) return `${minQty}+ ${orMore}`;
  return `${minQty}–${maxQty}`;
}

function PromoThumb({ name, imageUrl }: { name: string; imageUrl: string }) {
  const [broken, setBroken] = useState(!imageUrl);
  if (broken) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white/80 px-2 text-center text-xs font-semibold leading-snug text-sika-red-dark">
        {name}
      </div>
    );
  }
  return (
    <img
      src={imageUrl}
      alt={name}
      className="h-full w-full object-contain p-2"
      onError={() => setBroken(true)}
    />
  );
}

function TierRows({
  tiers,
  unit,
  orMore,
  pointsShort,
  locale,
  tone = "default",
}: {
  tiers: Array<{ minQty: number; maxQty: number | null; points: number }>;
  unit: string;
  orMore: string;
  pointsShort: string;
  locale: "fr" | "en";
  tone?: "default" | "bonus";
}) {
  return (
    <ul className="space-y-1.5">
      {tiers.map((tier) => (
        <li
          key={`${tier.minQty}-${tier.points}`}
          className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[13px] leading-tight ${
            tone === "bonus" ? "bg-white/90 text-ink" : "bg-white/85 text-ink"
          }`}
        >
          <span className="truncate font-medium text-ink/80">
            {formatTierRange(tier.minQty, tier.maxQty, orMore)} {unit}
          </span>
          <span className="shrink-0 text-sm font-bold tabular-nums text-sika-red">
            {formatPoints(tier.points, locale)} {pointsShort}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PointsPromoCard({ products }: { products: PublicProduct[] }) {
  const { locale, messages } = useLanguage();
  const copy = messages.adsBanner;
  const guide = messages.pointsGuide;

  const slides = useMemo<PromoSlide[]>(() => {
    const productSlides: PromoSlide[] = products.map((product) => ({
      id: product.id,
      kind: "product",
      name: product.name,
      imageUrl: product.imageUrl,
      unit: product.unit,
      tiers: product.tiers,
    }));

    const bonusSlide: PromoSlide = {
      id: "igolflex-turbo",
      kind: "bonus",
      name: copy.pointsCardBonusTitle,
      imageUrl: IGOLFLEX_IMAGE,
      unit: guide.seauxUnit,
      tiers: IGOLFLEX_TIERS.map((tier) => ({
        minQty: tier.minQty,
        maxQty: tier.maxQty ?? null,
        points: tier.points,
      })),
    };

    return [...productSlides, bonusSlide];
  }, [products, copy.pointsCardBonusTitle, guide.seauxUnit]);

  const [index, setIndex] = useState(0);
  const [rotationKey, setRotationKey] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setIndex(0);
  }, [slides]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [slides.length, rotationKey]);

  function goTo(next: number) {
    if (slides.length <= 1) return;
    setIndex(((next % slides.length) + slides.length) % slides.length);
    setRotationKey((key) => key + 1);
  }

  function goPrev() {
    goTo(index - 1);
  }

  function goNext() {
    goTo(index + 1);
  }

  function onTouchStart(event: TouchEvent) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: TouchEvent) {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX == null || slides.length <= 1) return;
    const endX = event.changedTouches[0]?.clientX;
    if (endX == null) return;
    const delta = endX - startX;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta < 0) goNext();
    else goPrev();
  }

  const slide = slides[index] ?? slides[0];
  const canNavigate = slides.length > 1;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="flex flex-col bg-gradient-to-br from-sika-yellow via-sika-yellow-soft to-white px-3 pb-3 pt-3">
        <div className="mb-3">
          <p className="text-center text-base font-bold leading-snug text-ink sm:text-lg">
            {copy.pointsCardTitle}
          </p>
        </div>

        {slide ? (
          <div className="flex flex-col">
            <div
              className="relative mx-auto mb-3 w-full touch-pan-y overflow-hidden rounded-lg border border-white/70 bg-white/90 shadow-sm"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <div className="relative px-10 pt-2">
                <div className="mx-auto aspect-square w-[55%] max-w-[8.5rem]">
                  <PromoThumb name={slide.name} imageUrl={slide.imageUrl} />
                </div>

                {canNavigate ? (
                  <>
                    <button
                      type="button"
                      aria-label={locale === "fr" ? "Produit précédent" : "Previous product"}
                      onClick={goPrev}
                      className="absolute left-1.5 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm hover:border-sika-red hover:text-sika-red"
                    >
                      <ChevronLeftIcon />
                    </button>
                    <button
                      type="button"
                      aria-label={locale === "fr" ? "Produit suivant" : "Next product"}
                      onClick={goNext}
                      className="absolute right-1.5 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm hover:border-sika-red hover:text-sika-red"
                    >
                      <ChevronRightIcon />
                    </button>
                  </>
                ) : null}
              </div>
              <p className="whitespace-nowrap px-3 pb-2.5 pt-0.5 text-center text-xs font-semibold leading-snug text-ink">
                {slide.name}
              </p>
            </div>

            <TierRows
              tiers={slide.tiers}
              unit={slide.unit}
              orMore={guide.orMore}
              pointsShort={guide.pointsShort}
              locale={locale}
              tone={slide.kind === "bonus" ? "bonus" : "default"}
            />

            {canNavigate ? (
              <div className="mt-3 flex items-center justify-center gap-1.5">
                {slides.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={item.name}
                    onClick={() => goTo(i)}
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      i === index ? "bg-sika-red" : "bg-ink/25 hover:bg-ink/40"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AdsRail({ variant }: { variant: "desktop" | "mobile" }) {
  const { messages } = useLanguage();
  const label = messages.adsBanner.label;
  const [ads, setAds] = useState<PublicAd[]>([]);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getAds().catch(() => ({ ads: [] as PublicAd[] })), getProducts().catch(() => ({ products: [] as PublicProduct[] }))])
      .then(([adsResult, productsResult]) => {
        if (cancelled) return;
        setAds(adsResult.ads);
        setProducts(productsResult.products);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % ads.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [ads.length]);

  useEffect(() => {
    setIndex(0);
  }, [ads]);

  if (!loaded) return null;

  const current = ads[index] ?? ads[0];

  if (variant === "mobile") {
    return (
      <aside className="relative z-0 space-y-3 border-b border-line bg-transparent px-4 py-6 lg:hidden">
        <div className="mx-auto w-full max-w-5xl">
          <PointsPromoCard products={products} />
        </div>
        {current ? (
          <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-line bg-white shadow-sm">
            <div className="relative h-32 overflow-hidden sm:h-40">
              <AdSlide ad={current} className="h-full w-full object-cover" />
              <AdLabel text={label} />
            </div>
            {ads.length > 1 ? (
              <div className="flex items-center justify-center gap-2 py-2">
                {ads.map((ad, i) => (
                  <button
                    key={ad.id}
                    type="button"
                    aria-label={ad.title}
                    onClick={() => setIndex(i)}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      i === index ? "bg-sika-red" : "bg-ink/25 hover:bg-ink/40"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </aside>
    );
  }

  return (
    <aside className="relative z-0 hidden w-80 shrink-0 self-stretch px-4 py-8 xl:block 2xl:w-96">
      <div className="sticky top-8 space-y-3 pb-8 xl:top-28">
        <PointsPromoCard products={products} />
        {current ? (
          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
            <div className="relative aspect-[4/5] w-full overflow-hidden">
              <AdSlide ad={current} className="absolute inset-0 h-full w-full object-cover" />
              <AdLabel text={label} />
            </div>
            {ads.length > 1 ? (
              <div className="flex items-center justify-center gap-2 px-2 py-2.5">
                {ads.map((ad, i) => (
                  <button
                    key={ad.id}
                    type="button"
                    aria-label={ad.title}
                    onClick={() => setIndex(i)}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      i === index ? "bg-sika-red" : "bg-ink/25 hover:bg-ink/40"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
