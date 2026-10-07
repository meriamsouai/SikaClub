import crypto from "crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../lib/asyncHandler";
import { clearAuthCookies, setAuthCookies } from "../lib/cookies";
import { hashPassword, verifyPassword } from "../lib/password";
import { ensureWelcomeBonus } from "../lib/pointsLedger";
import { createRefreshToken, hashToken, REFRESH_COOKIE, signAccessToken } from "../lib/tokens";
import { PasswordResetModel } from "../models/PasswordReset";
import { RefreshTokenModel } from "../models/RefreshToken";
import { toPublicUser, UserModel, type UserRole } from "../models/User";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { validateBody } from "../middleware/validate";
import { env } from "../config/env";
import { sendAccountRequestEmail } from "../lib/mail";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type LoginInput,
  type ResetPasswordInput,
  type SignupInput,
  type UpdateProfileInput,
} from "../validation/auth";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Trop de tentatives. Réessayez dans quelques minutes.",
    code: "RATE_LIMITED",
  },
});

async function issueSession(userId: string, role: UserRole, res: Parameters<typeof setAuthCookies>[0]) {
  const accessToken = signAccessToken(userId, role);
  const refresh = createRefreshToken();
  await RefreshTokenModel.create({
    user: userId,
    tokenHash: refresh.tokenHash,
    expiresAt: refresh.expiresAt,
  });
  setAuthCookies(res, accessToken, refresh.token);
}

router.post(
  "/signup",
  authLimiter,
  validateBody(signupSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as SignupInput;
    const existing = await UserModel.findOne({ email: input.email });
    if (existing) {
      throw new AppError(409, "Un compte existe déjà avec cet e-mail.", "EMAIL_TAKEN");
    }

    const user = await UserModel.create({
      firstName: input.firstName,
      surname: input.surname,
      email: input.email,
      phone: input.phone,
      companyName: input.companyName,
      role: "client",
      status: "pending",
      totalPoints: 0,
    });
    await ensureWelcomeBonus(user);

    const admins = await UserModel.find({ role: { $in: ["admin", "super_admin"] } }).select("email");
    try {
      await sendAccountRequestEmail({
        to: admins.map((admin) => admin.email),
        firstName: user.firstName,
        surname: user.surname,
        companyName: user.companyName,
      });
    } catch (error) {
      console.error("SMTP account request notification failed:", error);
      throw new AppError(
        502,
        "Votre demande a été enregistrée, mais la notification des administrateurs a échoué.",
        "SMTP_FAILED",
      );
    }

    res.status(201).json({
      message:
        "Votre demande sera examinée par un administrateur. Si elle est approuvée, vous recevrez un e-mail contenant un lien pour définir votre mot de passe.",
    });
  }),
);

router.post(
  "/login",
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as LoginInput;
    const user = await UserModel.findOne({ email: input.email }).select("+password");

    if (!user) {
      await verifyPassword(input.password);
      throw new AppError(401, "E-mail ou mot de passe incorrect.", "INVALID_CREDENTIALS");
    }

    if (!user.password) {
      if (user.status === "pending") {
        throw new AppError(
          403,
          "Votre compte est en attente de validation par un administrateur. Vous recevrez un e-mail dès qu’il sera approuvé.",
          "PENDING",
        );
      }
      if (user.status === "rejected") {
        throw new AppError(
          403,
          "Votre demande d’inscription n’a pas été approuvée. Contactez SIKA pour plus d’informations.",
          "REJECTED",
        );
      }
      throw new AppError(
        403,
        "Votre compte est approuvé, mais aucun mot de passe n’est défini. Utilisez le lien reçu par e-mail pour le créer.",
        "PASSWORD_NOT_SET",
      );
    }

    const passwordMatches = await verifyPassword(input.password, user.password);
    if (!passwordMatches) {
      throw new AppError(401, "E-mail ou mot de passe incorrect.", "INVALID_CREDENTIALS");
    }

    if (user.status === "pending") {
      throw new AppError(
        403,
        "Votre compte est en attente de validation par un administrateur. Vous recevrez un e-mail dès qu’il sera approuvé.",
        "PENDING",
      );
    }
    if (user.status === "rejected") {
      throw new AppError(
        403,
        "Votre demande d’inscription n’a pas été approuvée. Contactez SIKA pour plus d’informations.",
        "REJECTED",
      );
    }
    if (user.status === "disabled") {
      throw new AppError(
        403,
        "Ce compte administrateur a été désactivé. Contactez le super administrateur.",
        "DISABLED",
      );
    }
    if (user.status === "banned") {
      throw new AppError(
        403,
        "Votre compte a été suspendu. Contactez SIKA pour plus d’informations.",
        "BANNED",
      );
    }

    await issueSession(user._id.toString(), user.role, res);
    res.json({ user: toPublicUser(user) });
  }),
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!rawToken) {
      throw new AppError(401, "Session expirée. Veuillez vous reconnecter.", "UNAUTHENTICATED");
    }

    const stored = await RefreshTokenModel.findOne({ tokenHash: hashToken(rawToken) });
    if (!stored || stored.expiresAt.getTime() < Date.now()) {
      clearAuthCookies(res);
      if (stored) {
        await stored.deleteOne();
      }
      throw new AppError(401, "Session expirée. Veuillez vous reconnecter.", "UNAUTHENTICATED");
    }

    const user = await UserModel.findById(stored.user).select("+password");
    await stored.deleteOne();

    if (!user || user.status !== "approved" || !user.password) {
      clearAuthCookies(res);
      throw new AppError(401, "Session invalide.", "UNAUTHENTICATED");
    }

    await issueSession(user._id.toString(), user.role, res);
    res.json({ user: toPublicUser(user) });
  }),
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (rawToken) {
      await RefreshTokenModel.deleteOne({ tokenHash: hashToken(rawToken) });
    }
    clearAuthCookies(res);
    res.status(204).send();
  }),
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: toPublicUser(req.authUser!) });
  }),
);

router.patch(
  "/me",
  requireAuth,
  validateBody(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as UpdateProfileInput;
    const user = req.authUser!;
    const taken = await UserModel.findOne({ email: input.email, _id: { $ne: user._id } });
    if (taken) {
      throw new AppError(409, "Un compte existe déjà avec cet e-mail.", "EMAIL_TAKEN");
    }

    user.firstName = input.firstName;
    user.surname = input.surname;
    user.email = input.email;
    user.phone = input.phone;
    user.companyName = input.companyName;
    await user.save();

    res.json({ user: toPublicUser(user) });
  }),
);

router.post(
  "/change-password",
  requireAuth,
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as ChangePasswordInput;
    const user = await UserModel.findById(req.authUser!._id).select("+password");
    if (!user || !user.password) {
      throw new AppError(400, "Aucun mot de passe n’est défini pour ce compte.", "PASSWORD_NOT_SET");
    }

    const matches = await verifyPassword(input.currentPassword, user.password);
    if (!matches) {
      throw new AppError(400, "Le mot de passe actuel est incorrect.", "INVALID_CURRENT_PASSWORD");
    }

    if (input.currentPassword === input.newPassword) {
      throw new AppError(
        400,
        "Le nouveau mot de passe doit être différent de l’actuel.",
        "PASSWORD_UNCHANGED",
      );
    }

    user.password = await hashPassword(input.newPassword);
    await user.save();

    res.json({ message: "Mot de passe mis à jour." });
  }),
);

const RESET_TTL_MS = 60 * 60 * 1000;

router.post(
  "/forgot-password",
  authLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as ForgotPasswordInput;
    const message =
      "Si un compte approuvé existe avec cet e-mail, un lien de réinitialisation a été préparé.";
    const user = await UserModel.findOne({ email: input.email }).select("+password");

    if (!user || user.status !== "approved" || !user.password) {
      res.json({ message });
      return;
    }

    const token = crypto.randomBytes(32).toString("base64url");
    await PasswordResetModel.deleteMany({ user: user._id });
    await PasswordResetModel.create({
      user: user._id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    });

    const resetUrl = `${env.clientOrigin}/reset-password?token=${encodeURIComponent(token)}`;
    console.info(`Password reset link for ${user.email}: ${resetUrl}`);

    res.json({
      message,
      ...(env.isProduction ? {} : { resetUrl }),
    });
  }),
);

router.post(
  "/reset-password",
  authLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as ResetPasswordInput;
    const stored = await PasswordResetModel.findOne({ tokenHash: hashToken(input.token) });
    if (!stored || stored.expiresAt.getTime() < Date.now()) {
      if (stored) await stored.deleteOne();
      throw new AppError(400, "Ce lien de réinitialisation est invalide ou a expiré.", "INVALID_RESET_TOKEN");
    }

    const user = await UserModel.findById(stored.user).select("+password");
    if (!user || user.status !== "approved") {
      await stored.deleteOne();
      throw new AppError(400, "Ce lien de réinitialisation est invalide ou a expiré.", "INVALID_RESET_TOKEN");
    }

    user.password = await hashPassword(input.password);
    await user.save();
    await stored.deleteOne();
    await PasswordResetModel.deleteMany({ user: user._id });
    await RefreshTokenModel.deleteMany({ user: user._id });

    res.json({ message: "Votre mot de passe a été réinitialisé. Vous pouvez vous connecter." });
  }),
);

export default router;
