// 모든 *.test.ts / *.test.mts 를 tsx로 하나씩 실행한다(테스트가 assert 스크립트 형태라 러너 없이 돈다).
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".next", ".git"].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.test\.m?ts$/.test(name)) out.push(p);
  }
  return out;
}

const tsxCli = join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
const files = walk(process.cwd()).sort();
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [tsxCli, f], { encoding: "utf8", env: { ...process.env, TZ: "UTC" } });
  const ok = r.status === 0;
  console.log(`${ok ? "PASS" : "FAIL"}  ${f.replace(process.cwd() + "\\", "").replace(process.cwd() + "/", "")}`);
  if (!ok) { failed++; console.log((r.stdout || "").slice(-1500), (r.stderr || "").slice(-1500)); }
}
console.log(`\n${files.length - failed}/${files.length} 통과`);
process.exit(failed ? 1 : 0);
