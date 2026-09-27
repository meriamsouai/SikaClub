import { Schema, model, type InferSchemaType, type HydratedDocument, Types } from "mongoose";
import type { UserRole } from "./User";

const adminAuditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorEmail: { type: String, required: true, trim: true },
    actorRole: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true, index: true },
    targetType: { type: String, required: true, trim: true, default: "" },
    targetId: { type: String, trim: true, default: "" },
    summary: { type: String, required: true, trim: true, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

adminAuditLogSchema.index({ createdAt: -1 });

export type AdminAuditLog = InferSchemaType<typeof adminAuditLogSchema>;
export type AdminAuditLogDocument = HydratedDocument<AdminAuditLog>;

export type PublicAdminAuditLog = {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

export function toPublicAdminAuditLog(entry: AdminAuditLogDocument): PublicAdminAuditLog {
  return {
    id: entry._id.toString(),
    actorId: entry.actor instanceof Types.ObjectId ? entry.actor.toString() : String(entry.actor),
    actorEmail: entry.actorEmail,
    actorRole: entry.actorRole,
    action: entry.action,
    targetType: entry.targetType ?? "",
    targetId: entry.targetId ?? "",
    summary: entry.summary,
    metadata: (entry.metadata as Record<string, unknown>) ?? {},
    createdAt: entry.createdAt,
  };
}

export const AdminAuditLogModel = model("AdminAuditLog", adminAuditLogSchema);

export type AuditActor = {
  id: string;
  email: string;
  role: UserRole | string;
};
