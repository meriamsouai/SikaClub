export const DISTRIBUTORS = [
  {
    name: "COMPTOIR AFRICAIN COMAF",
    logoUrl: "/images/distributors/comaf.jpg",
  },
  {
    name: "COMPTOIR DE SUD",
    logoUrl: "/images/distributors/comptoir-sud.png",
  },
  {
    name: "COMPTOIR EQUIPEMENT GENERAL CEG",
    logoUrl: "/images/distributors/ceg.png",
  },
  {
    name: "GROUPE HAMMAMI",
    logoUrl: "/images/distributors/groupe_hammami_logo.jpg",
  },
  {
    name: "KADI",
    logoUrl: "/images/distributors/kadi.jpg",
  },
  {
    name: "SEBAC",
    logoUrl: "/images/distributors/sebac.png",
  },
  {
    name: "SOBAQUE",
    logoUrl: "/images/distributors/sobaque.png",
  },
  {
    name: "SOQUAGEN",
    logoUrl: "/images/distributors/soquagen.png",
  },
] as const;

export const DISTRIBUTOR_NAMES = DISTRIBUTORS.map((item) => item.name);

export type DistributorName = (typeof DISTRIBUTORS)[number]["name"];
