import { z } from "zod";

export const giftBodySchema = z.object({
  name: z.string().trim().min(2, "Le nom du cadeau est requis.").max(240),
  valueTnd: z.coerce.number().min(0, "La valeur doit être positive."),
  pointsRequired: z.coerce.number().int().min(0, "Les points doivent être positifs."),
  sortOrder: z.coerce.number().int().optional(),
  active: z
    .union([z.boolean(), z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (typeof value === "boolean") return value;
      return value === "true";
    }),
});

export type GiftBodyInput = z.infer<typeof giftBodySchema>;

export const adBodySchema = z.object({
  title: z.string().trim().min(2, "Le titre de la publicité est requis.").max(240),
  linkUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? "")
    .refine((value) => value === "" || /^https?:\/\//i.test(value), {
      message: "L’URL doit commencer par http:// ou https://.",
    }),
  sortOrder: z.coerce.number().int().optional(),
  active: z
    .union([z.boolean(), z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (typeof value === "boolean") return value;
      return value === "true";
    }),
});

export type AdBodyInput = z.infer<typeof adBodySchema>;

export const staffCreateSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est requis.").max(80),
  surname: z.string().trim().min(1, "Le nom est requis.").max(80),
  email: z.string().trim().email("Adresse e-mail invalide.").max(160),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : "N/A")),
});

export type StaffCreateInput = z.infer<typeof staffCreateSchema>;
