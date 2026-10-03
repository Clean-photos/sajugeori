import assert from "node:assert/strict";
import { createHash } from "node:crypto";
process.env.AUTH_SECRET = "0123456789abcdef0123456789abcdef";
const { hashPassword, verifyPassword } = await import("./password");

const h1 = await hashPassword("pass1234");
const h2 = await hashPassword("pass1234");
assert.match(h1, /^scrypt\$16384\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
assert.notEqual(h1, h2, "사용자별 salt라 같은 비밀번호도 해시가 달라야 한다");
assert.deepEqual(await verifyPassword("pass1234", h1), { ok: true, needsRehash: false });
assert.deepEqual(await verifyPassword("wrong", h1), { ok: false, needsRehash: false });

// 옛 형식(SHA-256 + AUTH_SECRET 앞 16자)은 계속 통과하고 재해시를 요구한다.
const legacy = createHash("sha256").update("0123456789abcdef" + "pass1234").digest("hex");
assert.deepEqual(await verifyPassword("pass1234", legacy), { ok: true, needsRehash: true });
assert.deepEqual(await verifyPassword("nope", legacy), { ok: false, needsRehash: false });

// 비정상 저장값은 거부(예외 없이)
assert.equal((await verifyPassword("x", null)).ok, false);
assert.equal((await verifyPassword("x", "scrypt$abc")).ok, false);
assert.equal((await verifyPassword("x", "zz")).ok, false);
console.log("password OK");
