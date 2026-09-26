import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const INVOICE_STATUSES = ["pending", "approved", "rejected"] as const;

const invoiceLineSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true, trim: true },
    productReference: { type: String, required: true, trim: true },
    distributor: { type: String, required: true, trim: true, maxlength: 120 },
    quantity: { type: Number, required: true, min: 1 },
    points: { type: Number, required: true, min: 0, default: 0 },
    igolflexSeaux: { type: Number, required: true, min: 0, default: 0 },
    igolflexPoints: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const invoiceSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    distributor: { type: String, required: true, trim: true, maxlength: 120 },
    products: { type: [invoiceLineSchema], required: true, default: [] },
    fileUrl: { type: String, required: true, trim: true },
    fileUrls: { type: [String], required: true, default: [] },
    status: { type: String, enum: INVOICE_STATUSES, default: "pending", required: true },
    estimatedPoints: { type: Number, default: 0, min: 0, required: true },
    pointsAwarded: { type: Number, default: 0, min: 0, required: true },
    reference: { type: String, trim: true, default: "", index: true },
    adminNote: { type: String, trim: true, default: "" },
    clientProblemReport: { type: String, trim: true, default: "", maxlength: 1000 },
  },
  { timestamps: true },
);

invoiceSchema.index({ user: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, createdAt: -1 });

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type Invoice = InferSchemaType<typeof invoiceSchema>;
export type InvoiceDocument = HydratedDocument<Invoice>;

export type PublicInvoice = {
  id: string;
  userId: string;
  userName?: string;
  companyName?: string;
  distributor: string;
    products: Array<{
      productId: string;
      productName: string;
      productReference: string;
      distributor: string;
      quantity: number;
      points: number;
      igolflexSeaux: number;
      igolflexPoints: number;
    }>;
  fileUrl: string;
  fileUrls: string[];
  status: InvoiceStatus;
  estimatedPoints: number;
  pointsAwarded: number;
  reference: string;
  adminNote: string;
  clientProblemReport: string;
  createdAt: Date;
  updatedAt: Date;
};

export function toPublicInvoice(
  invoice: InvoiceDocument,
  user?: { firstName: string; surname: string; companyName: string } | null,
): PublicInvoice {
  const fileUrls =
    Array.isArray(invoice.fileUrls) && invoice.fileUrls.length > 0
      ? invoice.fileUrls
      : invoice.fileUrl
        ? [invoice.fileUrl]
        : [];

  return {
    id: invoice._id.toString(),
    userId: invoice.user.toString(),
    userName: user ? `${user.firstName} ${user.surname}` : undefined,
    companyName: user?.companyName,
    distributor: invoice.distributor,
    products: invoice.products.map((line) => ({
      productId: line.product.toString(),
      productName: line.productName,
      productReference: line.productReference,
      distributor: line.distributor || invoice.distributor,
      quantity: line.quantity,
      points: line.points,
      igolflexSeaux: line.igolflexSeaux ?? 0,
      igolflexPoints: line.igolflexPoints ?? 0,
    })),
    fileUrl: fileUrls[0] ?? invoice.fileUrl,
    fileUrls,
    status: invoice.status,
    estimatedPoints: invoice.estimatedPoints,
    pointsAwarded: invoice.pointsAwarded,
    reference:
      invoice.reference ||
      `FAC-LEGACY-${invoice._id.toString().slice(-6).toUpperCase()}`,
    adminNote: invoice.adminNote ?? "",
    clientProblemReport: invoice.clientProblemReport ?? "",
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}

export const InvoiceModel = model("Invoice", invoiceSchema);
