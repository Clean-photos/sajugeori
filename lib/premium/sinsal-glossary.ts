/**
 * sinsal-glossary.ts — 살풀이 리포트가 LLM에 "정답 한자·정의"를 박아 넣기 위한
 * 조회 테이블. QA(2026-09-05) B-2·B-4에서 실측된 문제: 엔진(lib/saju-engine)은
 * 신살을 한글 이름으로만 검출하고 한자는 안 준다. 살풀이는 4개 섹션을 독립
 * 병렬 LLM 호출로 만드는데(salpuri-generate.ts), 각 호출이 한자·정의를 각자
 * "알아서" 채우다 보니 같은 살이 호출마다 다른 한자(寡宿殺 vs 孤宿殺)·다른
 * 문장으로 네 번 따로 정의되는 사고가 났다.
 *
 * 이미 검증된 한자·정의가 있는 곳(app/dictionary/terms.ts, sinsal 카테고리
 * 13종 전부 포함)을 그대로 재사용한다 — 새로 검증할 필요 없이, 프롬프트에
 * "정답"으로 박아 넣고 그대로 쓰라고 지시하면 된다. 계산 엔진은 건드리지 않는다
 * (한글 이름 검출 로직은 그대로, 여기서는 표시용 한자만 얹는다).
 */
import { TERMS } from "@/app/dictionary/terms";

const SINSAL_HANJA: Record<string, string> = Object.fromEntries(
  TERMS.filter((t) => t.category === "sinsal" && t.hanja).map((t) => [t.term, t.hanja as string])
);

/** 신살 이름의 검증된 한자. 백과에 없는 이름이면 null(그때는 한자 없이 이름만 쓰게 한다). */
export function sinsalHanja(name: string): string | null {
  return SINSAL_HANJA[name] ?? null;
}

/**
 * 검출된 신살 목록에 한자를 붙인 프롬프트용 참조 블록을 만든다.
 * meaning은 엔진이 이미 주는 짧은 뜻풀이(lib/saju-engine/constants.ts SAL_MEANING)
 * 그대로 쓴다 — 새 정의를 만들지 않는다.
 */
export function buildSinsalReferenceBlock(entries: [string, { meaning: string }][]): string {
  return entries
    .map(([name, v]) => {
      const hanja = sinsalHanja(name);
      return `- ${name}${hanja ? `(${hanja})` : ""}: ${v.meaning}`;
    })
    .join("\n");
}

/** 4주 자리 정의 — 부수·부위 표기가 섹션마다 달라지지 않도록 고정 문구로 둔다. */
export const PILLAR_POSITION_NOTE =
  "자리 정의(고정, 다르게 쓰지 말 것): 연지=조상·초년, 월지=부모·사회활동, 일지=태어난 날의 지지(배우자·본인), 시지=자식·말년.";
