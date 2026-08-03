// 조견표 데이터 — 사주 계산 엔진으로 산출한다.
// 손으로 만들기 어려운 표를 엔진으로 생성해, 다른 곳에서 그대로 찾기 어려운 자료를 제공한다.

import { calcYearPillar, checkSamjae } from "@/lib/saju-engine";
import * as C from "@/lib/saju-engine/constants";
import type { Branch } from "@/lib/saju-engine/constants";

/** 열두 띠 (지지 순서: 자축인묘…) */
export const ZODIACS: { branch: Branch; kr: string; animal: string }[] = [
  { branch: "子", kr: "자", animal: "쥐" },
  { branch: "丑", kr: "축", animal: "소" },
  { branch: "寅", kr: "인", animal: "호랑이" },
  { branch: "卯", kr: "묘", animal: "토끼" },
  { branch: "辰", kr: "진", animal: "용" },
  { branch: "巳", kr: "사", animal: "뱀" },
  { branch: "午", kr: "오", animal: "말" },
  { branch: "未", kr: "미", animal: "양" },
  { branch: "申", kr: "신", animal: "원숭이" },
  { branch: "酉", kr: "유", animal: "닭" },
  { branch: "戌", kr: "술", animal: "개" },
  { branch: "亥", kr: "해", animal: "돼지" },
];

/** 해당 연도의 간지. 절기(입춘) 이후 기준이라 6월 15일로 계산한다. */
export function yearGanji(year: number) {
  const p = calcYearPillar(year, 6, 15);
  return {
    stem: p.stem,
    branch: p.branch,
    ganji: `${p.stem}${p.branch}`,
    kr: `${C.STEM_KR[p.stem]}${C.BRANCH_KR[p.branch]}`,
    animal: ZODIACS.find((z) => z.branch === p.branch)?.animal ?? "",
    element: C.ELEMENT_KR[C.STEM_ELEMENT[p.stem]],
  };
}

/** 출생 연도별 간지·띠 조견표 */
export function ganjiTable(from: number, to: number) {
  const rows = [];
  for (let y = from; y <= to; y++) rows.push({ year: y, ...yearGanji(y) });
  return rows;
}

/** 특정 연도에 삼재가 드는 띠 목록 (단계별) */
export function samjaeOfYear(year: number) {
  return ZODIACS.map((z) => ({ ...z, ...checkSamjae(z.branch, year) })).filter((r) => r.isSamjae);
}

/** 띠별 앞으로의 삼재 주기 — 각 띠가 언제 삼재를 맞는지 */
export function samjaeCycles(fromYear: number, count = 3) {
  return ZODIACS.map((z) => {
    const cycles: { years: number[] }[] = [];
    let y = fromYear;
    // 삼재 시작 해(들삼재)를 앞에서부터 찾아 나간다
    while (cycles.length < count && y < fromYear + 40) {
      const r = checkSamjae(z.branch, y);
      if (r.isSamjae && r.years[0] >= fromYear - 2) {
        if (!cycles.some((c) => c.years[0] === r.years[0])) cycles.push({ years: r.years });
        y = r.years[2] + 1;
        continue;
      }
      if (!r.isSamjae && r.nextStartYear) {
        y = r.nextStartYear;
        continue;
      }
      y++;
    }
    return { ...z, cycles };
  });
}

/** 입춘 무렵 태생은 띠가 갈린다 — 연도별 경계 안내용 */
export function ipchunNote(year: number) {
  const before = calcYearPillar(year, 1, 15); // 입춘 전
  const after = calcYearPillar(year, 3, 15);  // 입춘 후
  return {
    year,
    beforeGanji: `${before.stem}${before.branch}`,
    beforeAnimal: ZODIACS.find((z) => z.branch === before.branch)?.animal ?? "",
    afterGanji: `${after.stem}${after.branch}`,
    afterAnimal: ZODIACS.find((z) => z.branch === after.branch)?.animal ?? "",
    differs: before.branch !== after.branch,
  };
}
