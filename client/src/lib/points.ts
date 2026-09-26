export type PointsTier = { minQty: number; maxQty: number | null; points: number };

export const IGOLFLEX_TIERS: PointsTier[] = [
  { minQty: 20, maxQty: 41, points: 1 },
  { minQty: 42, maxQty: 81, points: 2 },
  { minQty: 82, maxQty: null, points: 3 },
];

export function pointsForQuantity(tiers: PointsTier[], quantity: number): number {
  if (quantity < 1) return 0;
  const match = tiers.find((tier) => {
    const aboveMin = quantity >= tier.minQty;
    const belowMax = tier.maxQty == null || quantity <= tier.maxQty;
    return aboveMin && belowMax;
  });
  return match?.points ?? 0;
}

/** Attribute product-tier points once per product on the first line (cumulative qty). */
export function allocateProductPoints(
  lines: Array<{ productId: string; quantity: number }>,
  getTiers: (productId: string) => PointsTier[] | undefined,
): number[] {
  const totals = new Map<string, number>();
  for (const line of lines) {
    totals.set(line.productId, (totals.get(line.productId) ?? 0) + line.quantity);
  }

  const pointsByProduct = new Map<string, number>();
  for (const [productId, totalQty] of totals) {
    const tiers = getTiers(productId);
    pointsByProduct.set(productId, tiers ? pointsForQuantity(tiers, totalQty) : 0);
  }

  const seen = new Set<string>();
  return lines.map((line) => {
    if (seen.has(line.productId)) return 0;
    seen.add(line.productId);
    return pointsByProduct.get(line.productId) ?? 0;
  });
}

export function igolflexPointsForSeaux(seaux: number): number {
  return pointsForQuantity(IGOLFLEX_TIERS, seaux);
}
