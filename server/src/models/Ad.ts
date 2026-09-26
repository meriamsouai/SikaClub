import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const adSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 240 },
    imageUrl: { type: String, required: true, trim: true },
    linkUrl: { type: String, trim: true, default: "" },
    active: { type: Boolean, required: true, default: true },
    sortOrder: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

export type Ad = InferSchemaType<typeof adSchema>;
export type AdDocument = HydratedDocument<Ad>;

export type PublicAd = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export function toPublicAd(ad: AdDocument): PublicAd {
  return {
    id: ad._id.toString(),
    title: ad.title,
    imageUrl: ad.imageUrl,
    linkUrl: ad.linkUrl ?? "",
    active: ad.active,
    sortOrder: ad.sortOrder,
    createdAt: ad.createdAt,
    updatedAt: ad.updatedAt,
  };
}

export const AdModel = model("Ad", adSchema);
