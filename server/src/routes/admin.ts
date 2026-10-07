import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { recordAdminAction } from "../lib/audit";
import { ensureWelcomeBonus, lifetimePointsByUserIds, removeWelcomeBonus } from "../lib/pointsLedger";
import { generateTemporaryPassword } from "../lib/generatePassword";
import { sendAccountApprovedEmail, sendAccountRejectedEmail, sendAdminInviteEmail } from "../lib/mail";
import { hashPassword } from "../lib/password";
import { giftImagePublicPath, giftImageUpload } from "../lib/upload";
import { adImagePublicPath, adImageUpload } from "../lib/adUpload";
import { AdminAuditLogModel, toPublicAdminAuditLog } from "../models/AdminAuditLog";
import { GiftModel, toPublicGift } from "../models/Gift";
import { AdModel, toPublicAd } from "../models/Ad";
import { isStaffRole, toPublicUser, UserModel } from "../models/User";
import { requireAuth } from "../middleware/auth";
import { requireAdmin, requireSuperAdmin } from "../middleware/requireAdmin";
import { AppError } from "../middleware/errorHandler";
import { adBodySchema, giftBodySchema, staffCreateSchema } from "../validation/admin";

const router = Router();

router.use(requireAuth, requireAdmin);

function actorFrom(req: { authUser?: { _id: { toString(): string }; email: string; role: string } }) {
  const user = req.authUser!;
  return { id: user._id.toString(), email: user.email, role: user.role };
}

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

    await recordAdminAction({
      actor: actorFrom(req),
      action: "account.approve",
      targetType: "user",
      targetId: user._id.toString(),
      summary: `Partenaire approuvé : ${user.email}`,
    });

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

    await removeWelcomeBonus(user);
    user.status = "rejected";
    await user.save();

    try {
      await sendAccountRejectedEmail({
        to: user.email,
        firstName: user.firstName,
      });
    } catch (error) {
      user.status = "pending";
      await user.save();
      console.error("SMTP reject failed:", error);
      throw new AppError(
        502,
        "Impossible d’envoyer l’e-mail de refus. Vérifiez la configuration SMTP.",
        "SMTP_FAILED",
      );
    }

    await recordAdminAction({
      actor: actorFrom(req),
      action: "account.reject",
      targetType: "user",
      targetId: user._id.toString(),
      summary: `Partenaire refusé : ${user.email}`,
    });

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

router.post(
  "/clients/:id/ban",
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.params.id);
    if (!user || user.role !== "client") {
      throw new AppError(404, "Compte introuvable.", "NOT_FOUND");
    }
    if (user.status === "banned") {
      throw new AppError(400, "Ce compte est déjà banni.", "VALIDATION");
    }
    if (user.status === "pending" || user.status === "rejected") {
      throw new AppError(400, "Seuls les comptes approuvés peuvent être bannis.", "VALIDATION");
    }

    user.status = "banned";
    await user.save();

    await recordAdminAction({
      actor: actorFrom(req),
      action: "client.ban",
      targetType: "user",
      targetId: user._id.toString(),
      summary: `Partenaire banni : ${user.email}`,
    });

    res.json({ user: toPublicUser(user), message: "Compte banni." });
  }),
);

router.post(
  "/clients/:id/unban",
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.params.id);
    if (!user || user.role !== "client") {
      throw new AppError(404, "Compte introuvable.", "NOT_FOUND");
    }
    if (user.status !== "banned") {
      throw new AppError(400, "Ce compte n’est pas banni.", "VALIDATION");
    }

    user.status = "approved";
    await user.save();

    await recordAdminAction({
      actor: actorFrom(req),
      action: "client.unban",
      targetType: "user",
      targetId: user._id.toString(),
      summary: `Partenaire réactivé : ${user.email}`,
    });

    res.json({ user: toPublicUser(user), message: "Compte réactivé." });
  }),
);

router.get(
  "/leaderboard",
  asyncHandler(async (_req, res) => {
    const users = await UserModel.find({ role: "client", status: "approved" }).limit(200);
    const lifetimeMap = await lifetimePointsByUserIds(users.map((user) => user._id));
    const ranked = users
      .map((user) => {
        const lifetimePoints = lifetimeMap.get(user._id.toString()) ?? 0;
        return {
          ...toPublicUser(user),
          lifetimePoints,
          currentPoints: user.totalPoints,
        };
      })
      .sort((a, b) => {
        if (b.lifetimePoints !== a.lifetimePoints) return b.lifetimePoints - a.lifetimePoints;
        if (b.currentPoints !== a.currentPoints) return b.currentPoints - a.currentPoints;
        return a.surname.localeCompare(b.surname);
      })
      .slice(0, 50)
      .map((user, index) => ({
        ...user,
        rank: index + 1,
      }));

    res.json({ users: ranked });
  }),
);

router.get(
  "/staff",
  requireSuperAdmin,
  asyncHandler(async (_req, res) => {
    const users = await UserModel.find({ role: { $in: ["admin", "super_admin"] } }).sort({
      role: -1,
      createdAt: 1,
    });
    res.json({ users: users.map(toPublicUser) });
  }),
);

router.post(
  "/staff",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const parsed = staffCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "Certains champs sont invalides.", "VALIDATION");
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await UserModel.findOne({ email });
    if (existing) {
      throw new AppError(409, "Un compte existe déjà avec cet e-mail.", "EMAIL_TAKEN");
    }

    const temporaryPassword = generateTemporaryPassword();
    const user = await UserModel.create({
      firstName: parsed.data.firstName,
      surname: parsed.data.surname,
      email,
      phone: parsed.data.phone,
      companyName: "SIKA Tunisie",
      role: "admin",
      status: "approved",
      password: await hashPassword(temporaryPassword),
      totalPoints: 0,
    });

    try {
      await sendAdminInviteEmail({
        to: user.email,
        firstName: user.firstName,
        password: temporaryPassword,
      });
    } catch (error) {
      await user.deleteOne();
      console.error("SMTP admin invite failed:", error);
      throw new AppError(
        502,
        "Impossible d’envoyer l’e-mail d’invitation. Vérifiez la configuration SMTP.",
        "SMTP_FAILED",
      );
    }

    await recordAdminAction({
      actor: actorFrom(req),
      action: "staff.create",
      targetType: "user",
      targetId: user._id.toString(),
      summary: `Administrateur créé : ${user.email}`,
    });

    res.status(201).json({
      user: toPublicUser(user),
      message: "Administrateur créé. Un e-mail avec le mot de passe a été envoyé.",
    });
  }),
);

router.post(
  "/staff/:id/disable",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.params.id);
    if (!user || !isStaffRole(user.role)) {
      throw new AppError(404, "Administrateur introuvable.", "NOT_FOUND");
    }
    if (user.role === "super_admin") {
      throw new AppError(400, "Le super administrateur ne peut pas être désactivé.", "VALIDATION");
    }
    if (user._id.toString() === req.authUser!._id.toString()) {
      throw new AppError(400, "Vous ne pouvez pas désactiver votre propre compte.", "VALIDATION");
    }
    if (user.status === "disabled") {
      throw new AppError(400, "Ce compte est déjà désactivé.", "VALIDATION");
    }

    user.status = "disabled";
    await user.save();

    await recordAdminAction({
      actor: actorFrom(req),
      action: "staff.disable",
      targetType: "user",
      targetId: user._id.toString(),
      summary: `Administrateur désactivé : ${user.email}`,
    });

    res.json({ user: toPublicUser(user), message: "Administrateur désactivé." });
  }),
);

router.post(
  "/staff/:id/enable",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.params.id);
    if (!user || user.role !== "admin") {
      throw new AppError(404, "Administrateur introuvable.", "NOT_FOUND");
    }
    if (user.status !== "disabled") {
      throw new AppError(400, "Ce compte n’est pas désactivé.", "VALIDATION");
    }

    user.status = "approved";
    await user.save();

    await recordAdminAction({
      actor: actorFrom(req),
      action: "staff.enable",
      targetType: "user",
      targetId: user._id.toString(),
      summary: `Administrateur réactivé : ${user.email}`,
    });

    res.json({ user: toPublicUser(user), message: "Administrateur réactivé." });
  }),
);

router.get(
  "/audit-logs",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 300);
    const entries = await AdminAuditLogModel.find().sort({ createdAt: -1 }).limit(limit);
    res.json({ entries: entries.map(toPublicAdminAuditLog) });
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

    await recordAdminAction({
      actor: actorFrom(req),
      action: "gift.create",
      targetType: "gift",
      targetId: gift._id.toString(),
      summary: `Cadeau créé : ${gift.name}`,
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

    await recordAdminAction({
      actor: actorFrom(req),
      action: "gift.update",
      targetType: "gift",
      targetId: gift._id.toString(),
      summary: `Cadeau modifié : ${gift.name}`,
    });

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

    await recordAdminAction({
      actor: actorFrom(req),
      action: "gift.hide",
      targetType: "gift",
      targetId: gift._id.toString(),
      summary: `Cadeau masqué : ${gift.name}`,
    });

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

    await recordAdminAction({
      actor: actorFrom(req),
      action: "gift.restore",
      targetType: "gift",
      targetId: gift._id.toString(),
      summary: `Cadeau réactivé : ${gift.name}`,
    });

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
  adImageUpload.fields([
    { name: "imageDesktop", maxCount: 1 },
    { name: "imageMobile", maxCount: 1 },
  ]),
  asyncHandler(async (req, res) => {
    const parsed = adBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "Certains champs sont invalides.", "VALIDATION");
    }
    const files = req.files as { imageDesktop?: Express.Multer.File[]; imageMobile?: Express.Multer.File[] } | undefined;
    const desktopFile = files?.imageDesktop?.[0];
    const mobileFile = files?.imageMobile?.[0];
    if (!desktopFile || !mobileFile) {
      throw new AppError(400, "Les images PC et mobile sont requises.", "VALIDATION");
    }

    const count = await AdModel.countDocuments();
    const imageUrlDesktop = adImagePublicPath(desktopFile.filename);
    const imageUrlMobile = adImagePublicPath(mobileFile.filename);
    const ad = await AdModel.create({
      title: parsed.data.title,
      linkUrl: parsed.data.linkUrl ?? "",
      sortOrder: parsed.data.sortOrder ?? count,
      active: parsed.data.active ?? true,
      imageUrlDesktop,
      imageUrlMobile,
      imageUrl: imageUrlDesktop,
    });

    await recordAdminAction({
      actor: actorFrom(req),
      action: "ad.create",
      targetType: "ad",
      targetId: ad._id.toString(),
      summary: `Publicité créée : ${ad.title}`,
    });

    res.status(201).json({ ad: toPublicAd(ad) });
  }),
);

router.patch(
  "/ads/:id",
  adImageUpload.fields([
    { name: "imageDesktop", maxCount: 1 },
    { name: "imageMobile", maxCount: 1 },
  ]),
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

    const files = req.files as { imageDesktop?: Express.Multer.File[]; imageMobile?: Express.Multer.File[] } | undefined;
    const desktopFile = files?.imageDesktop?.[0];
    const mobileFile = files?.imageMobile?.[0];
    if (desktopFile) {
      const path = adImagePublicPath(desktopFile.filename);
      ad.imageUrlDesktop = path;
      ad.imageUrl = path;
    }
    if (mobileFile) {
      ad.imageUrlMobile = adImagePublicPath(mobileFile.filename);
    }

    await ad.save();

    await recordAdminAction({
      actor: actorFrom(req),
      action: "ad.update",
      targetType: "ad",
      targetId: ad._id.toString(),
      summary: `Publicité modifiée : ${ad.title}`,
    });

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

    await recordAdminAction({
      actor: actorFrom(req),
      action: "ad.hide",
      targetType: "ad",
      targetId: ad._id.toString(),
      summary: `Publicité masquée : ${ad.title}`,
    });

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

    await recordAdminAction({
      actor: actorFrom(req),
      action: "ad.restore",
      targetType: "ad",
      targetId: ad._id.toString(),
      summary: `Publicité réactivée : ${ad.title}`,
    });

    res.json({ ad: toPublicAd(ad) });
  }),
);

export default router;
