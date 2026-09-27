import { AdminAuditLogModel, type AuditActor } from "../models/AdminAuditLog";

export async function recordAdminAction(input: {
  actor: AuditActor;
  action: string;
  summary: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await AdminAuditLogModel.create({
      actor: input.actor.id,
      actorEmail: input.actor.email,
      actorRole: input.actor.role,
      action: input.action,
      targetType: input.targetType ?? "",
      targetId: input.targetId ?? "",
      summary: input.summary,
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    console.error("Failed to write admin audit log:", error);
  }
}
