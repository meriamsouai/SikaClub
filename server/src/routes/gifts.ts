import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { sendGiftRedeemedEmail } from "../lib/mail";
import { recordRedemptionDebit, recordRedemptionRefund } from "../lib/pointsLedger";
import { nextSequentialReference } from "../models/Counter";
import { GiftModel, toPublicGift } from "../models/Gift";
import {
  GiftRedemptionModel,
  REDEMPTION_STATUSES,
  toPublicGiftRedemption,
  type RedemptionStatus,
} from "../models/GiftRedemption";
import { UserModel } from "../models/User";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/requireAdmin";
import { AppError } from "../middleware/errorHandler";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const gifts = await GiftModel.find({ active: true }).sort({ sortOrder: 1, pointsRequired: 1 });
    res.json({ gifts: gifts.map(toPublicGift) });
  }),
);

router.get(
  "/redemptions/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const redemptions = await GiftRedemptionModel.find({ user: req.authUser!._id }).sort({ createdAt: -1 });
    res.json({ redemptions: redemptions.map((item) => toPublicGiftRedemption(item)) });
  }),
);

router.post(
  "/redeem",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.authUser!.role !== "client") {
      throw new AppError(403, "Seuls les partenaires peuvent échanger des points.", "FORBIDDEN");
    }
    const giftId = typeof req.body?.giftId === "string" ? req.body.giftId : "";
    if (!giftId) {
      throw new AppError(400, "Cadeau invalide.", "VALIDATION");
    }

    const gift = await GiftModel.findById(giftId);
    if (!gift || !gift.active) {
      throw new AppError(404, "Cadeau introuvable.", "NOT_FOUND");
    }

    const user = await UserModel.findById(req.authUser!._id);
    if (!user) {
      throw new AppError(404, "Compte introuvable.", "NOT_FOUND");
    }
    if (user.totalPoints < gift.pointsRequired) {
      throw new AppError(400, "Points insuffisants pour ce cadeau.", "INSUFFICIENT_POINTS");
    }

    const reference = await nextSequentialReference("CAD");
    const redemption = await GiftRedemptionModel.create({
      user: user._id,
      gift: gift._id,
      giftName: gift.name,
      giftValueTnd: gift.valueTnd,
      pointsSpent: gift.pointsRequired,
      reference,
      status: "en_cours",
    });

    user.totalPoints -= gift.pointsRequired;
    await user.save();

    await recordRedemptionDebit({
      userId: user._id,
      giftRedemptionId: redemption._id.toString(),
      points: gift.pointsRequired,
      label: `${reference} — ${gift.name}`,
    });

    try {
      await sendGiftRedeemedEmail({
        to: user.email,
        firstName: user.firstName,
        giftName: gift.name,
        reference,
        pointsSpent: gift.pointsRequired,
      });
    } catch (err) {
      console.error("Failed to send gift redemption email", err);
    }

    res.status(201).json({
      redemption: toPublicGiftRedemption(redemption, user),
      message: "Cadeau échangé avec succès. Vous recevrez un e-mail de confirmation.",
    });
  }),
);

router.get(
  "/admin/redemptions",
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const redemptions = await GiftRedemptionModel.find().sort({ createdAt: -1 }).limit(200);
    const userIds = redemptions.map((item) => item.user);
    const users = await UserModel.find({ _id: { $in: userIds } });
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    res.json({
      redemptions: redemptions.map((item) =>
        toPublicGiftRedemption(item, userMap.get(item.user.toString()) ?? null),
      ),
    });
  }),
);

router.patch(
  "/admin/redemptions/:id/status",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const status = req.body?.status as RedemptionStatus;
    if (!REDEMPTION_STATUSES.includes(status)) {
      throw new AppError(400, "Statut invalide.", "VALIDATION");
    }

    const redemption = await GiftRedemptionModel.findById(req.params.id);
    if (!redemption) {
      throw new AppError(404, "Échange introuvable.", "NOT_FOUND");
    }

    if (redemption.status === status) {
      const user = await UserModel.findById(redemption.user);
      res.json({
        redemption: toPublicGiftRedemption(redemption, user),
        message: "Statut inchangé.",
      });
      return;
    }

    if (redemption.status === "cancelled") {
      throw new AppError(400, "Cet échange est déjà annulé.", "VALIDATION");
    }

    if (status === "cancelled") {
      if (redemption.status !== "en_cours") {
        throw new AppError(400, "Seul un échange en cours peut être annulé.", "VALIDATION");
      }
      const user = await UserModel.findById(redemption.user);
      if (!user) {
        throw new AppError(404, "Compte introuvable.", "NOT_FOUND");
      }
      redemption.status = "cancelled";
      await redemption.save();
      user.totalPoints += redemption.pointsSpent;
      await user.save();
      await recordRedemptionRefund({
        userId: user._id,
        giftRedemptionId: redemption._id.toString(),
        points: redemption.pointsSpent,
        label: `Remboursement ${redemption.reference} — ${redemption.giftName}`,
      });
      res.json({
        redemption: toPublicGiftRedemption(redemption, user),
        message: "Échange annulé. Les points ont été remboursés.",
      });
      return;
    }

    if (status === "claimed") {
      if (redemption.status !== "en_cours") {
        throw new AppError(400, "Seul un échange en cours peut être marqué comme remis.", "VALIDATION");
      }
      redemption.status = "claimed";
      await redemption.save();
      const user = await UserModel.findById(redemption.user);
      res.json({
        redemption: toPublicGiftRedemption(redemption, user),
        message: "Cadeau marqué comme remis.",
      });
      return;
    }

    throw new AppError(400, "Transition de statut non autorisée.", "VALIDATION");
  }),
);

export default router;
