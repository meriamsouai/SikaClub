import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const adSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 240 },
    /** @deprecated Prefer imageUrlDesktop; kept for existing ads */
    imageUrl: { type: String, trim: true, default: "" },
    imageUrlDesktop: { type: String, trim: true, default: "" },
    imageUrlMobile: { type: String, trim: true, default: "" },
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
  imageUrlDesktop: string;
  imageUrlMobile: string;
  linkUrl: string;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

function resolveDesktopUrl(ad: AdDocument): string {
  return ad.imageUrlDesktop || ad.imageUrl || "";
}

function resolveMobileUrl(ad: AdDocument): string {
  return ad.imageUrlMobile || ad.imageUrlDesktop || ad.imageUrl || "";
}

export function toPublicAd(ad: AdDocument): PublicAd {
  const imageUrlDesktop = resolveDesktopUrl(ad);
  const imageUrlMobile = resolveMobileUrl(ad);
  return {
    id: ad._id.toString(),
    title: ad.title,
    imageUrl: imageUrlDesktop,
    imageUrlDesktop,
    imageUrlMobile,
    linkUrl: ad.linkUrl ?? "",
    active: ad.active,
    sortOrder: ad.sortOrder,
    createdAt: ad.createdAt,
    updatedAt: ad.updatedAt,
  };
}

export const AdModel = model("Ad", adSchema);
