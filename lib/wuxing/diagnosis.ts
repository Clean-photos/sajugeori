/**
 * diagnosis.ts — 한 줄 진단 골격 (§10-5, docs/wuxing_seun_diagnosis_banner_v1.md §2).
 *
 * 굵은 한 줄(헤드라인)은 유형 4가지로 코드가 고정한다. **LLM은 보충 2문장만** 쓴다 —
 * 1문장은 명식 근거(오행 개수·월지·일간), 2문장은 B층 관계가 이 사람에게 무엇을
 * 뜻하는지. 헤드라인까지 LLM에 맡기면 범용 문장이 나올 위험이 크고(§2-1 "해당 명식
 * 고유일 것" 요구와 충돌), 오행 이름을 잘못 채울 여지도 생긴다.
 *
 * 이 모듈은 헤드라인 문자열과, LLM 프롬프트에 그대로 주입할 수 있는 근거 facts만
 * 만든다. 실제 LLM 호출은 렌더 단계(리포트 생성 라우트)의 몫이다.
 *
 * 계산 엔진 무접촉(하드룰 1).
 */
import * as C from "@/lib/saju-engine/constants";
import type { Element } from "@/lib/saju-engine/constants";
import type { SajuChart } from "@/lib/saju-engine/engine";
import { type Classification } from "./classify";
import { countElements, isHiddenOnly } from "./count";
import { buildRelationDisplayBlock, type RelationDisplayBlock } from "./relation";
import { josaIga, josaWaGwa, josaEunNeun } from "./josa";

export type DiagnosisPattern = "scarce1" | "biased2" | "extreme" | "balanced";

export interface DiagnosisSkeleton {
  pattern: DiagnosisPattern;
  /** 굵은 한 줄. 별표(**) 마크다운 강조를 그대로 포함한다 — 렌더에서 굵게 처리 */
  headline: string;
  /**
   * LLM이 1문장(명식 근거)을 쓸 때 참고할 사실 목록. 오행 개수·월지·일간을 그대로
   * 문장으로 인용할 수 있게 짧은 완성 문구로 낸다 — 숫자만 던지면 LLM이 재계산하다
   * 틀릴 여지가 생긴다.
   */
  facts: string[];
  /**
   * LLM이 2문장(B층 관계)을 쓸 때 참고할 관계 정보. 부족 오행이 없는 균형형에서는
   * null이다 — 이때 2문장은 "채우기보다 지금 균형을 지키는 쪽"처럼 다르게 써야 한다.
   *
   * B층 노출 방식 A안(CEO 확정 2026-08-31) 이후: relation.json의 5블록 자체는 이미
   * 리포트에 존댓말 그대로 노출되므로(§③ 본체), 여기서는 **그 블록과 겹치지 않는
   * 짧은 연결 문장**을 쓰는 데 필요한 만큼만 참고자료로 넘긴다. buildRelationDisplayBlock()을
   * 거치므로 writerNote는 구조적으로 포함될 수 없다.
   */
  relation: RelationDisplayBlock | null;
}

function elKr(el: Element): string {
  return `${el}(${C.ELEMENT_KR[el]})`;
}

/**
 * 헤드라인 4유형 (§2-2 골격 그대로):
 *   부족 1개    **[X]가 넘치고 [L]가 비어 있는 사주**
 *   부족 2개    **[L1]와 [L2] 두 자리가 비어 있는 사주**   (편중형)
 *   극단형      **[X] 하나로 강하게 모인 사주**
 *   부족 없음   **다섯 기운이 고르게 갖춰진 사주**
 *
 * 극단형이 최우선으로 갈린다 — 표면 5개 이상인 오행은 부족 판정 자체가 무의미해지는
 * 구조라 classify.ts에서도 극단형이 다른 판정을 덮어쓴다.
 */
export function buildDiagnosis(chart: SajuChart, cls: Classification): DiagnosisSkeleton {
  const count = countElements(chart);

  if (cls.pattern === "extreme" && cls.dominant) {
    return {
      pattern: "extreme",
      headline: `**${elKr(cls.dominant)} 하나로 강하게 모인 사주**`,
      facts: buildFacts(chart, count, [cls.dominant]),
      relation: buildRelationDisplayBlock(chart.day_master_element, cls.dominant),
    };
  }

  // 편중형(classify.ts 기준 — 표면 부재 오행 2개 이상) — primary·secondary는 이미
  // §3-③ 우선순위(조후→유통→인성)로 정해져 있으므로 그대로 쓴다. absent[0]/absent[1]을
  // 그냥 집지 않는 이유: primary가 그 규칙으로 골라낸 "먼저 다뤄야 할" 오행이고, 세운
  // 처방·B층 관계도 전부 이 primary를 축으로 삼는다 — 헤드라인만 다른 오행을 짚으면
  // 리포트 전체의 서사가 어긋난다.
  if (cls.pattern === "biased" && cls.primary) {
    const L1 = cls.primary;
    const L2 = cls.secondary[0] ?? cls.absent.find((el) => el !== L1) ?? cls.absent[0];
    return {
      pattern: "biased2",
      headline: `**${elKr(L1)}${josaWaGwa(L1)} ${elKr(L2)} 두 자리가 비어 있는 사주**`,
      facts: buildFacts(chart, count, [L1, L2, ...cls.absent.filter((el) => el !== L1 && el !== L2)]),
      relation: buildRelationDisplayBlock(chart.day_master_element, L1),
    };
  }

  // 부족이 없는 균형형 — primary가 null이면 채울 것 자체가 없다는 뜻이다
  if (!cls.primary) {
    return {
      pattern: "balanced",
      headline: "**다섯 기운이 고르게 갖춰진 사주**",
      facts: buildFacts(chart, count, []),
      relation: null,
    };
  }

  // 부족 1개(또는 균형형 안에서 §3-③으로 대표 하나를 고른 경우) — 과다 오행이 따로
  // 없으면(§3-⑤가 다루는 "부족은 있지만 과다는 없는" 사주) "넘치고"를 붙이지 않는다
  const L = cls.primary;
  const X = cls.excessive[0] ?? null;
  // §1(CEO 결정 2026-09-05, 실물 확인): classify.ts는 absent(표면 0개)가 없으면
  // scarce(표면 1개)에서 primary를 고른다 — 그런데 여기서는 두 경우 모두 "비어
  // 있는"으로 썼다. 실측 31.8%(부재 없는 사주)가 "木이 비어 있는 사주"라는 제목을
  // 받으면서 바로 아래 분포표·본문엔 "木 1개"가 보인다 — 첫 줄부터 자기 명식과
  // 어긋나는 문장을 보는 것. 진짜 부재(0개)일 때만 "비어 있는", 1개면 "가장 적은".
  const Lcount = count.surface[L];
  const Ltail = Lcount === 0 ? "비어 있는" : "가장 적은";
  const headline = X
    ? `**${elKr(X)}${josaIga(X)} 넘치고 ${elKr(L)}${josaIga(L)} ${Ltail} 사주**`
    : `**${elKr(L)}${josaIga(L)} ${Ltail} 사주**`;
  return {
    pattern: "scarce1",
    headline,
    facts: buildFacts(chart, count, X ? [X, L] : [L]),
    relation: buildRelationDisplayBlock(chart.day_master_element, L),
  };
}

function buildFacts(chart: SajuChart, count: ReturnType<typeof countElements>, highlight: Element[]): string[] {
  const facts: string[] = [];
  const charCount = count.charCount;
  const monthBranch = chart.pillars.month.branch;

  for (const el of highlight) {
    const n = count.surface[el];
    const eun = josaEunNeun(el);
    if (n === 0 && isHiddenOnly(count, el)) {
      const h = count.hidden[el][0];
      facts.push(
        `${elKr(el)}${eun} 여덟 글자 중 표면에는 없지만 ${h.branchKr}(${h.branch}) 지지 안에 ${h.stemKr}(${h.stem})이 숨어 있다`
      );
    } else if (n === 0) {
      facts.push(`${elKr(el)}${eun} 표면·지장간 어디에도 없다(완전 부재)`);
    } else {
      facts.push(`${elKr(el)}${eun} ${charCount}글자 중 ${n}개다`);
    }
  }

  facts.push(`월지는 ${C.BRANCH_KR[monthBranch]}(${monthBranch})다`);
  facts.push(`일간은 ${chart.day_master}(${C.STEM_KR[chart.day_master]}) — ${chart.day_master_element}(${C.ELEMENT_KR[chart.day_master_element]}) 오행이다`);
  facts.push(`일간 강약은 ${chart.strength.verdict}이다`);
  if (!chart.has_hour) facts.push("출생 시간을 몰라 여섯 글자만으로 판정했다(시주 두 글자가 비어 정밀도가 떨어질 수 있다)");

  return facts;
}
