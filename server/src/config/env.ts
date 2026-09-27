import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function secret(name: string): string {
  const fallback = isProduction ? undefined : `dev-only-${name.toLowerCase()}-change-me`;
  const value = required(name, fallback);
  if (isProduction && value.length < 32) {
    throw new Error(`${name} must be at least 32 characters in production`);
  }
  return value;
}

export const env = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT ?? 5000),
  mongodbUri: required("MONGODB_URI", "mongodb://127.0.0.1:27017/sika_partners"),
  jwtAccessSecret: secret("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: secret("JWT_REFRESH_SECRET"),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? "",
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? "",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "",
};
