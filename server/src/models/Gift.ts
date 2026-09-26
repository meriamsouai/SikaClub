import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const giftSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 240 },
    valueTnd: { type: Number, required: true, min: 0 },
    pointsRequired: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, trim: true, default: "" },
    active: { type: Boolean, required: true, default: true },
    sortOrder: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

export type Gift = InferSchemaType<typeof giftSchema>;
export type GiftDocument = HydratedDocument<Gift>;

export type PublicGift = {
  id: string;
  name: string;
  valueTnd: number;
  pointsRequired: number;
  imageUrl: string;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export function toPublicGift(gift: GiftDocument): PublicGift {
  return {
    id: gift._id.toString(),
    name: gift.name,
    valueTnd: gift.valueTnd,
    pointsRequired: gift.pointsRequired,
    imageUrl: gift.imageUrl ?? "",
    active: gift.active,
    sortOrder: gift.sortOrder,
    createdAt: gift.createdAt,
    updatedAt: gift.updatedAt,
  };
}

export const GiftModel = model("Gift", giftSchema);
