import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;
let dummyHash: string | null = null;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash?: string | null): Promise<boolean> {
  if (!hash) {
    if (!dummyHash) {
      dummyHash = await bcrypt.hash("sika-portal-invalid-password", SALT_ROUNDS);
    }
    await bcrypt.compare(password, dummyHash);
    return false;
  }
  return bcrypt.compare(password, hash);
}
