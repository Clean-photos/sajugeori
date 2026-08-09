/**
 * indicators.ts — 6대 지표(축적력·확장력·지구력·연결력·회복력·변동성) 산식.
 *
 * 스펙 5장 "근거 강도 A = 엔진 계산값에서 직접 도출"에 해당하는 값들이라
 * LLM이 아니라 코드가 산출한다. 십성 개수·오행 분포·합충형해파 같은 이미
 * 계산된 사실을 0~100 점수로 환산하는 가중합 방식이며, 각 가중치는 이
 * 파일 안에서만 바뀐다(다른 파일에 흩어지면 감사 불가능해진다).
 */
import type { BlueprintChart } from "./engine";

export interface Indicators {
  accumulation: number;  // 축적력
  expansion: number;     // 확장력
  endurance: number;     // 지구력
  connection: number;    // 연결력
  recovery: number;      // 회복력
  volatility: number;    // 변동성
}

const TEN_GOD_GROUP: Record<string, "비겁" | "식상" | "재성" | "관성" | "인성" | null> = {
  "비견": "비겁", "겁재": "비겁",
  "식신": "식상", "상관": "식상",
  "편재": "재성", "정재": "재성",
  "편관": "관성", "정관": "관성",
  "편인": "인성", "정인": "인성",
  "일간(본원)": null,
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** ten_gods 레코드(일간 자신 제외)를 오성(五星) 그룹별 개수로 집계한다. */
function countTenGodGroups(chart: BlueprintChart): Record<"비겁" | "식상" | "재성" | "관성" | "인성", number> {
  const out = { "비겁": 0, "식상": 0, "재성": 0, "관성": 0, "인성": 0 };
  for (const label of Object.values(chart.ten_gods)) {
    const group = TEN_GOD_GROUP[label];
    if (group) out[group] += 1;
  }
  return out;
}

function totalInteractionFriction(chart: BlueprintChart): number {
  const i = chart.interactions;
  return i.stem_clash.length + i.branch_clash.length + i.branch_harm.length
    + i.branch_break.length + i.branch_punish.length;
}

function totalInteractionHarmony(chart: BlueprintChart): number {
  const i = chart.interactions;
  return i.stem_combine.length + i.branch_six_combine.length + i.branch_three_combine.length;
}

function hasSal(chart: BlueprintChart, ...names: string[]): boolean {
  return chart.sal.some((s) => names.includes(s.name));
}

export function computeIndicators(chart: BlueprintChart): Indicators {
  const groups = countTenGodGroups(chart);
  const friction = totalInteractionFriction(chart);
  const harmony = totalInteractionHarmony(chart);
  const elementsTotal = Object.values(chart.elements).reduce((a, b) => a + b, 0) || 1;
  const waterRatio = chart.elements["水"] / elementsTotal;
  const supportRatio = chart.strength.ratio_support; // 0~1, 신강할수록 큼

  // 축적력 — 인성(자원을 쌓는 힘) + 정재(안정적 재물) 비중, 신강도가 과하지 않은 안정 구간일수록 가점
  const accumulation = clamp(
    40 + groups["인성"] * 10 + groups["재성"] * 6
      + (supportRatio >= 0.45 && supportRatio <= 0.62 ? 10 : 0)
      - friction * 4
  );

  // 확장력 — 식상(생산·표출) 비중이 핵심. 식상이 아예 없으면 크게 감점(이 지표의 존재 이유)
  const expansion = clamp(
    30 + groups["식상"] * 16 + harmony * 4
      - (groups["식상"] === 0 ? 15 : 0)
  );

  // 지구력 — 신강도(버티는 원천)와 인성+비겁 비중, 형충이 적을수록 가점
  const endurance = clamp(
    35 + supportRatio * 50 + (groups["비겁"] + groups["인성"]) * 4 - friction * 3
  );

  // 연결력 — 식상+관성(사회적 접점을 만드는 오성)과 합의 수. 충이 많으면 관계가 자꾸 끊긴다
  const connection = clamp(
    40 + (groups["식상"] + groups["관성"]) * 8 + harmony * 6 - friction * 5
  );

  // 회복력 — 수(水) 비중이 가장 직접적인 근거(오행상 회복·유통의 기운). 양인·백호처럼 소진이 큰 살은 감점
  const recovery = clamp(
    30 + waterRatio * 150 + groups["인성"] * 5
      - (hasSal(chart, "양인살", "백호살") ? 10 : 0)
  );

  // 변동성 — 충형파해 총량 + 양인/괴강/역마 같은 변동성 큰 살의 존재
  const volatility = clamp(
    30 + friction * 10
      + (hasSal(chart, "양인살") ? 12 : 0)
      + (hasSal(chart, "괴강살") ? 10 : 0)
      + (hasSal(chart, "역마살") ? 8 : 0)
  );

  return { accumulation, expansion, endurance, connection, recovery, volatility };
}
