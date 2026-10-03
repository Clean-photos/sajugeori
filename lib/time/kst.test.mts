import assert from "node:assert/strict";
process.env.TZ = "America/New_York"; // 서버 시간대와 무관해야 한다
const { kstYear, kstMonth, localDateStr } = await import("./kst");
// 2026-12-31T15:30:00Z = 한국 2027-01-01 00:30
const t = Date.UTC(2026, 11, 31, 15, 30);
assert.equal(kstYear(t), 2027);
assert.equal(kstMonth(t), 1);
assert.equal(kstYear(Date.UTC(2026, 11, 31, 14, 59)), 2026);
assert.equal(localDateStr(new Date(2026, 11, 31)), "2026-12-31");
assert.equal(localDateStr(new Date(2027, 0, 5)), "2027-01-05");
console.log("kst OK");
