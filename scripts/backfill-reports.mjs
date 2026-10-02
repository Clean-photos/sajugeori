// 022 마이그레이션 백필 — 7개 상품별 테이블 → reports 테이블로 데이터 복사.
// 이동(MOVE)이 아니라 복사(COPY)다: 원본 테이블은 전혀 건드리지 않는다(롤백 장치).
// 재실행해도 안전 — unique(profile_id, product_id, variant) 충돌 시 건너뛴다.
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const get = (k) => env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim();
const sb = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));

let totalCopied = 0;
let totalSkipped = 0;

async function copy(table, productId, mapRow) {
  const { data, error } = await sb.from(table).select("*");
  if (error) {
    console.error(`[${table}] 조회 실패:`, error.message);
    return;
  }
  console.log(`[${table}] ${data.length}건 발견`);
  for (const row of data) {
    const mapped = mapRow(row);
    const { error: insErr } = await sb.from("reports").insert({
      user_id: row.user_id,
      product_id: productId,
      profile_id: row.saju_profile_id,
      variant: mapped.variant,
      content: mapped.content,
      extra: mapped.extra ?? {},
      created_at: row.created_at,
      expires_at: row.expires_at,
    });
    if (insErr) {
      if (insErr.code === "23505") {
        totalSkipped++;
        continue; // 이미 복사됨(재실행) — 정상
      }
      console.error(`[${table}] row ${row.id ?? row.saju_profile_id} 복사 실패:`, insErr.message);
      continue;
    }
    totalCopied++;
  }
}

await copy("premium_reports", "saju_one", (r) => ({
  variant: "", content: r.content, extra: {},
}));

await copy("premium_salpuri_reports", "salpuri_one", (r) => ({
  variant: "", content: r.content, extra: {},
}));

await copy("premium_yearly_reports", "yearly_one", (r) => ({
  variant: String(r.year), content: r.content, extra: { year: r.year },
}));

await copy("premium_wuxing_reports", "wuxing_one", (r) => ({
  variant: "", content: r.content, extra: {},
}));

await copy("premium_taekil_reports", "taekil_one", (r) => ({
  variant: [r.purpose, r.range_from, r.range_to].join("|"),
  content: r.content,
  extra: { purpose: r.purpose, range_from: r.range_from, range_to: r.range_to, best: r.best },
}));

await copy("premium_compatibility_reports", "compatibility_one", (r) => ({
  variant: [r.partner_birth, r.partner_birth_time ?? "", r.partner_gender, r.context].join("|"),
  content: { text: r.content, score: r.score },
  extra: {
    partner_birth: r.partner_birth, partner_birth_time: r.partner_birth_time,
    partner_gender: r.partner_gender, context: r.context,
    person_a_birth: r.person_a_birth, person_a_gender: r.person_a_gender,
  },
}));

await copy("premium_pet_reports", "pet_one", (r) => ({
  variant: [r.species, r.pet_name, r.pet_year, r.pet_month, r.pet_day ?? 0].join("|"),
  content: r.content,
  extra: { species: r.species, pet_name: r.pet_name, pet_year: r.pet_year, pet_month: r.pet_month, pet_day: r.pet_day },
}));

console.log(`\n완료 — 복사 ${totalCopied}건, 건너뜀(중복) ${totalSkipped}건`);
