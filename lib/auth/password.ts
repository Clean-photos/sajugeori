import { createHash } from "crypto";

// SHA-256 + salt (production에서는 bcrypt 권장 — 기존 가입 데이터와의 호환을 위해 유지)
export function hashPassword(password: string): string {
  const salt = process.env.AUTH_SECRET!.slice(0, 16);
  return createHash("sha256").update(salt + password).digest("hex");
}
