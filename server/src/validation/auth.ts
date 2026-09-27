import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .min(8, "Numéro de téléphone invalide.")
  .max(20, "Numéro de téléphone invalide.")
  .regex(/^[0-9+\s().-]+$/, "Numéro de téléphone invalide.")
  .refine((value) => value.replace(/\D/g, "").length >= 8, "Numéro de téléphone invalide.");

export const signupSchema = z.object({
  phone: phoneSchema,
  companyName: z.preprocess(
    (value) => (value == null ? "" : String(value).trim()),
    z.string().max(120, "Le nom de l’entreprise est trop long."),
  ),
  firstName: z.string().trim().min(1, "Le prénom est requis.").max(80, "Le prénom est trop long."),
  surname: z.string().trim().min(1, "Le nom est requis.").max(80, "Le nom est trop long."),
  email: z
    .string()
    .trim()
    .email("Adresse e-mail invalide.")
    .max(160, "Adresse e-mail trop longue.")
    .transform((value) => value.toLowerCase()),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Adresse e-mail invalide.")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(1, "Le mot de passe est requis.")
    .max(128, "Le mot de passe est trop long."),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Adresse e-mail invalide.")
    .transform((value) => value.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20, "Lien de réinitialisation invalide."),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .max(128, "Le mot de passe est trop long."),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, "Le mot de passe actuel est requis.")
    .max(128, "Le mot de passe est trop long."),
  newPassword: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .max(128, "Le mot de passe est trop long."),
});

export const updateProfileSchema = signupSchema;

export type SignupInput = z.infer<typeof signupSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
