import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";
import { allocateProductPoints, igolflexPointsForSeaux, pointsForQuantity } from "../lib/points";

const productTierSchema = new Schema(
  {
    minQty: { type: Number, required: true, min: 1 },
    maxQty: { type: Number, default: null },
    points: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true, trim: true, maxlength: 64 },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    imageUrl: { type: String, trim: true, default: "" },
    unit: { type: String, required: true, trim: true, maxlength: 32, default: "rouleaux" },
    tiers: { type: [productTierSchema], required: true, default: [] },
  },
  { timestamps: true },
);

export type Product = InferSchemaType<typeof productSchema>;
export type ProductDocument = HydratedDocument<Product>;

export type PublicProduct = {
  id: string;
  reference: string;
  name: string;
  imageUrl: string;
  unit: string;
  tiers: Array<{ minQty: number; maxQty: number | null; points: number }>;
};

export function toPublicProduct(product: ProductDocument): PublicProduct {
  return {
    id: product._id.toString(),
    reference: product.reference,
    name: product.name,
    imageUrl: product.imageUrl ?? "",
    unit: product.unit,
    tiers: product.tiers.map((tier) => ({
      minQty: tier.minQty,
      maxQty: tier.maxQty ?? null,
      points: tier.points,
    })),
  };
}

export { allocateProductPoints, igolflexPointsForSeaux, pointsForQuantity };

export const ProductModel = model("Product", productSchema);
