import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { ensureWelcomeBonus } from "../lib/pointsLedger";
import { generateTemporaryPassword } from "../lib/generatePassword";
import { sendAccountApprovedEmail } from "../lib/mail";
import { hashPassword } from "../lib/password";
import { giftImagePublicPath, giftImageUpload } from "../lib/upload";
import { adImagePublicPath, adImageUpload } from "../lib/adUpload";
import { GiftModel, toPublicGift } from "../models/Gift";
import { AdModel, toPublicAd } from "../models/Ad";
import { toPublicUser, UserModel } from "../models/User";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/requireAdmin";
import { AppError } from "../middleware/errorHandler";
import { adBodySchema, giftBodySchema } from "../validation/admin";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get(
  "/accounts/pending",
  asyncHandler(async (_req, res) => {
    const users = await UserModel.find({ role: "client", status: "pending" }).sort({ createdAt: 1 });
    res.json({ users: users.map(toPublicUser) });
  }),
);

router.post(
  "/accounts/:id/approve",
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.params.id).select("+password");
    if (!user || user.role !== "client") {
      throw new AppError(404, "Compte introuvable.", "NOT_FOUND");
    }
    if (user.status !== "pending") {
      throw new AppError(400, "Ce compte n’est pas en attente.", "VALIDATION");
    }

    const temporaryPassword = generateTemporaryPassword();
    const previousPassword = user.password;
    const previousStatus = user.status;

    user.password = await hashPassword(temporaryPassword);
    user.status = "approved";
    await user.save();
    await ensureWelcomeBonus(user);

    try {
      await sendAccountApprovedEmail({
        to: user.email,
        firstName: user.firstName,
        password: temporaryPassword,
      });
    } catch (error) {
      user.password = previousPassword;
      user.status = previousStatus;
      await user.save();
      console.error("SMTP approve failed:", error);
      throw new AppError(
        502,
        "Impossible d’envoyer l’e-mail d’approbation. Vérifiez la configuration SMTP.",
        "SMTP_FAILED",
      );
    }

    res.json({
      user: toPublicUser(user),
      message: "Compte approuvé. Un e-mail avec le mot de passe a été envoyé.",
    });
  }),
);

router.post(
  "/accounts/:id/reject",
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.params.id);
    if (!user || user.role !== "client") {
      throw new AppError(404, "Compte introuvable.", "NOT_FOUND");
    }
    if (user.status !== "pending") {
      throw new AppError(400, "Ce compte n’est pas en attente.", "VALIDATION");
    }

    user.status = "rejected";
    await user.save();
    res.json({
      user: toPublicUser(user),
      message: "Compte refusé.",
    });
  }),
);

router.get(
  "/clients",
  asyncHandler(async (_req, res) => {
    const users = await UserModel.find({ role: "client" }).sort({ createdAt: -1 });
    res.json({ users: users.map(toPublicUser) });
  }),
);

router.get(
  "/leaderboard",
  asyncHandler(async (_req, res) => {
    const users = await UserModel.find({ role: "client", status: "approved" })
      .sort({ totalPoints: -1, surname: 1 })
      .limit(50);
    res.json({
      users: users.map((user, index) => ({
        ...toPublicUser(user),
        rank: index + 1,
      })),
    });
  }),
);

router.get(
  "/gifts",
  asyncHandler(async (_req, res) => {
    const gifts = await GiftModel.find().sort({ sortOrder: 1, pointsRequired: 1 });
    res.json({ gifts: gifts.map(toPublicGift) });
  }),
);

router.post(
  "/gifts",
  giftImageUpload.single("image"),
  asyncHandler(async (req, res) => {
    const parsed = giftBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "Certains champs sont invalides.", "VALIDATION");
    }

    const count = await GiftModel.countDocuments();
    const gift = await GiftModel.create({
      name: parsed.data.name,
      valueTnd: parsed.data.valueTnd,
      pointsRequired: parsed.data.pointsRequired,
      sortOrder: parsed.data.sortOrder ?? count,
      active: parsed.data.active ?? true,
      imageUrl: req.file ? giftImagePublicPath(req.file.filename) : "",
    });

    res.status(201).json({ gift: toPublicGift(gift) });
  }),
);

router.patch(
  "/gifts/:id",
  giftImageUpload.single("image"),
  asyncHandler(async (req, res) => {
    const gift = await GiftModel.findById(req.params.id);
    if (!gift) {
      throw new AppError(404, "Cadeau introuvable.", "NOT_FOUND");
    }

    const parsed = giftBodySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "Certains champs sont invalides.", "VALIDATION");
    }

    if (parsed.data.name !== undefined) gift.name = parsed.data.name;
    if (parsed.data.valueTnd !== undefined) gift.valueTnd = parsed.data.valueTnd;
    if (parsed.data.pointsRequired !== undefined) gift.pointsRequired = parsed.data.pointsRequired;
    if (parsed.data.sortOrder !== undefined) gift.sortOrder = parsed.data.sortOrder;
    if (parsed.data.active !== undefined) gift.active = parsed.data.active;
    if (req.file) gift.imageUrl = giftImagePublicPath(req.file.filename);

    await gift.save();
    res.json({ gift: toPublicGift(gift) });
  }),
);

router.post(
  "/gifts/:id/hide",
  asyncHandler(async (req, res) => {
    const gift = await GiftModel.findById(req.params.id);
    if (!gift) {
      throw new AppError(404, "Cadeau introuvable.", "NOT_FOUND");
    }
    gift.active = false;
    await gift.save();
    res.json({ gift: toPublicGift(gift) });
  }),
);

router.post(
  "/gifts/:id/restore",
  asyncHandler(async (req, res) => {
    const gift = await GiftModel.findById(req.params.id);
    if (!gift) {
      throw new AppError(404, "Cadeau introuvable.", "NOT_FOUND");
    }
    gift.active = true;
    await gift.save();
    res.json({ gift: toPublicGift(gift) });
  }),
);

router.get(
  "/ads",
  asyncHandler(async (_req, res) => {
    const ads = await AdModel.find().sort({ sortOrder: 1, createdAt: 1 });
    res.json({ ads: ads.map(toPublicAd) });
  }),
);

router.post(
  "/ads",
  adImageUpload.single("image"),
  asyncHandler(async (req, res) => {
    const parsed = adBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "Certains champs sont invalides.", "VALIDATION");
    }
    if (!req.file) {
      throw new AppError(400, "Une image est requise.", "VALIDATION");
    }

    const count = await AdModel.countDocuments();
    const ad = await AdModel.create({
      title: parsed.data.title,
      linkUrl: parsed.data.linkUrl ?? "",
      sortOrder: parsed.data.sortOrder ?? count,
      active: parsed.data.active ?? true,
      imageUrl: adImagePublicPath(req.file.filename),
    });

    res.status(201).json({ ad: toPublicAd(ad) });
  }),
);

router.patch(
  "/ads/:id",
  adImageUpload.single("image"),
  asyncHandler(async (req, res) => {
    const ad = await AdModel.findById(req.params.id);
    if (!ad) {
      throw new AppError(404, "Publicité introuvable.", "NOT_FOUND");
    }

    const parsed = adBodySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "Certains champs sont invalides.", "VALIDATION");
    }

    if (parsed.data.title !== undefined) ad.title = parsed.data.title;
    if (parsed.data.linkUrl !== undefined) ad.linkUrl = parsed.data.linkUrl;
    if (parsed.data.sortOrder !== undefined) ad.sortOrder = parsed.data.sortOrder;
    if (parsed.data.active !== undefined) ad.active = parsed.data.active;
    if (req.file) ad.imageUrl = adImagePublicPath(req.file.filename);

    await ad.save();
    res.json({ ad: toPublicAd(ad) });
  }),
);

router.post(
  "/ads/:id/hide",
  asyncHandler(async (req, res) => {
    const ad = await AdModel.findById(req.params.id);
    if (!ad) {
      throw new AppError(404, "Publicité introuvable.", "NOT_FOUND");
    }
    ad.active = false;
    await ad.save();
    res.json({ ad: toPublicAd(ad) });
  }),
);

router.post(
  "/ads/:id/restore",
  asyncHandler(async (req, res) => {
    const ad = await AdModel.findById(req.params.id);
    if (!ad) {
      throw new AppError(404, "Publicité introuvable.", "NOT_FOUND");
    }
    ad.active = true;
    await ad.save();
    res.json({ ad: toPublicAd(ad) });
  }),
);

export default router;
