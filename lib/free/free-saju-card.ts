// free-saju-card.ts — 무료 사주 결과 최상단 요약 카드(명식 8글자·오행 분포·신살 목록)의 데이터.
//
// §B-6(CoS 실물 확인, 2026-09-23): 무료에서 용신·개운 처방은 뺐는데(2026-09-22 CEO 결정),
// 그 자리를 채울 "무료가 원래 줄 수 있는 것"(명식·오행 분포·신살 목록)이 없어 결과가
// 얇아졌다. 이 세 가지는 순수 계산값이라 프리미엄의 판정·처방(용신·과다/부족 등급 등)과
// 달리 그대로 공개해도 무료/유료 경계를 해치지 않는다 — SajuChart(saju_raw)에 이미 있는
// 값을 그대로 옮기기만 한다. 새 계산 로직 없음.
import type { Pillar, SajuChart } from "@/lib/saju-engine/engine";
import * as C from "@/lib/saju-engine/constants";
import type { Element } from "@/lib/saju-engine/constants";
import { countElements } from "@/lib/wuxing/count";

export interface FreeSajuPillar {
  label: string; // "년주" | "월주" | "일주" | "시주"
  stem: string;
  stemKr: string;
  branch: string;
  branchKr: string;
}

export interface FreeSajuCard {
  pillars: FreeSajuPillar[]; // 시각 모르면 3개(년·월·일)
  elements: { element: Element; elementKr: string; count: number }[];
  sal: { name: string; where: string }[];
}

const PILLAR_LABEL: Record<"year" | "month" | "day" | "hour", string> = {
  year: "년주", month: "월주", day: "일주", hour: "시주",
};

export function buildFreeSajuCard(chart: SajuChart): FreeSajuCard {
  const pillars: FreeSajuPillar[] = (["year", "month", "day", "hour"] as const)
    .map((k) => ({ k, p: chart.pillars[k] }))
    .filter((x): x is { k: keyof typeof PILLAR_LABEL; p: Pillar } => !!x.p)
    .map(({ k, p }) => ({
      label: PILLAR_LABEL[k],
      stem: p.stem, stemKr: C.STEM_KR[p.stem],
      branch: p.branch, branchKr: C.BRANCH_KR[p.branch],
    }));

  // chart.elements는 지장간 가중 "점수"라 합계가 8이 아니고 소수점이 섞인다
  // (lib/wuxing/count.ts 문서 참고 — "水 1.16개"로 찍으면 틀린 값). 표면 계수
  // (8글자를 1개씩 그대로 센 값)만 무료 카드에 쓴다.
  const surface = countElements(chart).surface;
  const elements = C.ELEMENTS.map((e) => ({
    element: e, elementKr: C.ELEMENT_KR[e], count: surface[e],
  }));

  // meaning(신살 설명 문장)은 헤더 payload 크기를 키우기만 하고, "목록" 용도에는
  // 이름·위치만으로 충분하다 — 보내지 않는다.
  const sal = chart.sal.map((s) => ({ name: s.name, where: s.where }));

  return { pillars, elements, sal };
}
