/**
 * yongsin-track.ts — 억부·조후 두 트랙의 용신 판정을 상품 공통으로 계산한다.
 *
 * §1(CoS+CEO 실물 확인, 2026-09-08): 오행 리포트(lib/wuxing/map-section.ts)는
 * 억부·조후를 병기하고 교집합을 우선하는 표준 규칙(교집합 > 조후 > 억부 폴백)을
 * 쓰는데, 운명 설계도(lib/blueprint-engine/anchor.ts)는 "억부 있으면 억부,
 * 없으면 조후"만 봐서 조후를 사실상 무시했다. 그 결과 억부상 기신(예: 水)을
 * 조후가 정확히 필요로 하는데도 "기신"으로 단정하고, 같은 리포트의 다른
 * 섹션에서는 그 기신을 채우라고 처방하는 자기모순이 실측됐다(丁卯乙巳辛巳戊子,
 * 燥熱 사주 — "기신 수"라 해 놓고 "습도를 50% 이상 유지하라"고 처방). 살풀이는
 * "용신인 土·金" 단정 문구를 반복해서 냈다.
 *
 * 세 상품이 같은 계산을 각자 다시 하면 이 사고가 재발한다 — 여기 하나로 모으고,
 * 오행 리포트의 병기 구조를 표준으로 삼는다. chart.yongsin.eokbu_candidates/
 * johu_candidates(계산 엔진 산출, 무접촉)만 읽는 순수 함수라 상품마다 안전하게
 * 재사용할 수 있다.
 */
import * as C from "@/lib/saju-engine/constants";
import type { Element } from "@/lib/saju-engine/constants";
import type { SajuChart } from "@/lib/saju-engine/engine";

export type YongsinTrackRelation = "intersect" | "conflict" | "single";

export interface YongsinDualTrack {
  /** 억부(힘의 균형) 트랙 후보 */
  eokbu: Element[];
  eokbuKr: string[];
  /** 조후(계절 한난조습) 트랙 후보 */
  johu: Element[];
  johuKr: string[];
  /** 엔진이 판정한 한난조습 문구 */
  climate: string;
  /** intersect(교집합 있음) / conflict(둘 다 있는데 교집합 없음) / single(한쪽만 후보 있음) */
  trackRelation: YongsinTrackRelation;
  intersection: Element[];
  /** 결정 규칙: 교집합 > 조후 > (조후가 비면=한난 중화) 억부 */
  yongsinByTrack: Element[];
  yongsinByTrackKr: string[];
  /** 단일 용신 단정 금지 고지 — 상품 공통 문구 */
  disclaimer: string;
}

export const YONGSIN_DUAL_TRACK_DISCLAIMER =
  "억부(힘의 균형)와 조후(기후)는 목적이 다르므로 하나로 단정하지 않고 함께 제시합니다. 최종 용신은 격국까지 종합해 판단해야 합니다.";

export function buildYongsinDualTrack(chart: Pick<SajuChart, "yongsin">): YongsinDualTrack {
  const eokbu = chart.yongsin.eokbu_candidates;
  const johu = chart.yongsin.johu_candidates;
  const intersection = eokbu.filter((el) => johu.includes(el));
  const trackRelation: YongsinTrackRelation =
    eokbu.length === 0 || johu.length === 0 ? "single" : intersection.length > 0 ? "intersect" : "conflict";
  const yongsinByTrack = intersection.length > 0 ? intersection : johu.length > 0 ? johu : eokbu;
  return {
    eokbu,
    eokbuKr: eokbu.map((el) => C.ELEMENT_KR[el]),
    johu,
    johuKr: johu.map((el) => C.ELEMENT_KR[el]),
    climate: chart.yongsin.climate,
    trackRelation,
    intersection,
    yongsinByTrack,
    yongsinByTrackKr: yongsinByTrack.map((el) => C.ELEMENT_KR[el]),
    disclaimer: YONGSIN_DUAL_TRACK_DISCLAIMER,
  };
}

/**
 * LLM 프롬프트에 그대로 붙일 수 있는 병기 한 줄(+ 갈릴 때만 붙는 보조 설명).
 * salpuri·destiny 둘 다 이 문구를 쓴다 — "용신인 X"류 단정 문구 재발 방지.
 */
export function yongsinDualTrackPromptLine(t: YongsinDualTrack): string {
  const eokbuStr = t.eokbuKr.join("·") || "없음";
  const johuStr = t.johuKr.join("·") || "없음(한난 중화)";
  const finalStr = t.yongsinByTrackKr.join("·") || "없음";
  const lines = [
    `억부 용신: ${eokbuStr} / 조후 용신: ${johuStr} / 종합: ${finalStr}`,
    `(${t.disclaimer} "용신인 X"처럼 한 오행만 단정하지 말 것 — 위 세 줄 그대로 병기할 것)`,
  ];
  if (t.trackRelation === "conflict") {
    lines.push(
      `주의 — 억부와 조후가 서로 다른 오행을 가리킵니다(교집합 없음). 억부상 부담되는 오행이라도 조후상 필요한 오행이면 "억부상 부담이나 조후상 필요"처럼 두 관점을 함께 밝힐 것 — 한쪽 관점만으로 "기신"이라 단정하지 말 것.`
    );
  }
  return lines.join("\n");
}
