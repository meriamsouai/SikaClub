import { PointEntryModel } from "../models/PointEntry";
import type { UserDocument } from "../models/User";

const WELCOME_POINTS = 1;
const WELCOME_LABEL = "Bonus de bienvenue";

export async function ensureWelcomeBonus(user: UserDocument) {
  const existing = await PointEntryModel.findOne({ user: user._id, type: "welcome" });
  if (existing) return existing;

  if (user.totalPoints < WELCOME_POINTS) {
    user.totalPoints = WELCOME_POINTS;
    await user.save();
  }

  return PointEntryModel.create({
    user: user._id,
    points: WELCOME_POINTS,
    type: "welcome",
    label: WELCOME_LABEL,
    createdAt: user.createdAt,
    updatedAt: user.createdAt,
  });
}

export async function recordInvoicePoints(input: {
  userId: UserDocument["_id"];
  invoiceId: string;
  points: number;
  label: string;
}) {
  if (input.points <= 0) return null;
  const existing = await PointEntryModel.findOne({ invoice: input.invoiceId, type: "invoice" });
  if (existing) return null;
  return PointEntryModel.create({
    user: input.userId,
    points: input.points,
    type: "invoice",
    invoice: input.invoiceId,
    label: input.label,
  });
}

export async function recordRedemptionDebit(input: {
  userId: UserDocument["_id"];
  giftRedemptionId: string;
  points: number;
  label: string;
}) {
  if (input.points <= 0) return null;
  const existing = await PointEntryModel.findOne({
    giftRedemption: input.giftRedemptionId,
    type: "redemption",
  });
  if (existing) return existing;
  return PointEntryModel.create({
    user: input.userId,
    points: -Math.abs(input.points),
    type: "redemption",
    giftRedemption: input.giftRedemptionId,
    label: input.label,
  });
}

export async function recordRedemptionRefund(input: {
  userId: UserDocument["_id"];
  giftRedemptionId: string;
  points: number;
  label: string;
}) {
  if (input.points <= 0) return null;
  const existing = await PointEntryModel.findOne({
    giftRedemption: input.giftRedemptionId,
    type: "redemption_refund",
  });
  if (existing) return existing;
  return PointEntryModel.create({
    user: input.userId,
    points: Math.abs(input.points),
    type: "redemption_refund",
    giftRedemption: input.giftRedemptionId,
    label: input.label,
  });
}

export async function lifetimePointsForUser(userId: UserDocument["_id"]): Promise<number> {
  const rows = await PointEntryModel.aggregate<{ total: number }>([
    { $match: { user: userId, type: { $in: ["welcome", "invoice"] } } },
    { $group: { _id: null, total: { $sum: "$points" } } },
  ]);
  return rows[0]?.total ?? 0;
}

export async function lifetimePointsByUserIds(
  userIds: Array<UserDocument["_id"]>,
): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const rows = await PointEntryModel.aggregate<{ _id: UserDocument["_id"]; total: number }>([
    { $match: { user: { $in: userIds }, type: { $in: ["welcome", "invoice"] } } },
    { $group: { _id: "$user", total: { $sum: "$points" } } },
  ]);
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row._id.toString(), row.total);
  }
  return map;
}

export { WELCOME_POINTS, WELCOME_LABEL };
