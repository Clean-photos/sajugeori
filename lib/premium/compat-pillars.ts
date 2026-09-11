/**
 * compat-pillars.ts — §7-3(CoS 실물 재검증, 2026-09-10): "두 사람의 명식표가
 * 없습니다. 다른 상품은 명식을 보여주는데 궁합만 없어 사용자가 검증할 방법이
 * 없습니다." 두 SajuChart에서 화면에 그대로 낼 수 있는 4주(년/월/일/시) 요약만
 * 뽑는다 — 계산은 건드리지 않고 이미 계산된 chart를 그대로 읽기만 한다.
 *
 * 생성 응답(POST)과 저장본 재열람([id]) 양쪽에서 같은 함수로 뽑아야 서로
 * 어긋나지 않는다 — 저장은 하지 않고 매번 이 함수로 다시 뽑는다(비용 0,
 * §0-2①/②와 같은 이유).
 */
import * as C from "@/lib/saju-engine/constants";
import type { Stem, Branch } from "@/lib/saju-engine/constants";
import type { SajuChart } from "@/lib/saju-engine/engine";

export interface CompatPillarCell {
  stem: string;
  branch: string;
}

export interface CompatPillarSummary {
  label: string;
  dayMaster: string;
  hasHour: boolean;
  year: CompatPillarCell;
  month: CompatPillarCell;
  day: CompatPillarCell;
  hour: CompatPillarCell | null;
}

export function buildCompatPillarSummary(chart: SajuChart, label: string): CompatPillarSummary {
  const p = chart.pillars;
  const cell = (stem: Stem, branch: Branch): CompatPillarCell => ({
    stem: `${stem}(${C.STEM_KR[stem]})`,
    branch: `${branch}(${C.BRANCH_KR[branch]})`,
  });
  return {
    label,
    dayMaster: `${chart.day_master}(${C.STEM_KR[chart.day_master]})`,
    hasHour: !!p.hour,
    year: cell(p.year.stem, p.year.branch),
    month: cell(p.month.stem, p.month.branch),
    day: cell(p.day.stem, p.day.branch),
    hour: p.hour ? cell(p.hour.stem, p.hour.branch) : null,
  };
}
