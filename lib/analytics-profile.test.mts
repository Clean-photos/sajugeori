import assert from "node:assert/strict";

const rows = [
  { label: "대상", kind: "person", is_primary: false, birth_date: "1960-01-01", birth_time: null, gender: "F", created_at: "2026-03-01" },
  { label: "엄마", kind: "person", is_primary: false, birth_date: "1962-05-05", birth_time: "07:30:00", gender: "F", created_at: "2026-02-01" },
  { label: "본인", kind: "person", is_primary: true, birth_date: "1990-01-01", birth_time: "14:30", gender: "M", created_at: "2026-01-01" },
  { label: "콩이", kind: "pet", is_primary: false, birth_date: "2020-01-01", birth_time: null, gender: "M", created_at: "2026-04-01" },
];
(globalThis as unknown as { fetch: unknown }).fetch = async () => ({ ok: true, json: async () => ({ profiles: rows }) });

const { resolveProfileMeta, recentProfileMeta } = await import("./analytics-profile");

const self = await resolveProfileMeta("salpuri", { birth_date: "1990-01-01", birth_time: "14:30", gender: "M" });
assert.deepEqual(self, { profile_relation: "self", profile_index: 1 });
const mom = await resolveProfileMeta("salpuri", { birth_date: "1962-05-05", birth_time: "07:30", gender: "F" });
assert.deepEqual(mom, { profile_relation: "other", profile_index: 2 });
const adhoc = await resolveProfileMeta("salpuri", { birth_date: "1960-01-01", birth_time: null, gender: "F" });
assert.deepEqual(adhoc, { profile_relation: "other", profile_index: 0 }); // "대상"은 미등록 취급
assert.deepEqual(await resolveProfileMeta("report"), { profile_relation: "self", profile_index: 1 });
assert.deepEqual(await resolveProfileMeta("pet", {}), { profile_relation: "pet", profile_index: 0 });
assert.deepEqual(recentProfileMeta("pet"), { profile_relation: "pet", profile_index: 0 });
assert.deepEqual(recentProfileMeta("salpuri"), {}); // 다른 상품 값이 새어 들어가지 않는다
(globalThis as unknown as { fetch: unknown }).fetch = async () => { throw new Error("offline"); };
assert.deepEqual(await resolveProfileMeta("taekil", {}), {});
console.log("analytics-profile OK");
