import { z } from "zod";
import { DISTRIBUTORS } from "../data/distributors";

const distributorSchema = z
  .string()
  .trim()
  .refine((value): value is (typeof DISTRIBUTORS)[number] => (DISTRIBUTORS as readonly string[]).includes(value), {
    message: "Veuillez choisir un distributeur.",
  });

export const invoiceLineSchema = z.object({
  productId: z.string().trim().min(1),
  distributor: distributorSchema,
  quantity: z.coerce.number().int().min(1, "La quantité doit être au moins 1."),
  igolflexSeaux: z.coerce.number().int().min(0).optional().default(0),
});

export const createInvoiceSchema = z.object({
  lines: z
    .string()
    .transform((value, ctx) => {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Lignes de facture invalides." });
        return z.NEVER;
      }
    })
    .pipe(z.array(invoiceLineSchema).min(1, "Ajoutez au moins un produit.")),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
