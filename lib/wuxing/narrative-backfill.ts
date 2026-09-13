import type { SajuChart } from "@/lib/saju-engine";
import type { Classification } from "./classify";
import type { WuxingNarratives, WuxingReportData } from "./report";
import { generateSeunNarrative } from "./seun-narrative";
import { generateDiagnosisNarrative } from "./diagnosis-narrative";

/**
 * §C-2(CoS 실물 재검증, 2026-09-11): 오행은 재생성 버튼이 없다(U2 결정) —
 * 생성 시점에 narratives(한 줄 진단 보충·3년 흐름) 중 하나가 재시도까지
 * 실패하면, 그 저장본은 영원히 "준비하고 있습니다" 폴백만 보여준다(실측:
 * 표본 A 2028년 카드에 "3년을 관통하는 흐름을 준비하고 있습니다"가 고정).
 * 열람할 때 비어 있는 조각만 한 번 더 시도해 채운다 — 성공하면 호출부가
 * 저장본의 narratives만 갱신해 다음부터는 재시도 없이 바로 뜨게 한다.
 * 실패해도 조용히 넘어간다(열람 자체를 막을 이유는 아니다).
 */
export async function backfillMissingNarratives(
  chart: SajuChart,
  cls: Classification,
  report: WuxingReportData
): Promise<{ narratives: WuxingNarratives; patched: boolean }> {
  let narratives = report.narratives;
  let patched = false;

  if (!narratives.seunFlow) {
    try {
      const seunFlow = await generateSeunNarrative(chart, cls, report.seun);
      narratives = { ...narratives, seunFlow };
      patched = true;
    } catch (e) {
      console.error("오행 저장본 3년 흐름 문단 열람 시 보충 실패:", e);
    }
  }
  if (!narratives.diagnosis) {
    try {
      const diagnosis = await generateDiagnosisNarrative(report.diagnosis);
      narratives = { ...narratives, diagnosis };
      patched = true;
    } catch (e) {
      console.error("오행 저장본 한 줄 진단 보충 문장 열람 시 보충 실패:", e);
    }
  }

  return { narratives, patched };
}
