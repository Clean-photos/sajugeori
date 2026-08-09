/**
 * prompts.ts — 스펙 3장(6블록 질문 응답) + ①총론 + ⑦조언5 프롬프트.
 * 모든 호출에 anchor.ts의 사실 시트를 동일하게 주입해 축 간 모순을 막는다.
 */
import { anchorFactsToPromptText, type AnchorFacts, type AnchorNarrative } from "./anchor";
import type { AxisDef } from "./questions";

const COMMON_RULES = `
규칙(전부 필수):
- 사실 시트에 없는 오행·십성·합충·신살을 지어내지 말 것.
- 질병·사망·이혼·파산 단정, 공포 조장, 부적·굿 유도, 외모·재산 비하, 바넘 문장("노력하면 좋아집니다" 류) 금지.
- 챕터·질문 서술에 "OO운" 형식(금전운·연애운 등)을 쓰지 말 것 — 질문에 직접 답하는 문장으로 쓸 것.
- 한국어. 마크다운 금지(#, **, - 등). 한자는 한글 독음 병기(예: 庚(경)).
- JSON 외 텍스트 금지.`;

export function buildOverviewPrompt(facts: AnchorFacts, narrative: AnchorNarrative): string {
  return `당신은 명리학 데이터 분석가입니다. 아래 사실 시트와 이미 확정된 구조적 제약·지렛대를
근거로 이 사주의 "운명총론"을 씁니다. 역술 상담 원고가 아니라, 데이터가 결론부터 답하는
진단문입니다.

${anchorFactsToPromptText(facts)}

구조적 제약: ${narrative.constraints.join(" / ")}
지렛대: ${narrative.leverages.join(" / ")}

다음 JSON으로만 응답하세요:
{
  "headline": "굵게 강조할 한 줄 정의. '~하고 ~한 운명' 형식. 이 사주 고유의 표현이어야 하며, 다른 명식에도 그대로 붙는 범용 문장이면 실패로 간주됩니다.",
  "body": "4문장. 1문장: 전체 설계 요약. 2문장: 명식 근거(오행·십성 수치 포함). 3문장: 실생활에서의 발현. 4문장: 이 설계도의 핵심 과제와 네 개의 축(생계·관계·신체·공간과 시간)으로의 연결. 반드시 '이 운명은'으로 시작할 것."
}
${COMMON_RULES}`;
}

export function buildAxisPrompt(axis: AxisDef, facts: AnchorFacts, narrative: AnchorNarrative): string {
  const qList = axis.questions.map((q, i) => `Q${i + 1} (id=${q.id}). "${q.q}"`).join("\n");
  return `당신은 명리학 데이터 분석가입니다. "${axis.title}" 축의 질문 6개에 아래 사실 시트만
근거로 답합니다. 질문 하나당 반드시 6개 필드(판정·근거강도·수치·왜·장면·반증·처방)를 전부
채우세요 — 반증을 생략하면 그 항목은 실패로 처리됩니다.

${anchorFactsToPromptText(facts)}

구조적 제약: ${narrative.constraints.join(" / ")}
지렛대: ${narrative.leverages.join(" / ")}

질문 목록:
${qList}

각 질문에 대해 다음 형식을 지키세요:
- verdict: 한 줄 결론
- evidenceGrade: "A"(엔진 계산값에서 직접 도출) | "B"(계산값+표준 해석 결합) | "C"(발현 형태 추정). 6문항 중 A는 최대 2개로 제한(전부 A로 달면 신뢰를 잃습니다).
- metrics: 이 판정과 관련된 사실 시트의 구체 수치를 인용(오행 개수, 지표 점수 등 최소 2개)
- why: 명식의 어느 글자·구조 때문인지, 간지를 실명으로 인용해 설명
- scenes: 실제로 이렇게 나타난다 — 구체 상황 2~3개(배열)
- counterEvidence: 이 판정이 빗나가는 조건. 반드시 채울 것(생략 불가)
- actions: 오늘부터 할 수 있는 것 1~3개(배열)

다음 JSON으로만 응답하세요:
{
  "questions": [
    { "id": "${axis.questions[0].id}", "verdict": "...", "evidenceGrade": "A", "metrics": "...", "why": "...", "scenes": ["...","..."], "counterEvidence": "...", "actions": ["..."] }
  ]
}
(questions 배열에 6개 전부 순서대로 넣을 것)
${COMMON_RULES}`;
}

export function buildClosingPrompt(
  facts: AnchorFacts,
  narrative: AnchorNarrative,
  axisSummaries: { title: string; verdicts: string[] }[]
): string {
  const axisText = axisSummaries
    .map((a) => `[${a.title}]\n${a.verdicts.map((v) => `- ${v}`).join("\n")}`)
    .join("\n\n");

  return `당신은 명리학 데이터 분석가입니다. 앞서 4개 축에서 나온 판정을 바탕으로
"운명 실행 설계"와 "운명 설계 위에 인생을 쌓을 때 잊지 말아야 할 조언 5"를 씁니다.

${anchorFactsToPromptText(facts)}

구조적 제약: ${narrative.constraints.join(" / ")}
지렛대: ${narrative.leverages.join(" / ")}

앞선 4개 축의 판정 요약:
${axisText}

다음 JSON으로만 응답하세요:
{
  "keep": ["유지할 것 1", "유지할 것 2", "유지할 것 3"],
  "stop": ["중단할 것 1", "중단할 것 2", "중단할 것 3"],
  "start": ["신설할 것 1", "신설할 것 2", "신설할 것 3"],
  "recheckPoints": ["재점검 시점 1(연도나 나이 명시)", "재점검 시점 2", "재점검 시점 3"],
  "advice": [
    "하나. 굵은 제목 한 줄 + 3~4문장. 위 축 판정에서 도출할 것, 일반론 금지.",
    "둘. ...",
    "셋. ...",
    "넷. ...",
    "다섯. 반드시 '이 리포트보다 당신의 실제 삶이 상위 근거'라는 취지로 마무리."
  ]
}

규칙:
- keep/stop/start는 각 3개, 측정 가능한 구체 행동으로 쓸 것(추상적 조언 금지).
- advice는 정확히 5개. 최소 3개 항목에 앞선 축의 수치·구조(지표 점수, 오행 개수, 대운 나이 등)를 명시적으로 재인용할 것.
- advice의 톤은 위로·격려조로 흐르지 말 것 — 냉정한 진단 톤을 유지.
- advice 중 다른 명식에 그대로 붙는 범용 문장이 하나라도 있으면 안 됨.
${COMMON_RULES}`;
}
