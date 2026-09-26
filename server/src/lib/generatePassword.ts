import crypto from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%";

export function generateTemporaryPassword(length = 12): string {
  const bytes = crypto.randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i += 1) {
    password += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return password;
}
