import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const REDEMPTION_STATUSES = ["en_cours", "claimed", "cancelled"] as const;

const giftRedemptionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    gift: { type: Schema.Types.ObjectId, ref: "Gift", required: true },
    giftName: { type: String, required: true, trim: true },
    giftValueTnd: { type: Number, required: true, min: 0 },
    pointsSpent: { type: Number, required: true, min: 0 },
    reference: { type: String, required: true, unique: true, trim: true, index: true },
    status: { type: String, enum: REDEMPTION_STATUSES, required: true, default: "en_cours" },
  },
  { timestamps: true },
);

giftRedemptionSchema.index({ user: 1, createdAt: -1 });
giftRedemptionSchema.index({ status: 1, createdAt: -1 });

export type RedemptionStatus = (typeof REDEMPTION_STATUSES)[number];
export type GiftRedemption = InferSchemaType<typeof giftRedemptionSchema>;
export type GiftRedemptionDocument = HydratedDocument<GiftRedemption>;

export type PublicGiftRedemption = {
  id: string;
  userId: string;
  userName?: string;
  companyName?: string;
  giftId: string;
  giftName: string;
  giftValueTnd: number;
  pointsSpent: number;
  reference: string;
  status: RedemptionStatus;
  createdAt: Date;
  updatedAt: Date;
};

export function toPublicGiftRedemption(
  redemption: GiftRedemptionDocument,
  user?: { firstName: string; surname: string; companyName: string } | null,
): PublicGiftRedemption {
  return {
    id: redemption._id.toString(),
    userId: redemption.user.toString(),
    userName: user ? `${user.firstName} ${user.surname}` : undefined,
    companyName: user?.companyName,
    giftId: redemption.gift.toString(),
    giftName: redemption.giftName,
    giftValueTnd: redemption.giftValueTnd,
    pointsSpent: redemption.pointsSpent,
    reference: redemption.reference,
    status: redemption.status,
    createdAt: redemption.createdAt,
    updatedAt: redemption.updatedAt,
  };
}

export const GiftRedemptionModel = model("GiftRedemption", giftRedemptionSchema);
