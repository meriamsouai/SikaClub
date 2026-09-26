export function formatPoints(value: number, locale: "fr" | "en" = "fr"): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB").format(value);
}

export function formatTnd(value: number, locale: "fr" | "en" = "fr"): string {
  return `${new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB").format(value)} TND`;
}
