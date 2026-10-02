/**
 * 통합 명식 엔진(CHART_ENGINE_VERSION 2026-10-02-unified) 이후, 구엔진으로 계산돼 저장된
 * saju_profiles의 saju_raw/saju_json을 새 엔진으로 다시 계산해 덮어쓴다.
 * 입력(생년월일·시각·성별)은 건드리지 않고, 입력에서 파생되는 계산 결과만 갱신한다.
 * 이미 만들어진 리포트(reports·blueprint_reports)는 재계산하지 않는다.
 *
 * 실행: npx tsx scripts/recompute-profiles.mts            (기본: 변경 예정만 출력, 쓰지 않음)
 *       npx tsx scripts/recompute-profiles.mts --apply     (백업 파일을 먼저 쓴 뒤 갱신)
 */
import fs from "fs";
import path from "path";

const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
const apply = process.argv.includes("--apply");

const { supabaseAdmin } = await import("../lib/db/client");
const { runSajuEngine } = await import("../lib/saju-engine");

const { data, error } = await supabaseAdmin
  .from("saju_profiles").select("id, user_id, label, birth_date, birth_time, gender, saju_raw, saju_json");
if (error || !data) { console.error("조회 실패", error); process.exit(1); }

const fmt = (j: any) => { const p = j?.pillars; return p ? ["year","month","day","hour"].map((k) => p[k] ? p[k].stem + p[k].branch : "--").join(" ") : "?"; };
const backup: unknown[] = [];
let changed = 0;
for (const row of data) {
  const time = row.birth_time ? String(row.birth_time).slice(0, 5) : null;
  let next;
  try {
    next = runSajuEngine({ birth_date: row.birth_date, birth_time: time, calendar: "solar", gender: row.gender });
  } catch (e) { console.error("계산 실패", row.id, e); continue; }
  const before = fmt(row.saju_json), after = fmt(next.saju_json);
  if (before !== after) changed++;
  console.log(`${row.id.slice(0, 8)} ${row.label.padEnd(3)} ${row.birth_date} ${time ?? "시각모름"} | ${before} -> ${after}${before !== after ? "  [변경]" : ""}`);
  backup.push({ id: row.id, saju_raw: row.saju_raw, saju_json: row.saju_json });
}
// 백업을 **먼저** 파일로 쓴 뒤 갱신한다(개인정보가 들어 있어 .backup/은 git에서 제외 — .gitignore).
if (apply) {
  fs.mkdirSync(path.join(process.cwd(), ".backup"), { recursive: true });
  const file = path.join(process.cwd(), ".backup", `profiles-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(backup));
  console.log(`백업 저장: ${file}`);
}
for (const row of data) {
  const time = row.birth_time ? String(row.birth_time).slice(0, 5) : null;
  let next;
  try { next = runSajuEngine({ birth_date: row.birth_date, birth_time: time, calendar: "solar", gender: row.gender }); } catch { continue; }
  if (apply) {
    const { error: upErr } = await supabaseAdmin.from("saju_profiles")
      .update({ saju_raw: next.saju_raw, saju_json: next.saju_json }).eq("id", row.id);
    if (upErr) console.error("갱신 실패", row.id, upErr.message);
  }
}
console.log(`\n총 ${data.length}행, 명식이 달라지는 행 ${changed}개 ${apply ? "— 갱신 완료" : "— (미적용, --apply로 실행)"}`);
