import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from "crypto";

/**
 * 비밀번호 해시 — scrypt + 사용자별 무작위 salt (2026-10-04 보안 점검).
 *
 * 형식: `scrypt$N$saltHex$hashHex`. 이전(SHA-256 + 전역 salt) 해시는 64자리 hex라
 * 형식으로 구분해 로그인 성공 시 새 형식으로 바꿔 저장한다(점진 이전, 강제 재설정 없음).
 */
const N = 16384, R = 8, P = 1, KEYLEN = 64;

function scryptAsync(password: string, salt: Buffer, n: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, KEYLEN, { N: n, r: R, p: P, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? reject(e) : resolve(k)))
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, N);
  return `scrypt$${N}$${salt.toString("hex")}$${key.toString("hex")}`;
}

function legacyHash(password: string): string {
  const salt = (process.env.AUTH_SECRET ?? "").slice(0, 16);
  return createHash("sha256").update(salt + password).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex"), y = Buffer.from(b, "hex");
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

export async function verifyPassword(
  password: string,
  stored: string | null | undefined
): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (!stored) return { ok: false, needsRehash: false };
  if (stored.startsWith("scrypt$")) {
    const [, n, saltHex, hashHex] = stored.split("$");
    const cost = Number(n);
    if (!cost || !saltHex || !hashHex) return { ok: false, needsRehash: false };
    const key = await scryptAsync(password, Buffer.from(saltHex, "hex"), cost);
    return { ok: safeEqualHex(key.toString("hex"), hashHex), needsRehash: false };
  }
  const ok = safeEqualHex(legacyHash(password), stored);
  return { ok, needsRehash: ok };
}
