/**
 * questions.ts — 스펙 2~3장의 질문 24개(축당 6개) 정의.
 * 문항 문구는 스펙 3장 "질문 배치" 목록을 그대로 따른다.
 */
export interface AxisDef {
  id: "wealth" | "relationship" | "body" | "space_time";
  title: string;          // "운명의 축 N. ..." 의 뒷부분
  subtitle: string;
  questions: { id: string; q: string }[];
}

export const AXES: AxisDef[] = [
  {
    id: "wealth",
    title: "생계 엔진 — 버는 구조와 일하는 구조",
    subtitle: "돈과 일을 하나의 엔진으로 다룬다",
    questions: [
      { id: "w1", q: "나는 돈을 어떻게 버는 사람인가?" },
      { id: "w2", q: "큰돈이 가능한 구조인가, 먹고사는 구조인가?" },
      { id: "w3", q: "내 돈은 어디서 새는가?" },
      { id: "w4", q: "조직인가, 독립인가?" },
      { id: "w5", q: "커리어는 언제 피는가?" },
      { id: "w6", q: "확장의 한계선은 어디인가?" },
    ],
  },
  {
    id: "relationship",
    title: "관계 회로 — 짝·가족·사람",
    subtitle: "연애·결혼·가족을 하나의 회로로 다룬다",
    questions: [
      { id: "r1", q: "어떤 사람에게 끌리는가?" },
      { id: "r2", q: "관계에서 반복되는 실패 지점은 어디인가?" },
      { id: "r3", q: "결혼에 유리한 구조인가?" },
      { id: "r4", q: "잘 맞는 상대 / 피할 상대의 조건은?" },
      { id: "r5", q: "가족 관계에서 부담이 되는 지점은?" },
      { id: "r6", q: "사람을 보는 눈은 정확한 편인가?" },
    ],
  },
  {
    id: "body",
    title: "신체 리듬 — 몸과 회복",
    subtitle: "의학적 진단이 아니라 생활 관리 참고",
    questions: [
      { id: "b1", q: "몸에서 어디가 먼저 신호를 보내는가?" },
      { id: "b2", q: "스트레스가 몸에서 어떻게 드러나는가?" },
      { id: "b3", q: "무너지기 전 전조는 무엇인가?" },
      { id: "b4", q: "어떻게 회복하는 사람인가?" },
      { id: "b5", q: "특별히 주의해야 할 시기는 언제인가?" },
      { id: "b6", q: "평생 유지해야 할 습관은 무엇인가?" },
    ],
  },
  {
    id: "space_time",
    title: "공간과 시간",
    subtitle: "방위·환경, 그리고 대운·연도 타임라인",
    questions: [
      { id: "s1", q: "나에게 유리한 방위는 어디인가?" },
      { id: "s2", q: "이사·이동은 지금 판단해도 되는가?" },
      { id: "s3", q: "지금 대운은 어떤 성격의 10년인가?" },
      { id: "s4", q: "향후 3년은 어떤 흐름인가?" },
      { id: "s5", q: "체감과 실제가 어긋나는 구간은 언제인가?" },
      { id: "s6", q: "평생 대운은 어떻게 흘러가는가?" },
    ],
  },
];

export interface QABlock {
  id: string;
  question: string;
  verdict: string;      // 판정 — 한 줄 결론
  evidenceGrade: "A" | "B" | "C";
  metrics: string;       // 수치 — 관련 지표·표
  why: string;           // 왜 — 명식 근거
  scenes: string[];      // 장면 — 구체 상황 2~3개
  counterEvidence: string; // 반증 — 필수
  actions: string[];     // 처방 — 1~3개
}
