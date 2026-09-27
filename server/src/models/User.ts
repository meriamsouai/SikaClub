import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const USER_ROLES = ["client", "admin", "super_admin"] as const;
export const ACCOUNT_STATUSES = ["pending", "approved", "rejected", "disabled", "banned"] as const;

const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    surname: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 160,
    },
    // Set after an admin approves the account and the partner opens the email link.
    password: { type: String, select: false },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    companyName: { type: String, trim: true, maxlength: 120, default: "" },
    role: { type: String, enum: USER_ROLES, default: "client", required: true },
    status: { type: String, enum: ACCOUNT_STATUSES, default: "pending", required: true },
    totalPoints: { type: Number, default: 0, min: 0, required: true },
  },
  { timestamps: true },
);

export type UserRole = (typeof USER_ROLES)[number];
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;

export function isStaffRole(role: UserRole | string | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export type PublicUser = {
  id: string;
  firstName: string;
  surname: string;
  email: string;
  phone: string;
  companyName: string;
  role: UserRole;
  status: AccountStatus;
  totalPoints: number;
  createdAt: Date;
};

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    surname: user.surname,
    email: user.email,
    phone: user.phone,
    companyName: user.companyName,
    role: user.role,
    status: user.status,
    totalPoints: user.totalPoints,
    createdAt: user.createdAt,
  };
}

export const UserModel = model("User", userSchema);
