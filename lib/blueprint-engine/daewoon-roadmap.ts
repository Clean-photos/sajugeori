/**
 * daewoon-roadmap.ts — 대운 9구간을 용신·기신 기준으로 판정한 로드맵.
 *
 * §2-4(CoS+CEO 실물 확인, 2026-09-08): 질문 s6("평생 대운은 어떻게 흘러가는가?")
 * 이 정작 시기를 답하지 않았다 — 원인은 LLM에게 넘기는 사실 시트가 "현재 대운"
 * 한 구간만 담고 나머지 8구간(precise_daewoon.list에는 이미 있음)을 아예 안
 * 줬기 때문이다. 결과적으로 본문이 "32~41세만 유일한 황금 창"이라 쓴 반면,
 * 실제 로드맵은 22~51세가 연속 보강 구간이었다(실측 불일치).
 *
 * 이 모듈은 순수 판정 함수라 LLM 프롬프트(anchor.ts)와 화면 시각화
 * (BlueprintReportView.tsx) 양쪽이 **같은 함수**를 불러 쓴다 — 서술과 그림이
 * 서로 다른 근거로 각자 계산하면 이번 사고가 그대로 재발한다.
 *
 * 계산 엔진 무접촉 — lib/saju-engine의 STEM_ELEMENT/BRANCH_ELEMENT 표만 읽는다.
 */
import * as C from "@/lib/saju-engine/constants";
import type { Element, Stem, Branch } from "@/lib/saju-engine/constants";
import type { PreciseDaewoonEntry } from "./engine";

export type DaewoonPhase = "boost" | "drain" | "mixed" | "neutral";

export const DAEWOON_PHASE_LABEL: Record<DaewoonPhase, string> = {
  boost: "보강기",
  drain: "소진기",
  mixed: "혼재",
  neutral: "완만",
};

export interface DaewoonRoadmapEntry {
  index: number;
  start_age: number;
  end_age: number;
  ganji: string;
  stemElement: Element;
  branchElement: Element;
  phase: DaewoonPhase;
  phaseLabel: string;
  /** 지금 속한 구간인가 — facts.daewoonNow와 간지로 대조한다 */
  isCurrent: boolean;
}

/**
 * 천간·지지 각각을 용신/기신 중 어디에 속하는지 보고 판정한다.
 *   둘 다 용신 → 보강기 / 둘 다 기신 → 소진기
 *   하나씩 갈리면 → 혼재 / 나머지(용신·기신 어디에도 없으면) → 완만
 * 하나만 용신이고 나머지 하나가 중립이면 보강 쪽으로, 하나만 기신이고
 * 나머지가 중립이면 소진 쪽으로 본다(둘 다 중립일 때만 "완만").
 */
function classifyPhase(stemEl: Element, branchEl: Element, yongsin: Element[], gisin: Element[]): DaewoonPhase {
  const side = (el: Element): "y" | "g" | "n" => (yongsin.includes(el) ? "y" : gisin.includes(el) ? "g" : "n");
  const s = side(stemEl);
  const b = side(branchEl);
  if (s === "y" && b === "y") return "boost";
  if (s === "g" && b === "g") return "drain";
  if ((s === "y" && b === "g") || (s === "g" && b === "y")) return "mixed";
  if (s === "y" || b === "y") return "boost";
  if (s === "g" || b === "g") return "drain";
  return "neutral";
}

export function buildDaewoonRoadmap(
  list: PreciseDaewoonEntry[],
  yongsin: Element[],
  gisin: Element[],
  currentGanji: string | null
): DaewoonRoadmapEntry[] {
  return list.map((d) => {
    const stemElement = C.STEM_ELEMENT[d.stem as Stem];
    const branchElement = C.BRANCH_ELEMENT[d.branch as Branch];
    const phase = classifyPhase(stemElement, branchElement, yongsin, gisin);
    return {
      index: d.index,
      start_age: d.start_age,
      end_age: d.end_age,
      ganji: d.ganji,
      stemElement,
      branchElement,
      phase,
      phaseLabel: DAEWOON_PHASE_LABEL[phase],
      isCurrent: currentGanji !== null && d.ganji === currentGanji,
    };
  });
}

/** LLM 프롬프트에 그대로 붙일 수 있는 구간별 한 줄 목록. */
export function daewoonRoadmapPromptText(roadmap: DaewoonRoadmapEntry[]): string {
  return roadmap
    .map((d) => `${d.start_age}~${d.end_age}세 ${d.ganji}(${d.stemElement}·${d.branchElement}) — ${d.phaseLabel}${d.isCurrent ? " ← 현재" : ""}`)
    .join("\n");
}
