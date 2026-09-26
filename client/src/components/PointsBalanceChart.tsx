import { useMemo, useState } from "react";
import { formatPoints } from "../lib/format";
import type { PublicPointEntry } from "../types";

type BalancePoint = {
  id: string;
  date: Date;
  balance: number;
  delta: number;
  label: string;
};

type PointsBalanceChartProps = {
  entries: PublicPointEntry[];
  locale: "fr" | "en";
  title: string;
  peakLabel: string;
  emptyLabel: string;
  hoverHint: string;
};

function buildBalanceSeries(entries: PublicPointEntry[]): BalancePoint[] {
  const chronological = [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  let balance = 0;
  return chronological.map((entry) => {
    balance += entry.points;
    return {
      id: entry.id,
      date: new Date(entry.createdAt),
      balance,
      delta: entry.points,
      label: entry.label,
    };
  });
}

export function PointsBalanceChart({
  entries,
  locale,
  title,
  peakLabel,
  emptyLabel,
  hoverHint,
}: PointsBalanceChartProps) {
  const series = useMemo(() => buildBalanceSeries(entries), [entries]);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const peak = useMemo(() => {
    if (series.length === 0) return null;
    return series.reduce((best, point) => (point.balance > best.balance ? point : best), series[0]);
  }, [series]);

  const width = 420;
  const height = 160;
  const pad = { top: 18, right: 16, bottom: 28, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const maxBalance = Math.max(peak?.balance ?? 0, 1);
  const minBalance = Math.min(0, ...series.map((point) => point.balance));
  const range = Math.max(maxBalance - minBalance, 1);

  function xAt(index: number) {
    if (series.length <= 1) return pad.left + innerW / 2;
    return pad.left + (index / (series.length - 1)) * innerW;
  }

  function yAt(balance: number) {
    return pad.top + ((maxBalance - balance) / range) * innerH;
  }

  const linePath =
    series.length === 0
      ? ""
      : series
          .map((point, index) => `${index === 0 ? "M" : "L"} ${xAt(index)} ${yAt(point.balance)}`)
          .join(" ");

  const areaPath =
    series.length === 0
      ? ""
      : `${linePath} L ${xAt(series.length - 1)} ${pad.top + innerH} L ${xAt(0)} ${pad.top + innerH} Z`;

  const hoverPoint = hoverId ? series.find((point) => point.id === hoverId) : null;
  const dateLocale = locale === "fr" ? "fr-FR" : "en-GB";

  if (series.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-white px-5 py-6">
        <p className="text-sm font-medium text-muted">{title}</p>
        <p className="mt-3 text-sm text-muted">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-white px-4 py-4 sm:px-5">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <p className="text-sm font-medium text-muted">{title}</p>
        {peak ? (
          <p className="text-xs font-semibold text-ink">
            {peakLabel}:{" "}
            <span className="tabular-nums text-sika-red">{formatPoints(peak.balance, locale)}</span>
            <span className="ml-1 font-medium text-muted">
              · {peak.date.toLocaleDateString(dateLocale)}
            </span>
          </p>
        ) : null}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full"
        role="img"
        aria-label={title}
        onMouseLeave={() => setHoverId(null)}
      >
        <defs>
          <linearGradient id="pointsBalanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E30613" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#E30613" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((ratio) => {
          const value = minBalance + range * (1 - ratio);
          const y = pad.top + ratio * innerH;
          return (
            <g key={ratio}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                stroke="#E5E5E5"
                strokeWidth="1"
              />
              <text x={pad.left - 8} y={y + 3} textAnchor="end" fill="#737373" fontSize="9">
                {Math.round(value)}
              </text>
            </g>
          );
        })}

        {areaPath ? <path d={areaPath} fill="url(#pointsBalanceFill)" /> : null}
        {linePath ? (
          <path d={linePath} fill="none" stroke="#E30613" strokeWidth="2.25" strokeLinejoin="round" />
        ) : null}

        {series.map((point, index) => {
          const cx = xAt(index);
          const cy = yAt(point.balance);
          const isPeak = peak?.id === point.id;
          const isHover = hoverId === point.id;
          return (
            <g key={point.id}>
              <circle
                cx={cx}
                cy={cy}
                r={isPeak || isHover ? 5 : 3.5}
                fill={point.delta < 0 ? "#111111" : "#E30613"}
                stroke="#ffffff"
                strokeWidth="1.5"
                className="cursor-pointer"
                onMouseEnter={() => setHoverId(point.id)}
              />
              {isPeak ? (
                <text x={cx} y={cy - 10} textAnchor="middle" fill="#E30613" fontSize="9" fontWeight="700">
                  {peakLabel}
                </text>
              ) : null}
            </g>
          );
        })}

        {series.length > 0 ? (
          <>
            <text x={pad.left} y={height - 8} textAnchor="start" fill="#737373" fontSize="9">
              {series[0].date.toLocaleDateString(dateLocale)}
            </text>
            <text x={width - pad.right} y={height - 8} textAnchor="end" fill="#737373" fontSize="9">
              {series[series.length - 1].date.toLocaleDateString(dateLocale)}
            </text>
          </>
        ) : null}
      </svg>

      {hoverPoint ? (
        <p className="mt-1 text-xs text-muted">
          <span className="font-semibold text-ink">
            {hoverPoint.date.toLocaleDateString(dateLocale)}
          </span>
          {" · "}
          {hoverPoint.label}
          {" · "}
          <span className={hoverPoint.delta < 0 ? "font-semibold text-ink" : "font-semibold text-sika-red"}>
            {hoverPoint.delta > 0 ? "+" : ""}
            {formatPoints(hoverPoint.delta, locale)}
          </span>
          {" → "}
          <span className="font-semibold tabular-nums text-ink">
            {formatPoints(hoverPoint.balance, locale)}
          </span>
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted">{hoverHint}</p>
      )}
    </div>
  );
}
