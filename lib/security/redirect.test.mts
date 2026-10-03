import assert from "node:assert/strict";
const { safeInternalPath } = await import("./redirect");
assert.equal(safeInternalPath("/premium/buy?product=saju_one"), "/premium/buy?product=saju_one");
assert.equal(safeInternalPath("/"), "/");
for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "evil.com", "/ok\n//x", "", null, undefined]) {
  assert.equal(safeInternalPath(bad as string | null | undefined), "/", String(bad));
}
assert.equal(safeInternalPath("//x", "/home"), "/home");
console.log("redirect OK");
