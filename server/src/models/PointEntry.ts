import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const POINT_ENTRY_TYPES = ["welcome", "invoice", "redemption", "redemption_refund"] as const;

const pointEntrySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    points: { type: Number, required: true },
    type: { type: String, enum: POINT_ENTRY_TYPES, required: true },
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice" },
    giftRedemption: { type: Schema.Types.ObjectId, ref: "GiftRedemption" },
    label: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { timestamps: true },
);

pointEntrySchema.index({ user: 1, type: 1 });
pointEntrySchema.index({ user: 1, createdAt: -1 });
pointEntrySchema.index({ giftRedemption: 1, type: 1 });

export type PointEntryType = (typeof POINT_ENTRY_TYPES)[number];
export type PointEntry = InferSchemaType<typeof pointEntrySchema>;
export type PointEntryDocument = HydratedDocument<PointEntry>;

export type PublicPointEntry = {
  id: string;
  points: number;
  type: PointEntryType;
  label: string;
  invoiceId?: string;
  giftRedemptionId?: string;
  createdAt: Date;
};

export function toPublicPointEntry(entry: PointEntryDocument): PublicPointEntry {
  return {
    id: entry._id.toString(),
    points: entry.points,
    type: entry.type,
    label: entry.label,
    invoiceId: entry.invoice ? entry.invoice.toString() : undefined,
    giftRedemptionId: entry.giftRedemption ? entry.giftRedemption.toString() : undefined,
    createdAt: entry.createdAt,
  };
}

export const PointEntryModel = model("PointEntry", pointEntrySchema);
