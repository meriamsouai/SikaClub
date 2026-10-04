export const DISTRIBUTORS = [
  "COMPTOIR AFRICAIN COMAF",
  "COMPTOIR DE SUD",
  "COMPTOIR EQUIPEMENT GENERAL CEG",
  "GROUPE HAMMAMI",
  "KADI",
  "SEBAC",
  "SOBAQUE",
  "SOQUAGEN",
  "ISOTECH",
  "STETS",
] as const;

export type Distributor = (typeof DISTRIBUTORS)[number];
