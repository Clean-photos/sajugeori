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
const { kstDateStr, kstMonthEndStr } = await import("./kst");
// 2026-10-03T16:00Z = 한국 2026-10-04 01:00 — UTC 브라우저에선 10-03으로 보이던 시각
assert.equal(kstDateStr(Date.UTC(2026, 9, 3, 16, 0)), "2026-10-04");
assert.equal(kstDateStr(Date.UTC(2026, 9, 3, 14, 59)), "2026-10-03");
assert.equal(kstMonthEndStr(2, Date.UTC(2026, 9, 3, 16, 0)), "2026-12-31"); // 10월 → 12월 말일
assert.equal(kstMonthEndStr(2, Date.UTC(2026, 11, 20, 0, 0)), "2027-02-28");
console.log("kst OK");
