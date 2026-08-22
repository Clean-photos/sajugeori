import { Fragment, type ReactNode } from "react";

/**
 * 유료 리포트 본문 렌더러 (6종 공용: 사주·궁합·살풀이·택일·연운세·펫).
 *
 * LLM은 마크다운 없이 순수 텍스트로만 답하도록 지시받는다(프롬프트 COMMON_RULES).
 * 그래서 강조·구조는 프롬프트가 아니라 이 렌더링 단계에서 붙인다 — 프롬프트를
 * 건드리지 않으므로 이미 생성돼 캐시된 리포트에도 그대로 적용되고, 재생성 비용이 없다.
 *
 * 처리하는 것 세 가지:
 *  1) 문단  — 줄 단위로 끊어 <p>로 렌더하고 문단 간 여백을 준다.
 *  2) 제목  — 【 제목 】 줄은 기호를 떼고 브랜드 컬러 + 우측 hairline으로.
 *  3) 강조  — "일간(日干, 설명)" 패턴에서 한글 용어만 굵게, 괄호 설명은 작고 흐리게.
 *             highlight로 넘긴 단어(예: 실제 검출된 살 이름)는 Copper로 한 단계 더 강조.
 */

// "일간(日干, 나 자신을 상징하는 글자)" / "경(庚, 단단한 금속의 기운)" 같은 패턴.
// 앞이 한글이어야 하므로 "土(토)"처럼 한자(한글) 조합은 건드리지 않는다.
const TERM_RE = /([가-힣]{1,8})\(([一-鿿]{1,6})(,\s*[^)]*)?\)/g;

const BRAND = "#1F3D34";
// brandAccent(#C8743A)는 아이보리 배경 위 본문 크기에서 대비가 약해, 홈 헤더와 같은
// 한 단계 어두운 Copper를 쓴다.
const COPPER = "#9C5220";

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 일반 텍스트 조각에서 highlight 단어(괄호 표기가 없는 맨 언급)를 굵게. */
function markHighlights(str: string, highlight: string[], keyBase: string): ReactNode[] {
  if (highlight.length === 0 || !str) return [str];
  const re = new RegExp(`(${highlight.map(escapeRe).join("|")})`, "g");
  return str.split(re).map((part, i) =>
    highlight.includes(part) ? (
      <b key={`${keyBase}-h${i}`} className="font-semibold" style={{ color: COPPER }}>
        {part}
      </b>
    ) : (
      <Fragment key={`${keyBase}-t${i}`}>{part}</Fragment>
    )
  );
}

function renderInline(text: string, highlight: string[], keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = new RegExp(TERM_RE.source, "g");
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(...markHighlights(text.slice(last, m.index), highlight, `${keyBase}-p${n}`));
    }
    const [full, term, hanja, desc] = m;
    const isKey = highlight.includes(term);
    nodes.push(
      <Fragment key={`${keyBase}-w${n}`}>
        <b className="font-semibold" style={{ color: isKey ? COPPER : BRAND }}>
          {term}
        </b>
        <span className="text-[0.9em]" style={{ color: "#6B6661" }}>
          ({hanja}
          {desc ?? ""})
        </span>
      </Fragment>
    );
    last = m.index + full.length;
    n++;
  }

  if (last < text.length) {
    nodes.push(...markHighlights(text.slice(last), highlight, `${keyBase}-p${n}`));
  }
  return nodes;
}

export function ReportBody({
  text,
  highlight = [],
}: {
  text: string;
  /** 이 리포트의 주인공 키워드(예: 실제 검출된 살 이름). 본문에서 Copper로 강조된다. */
  highlight?: string[];
}) {
  // 긴 단어가 짧은 단어를 가리지 않도록 길이 내림차순으로 매칭한다.
  const terms = [...new Set(highlight.filter(Boolean))].sort((a, b) => b.length - a.length);

  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  return (
    <div className="text-base" style={{ color: "#1A1A18" }}>
      {lines.map((line, i) => {
        const heading = line.match(/^【\s*(.+?)\s*】\s*(.*)$/);
        if (heading) {
          return (
            <Fragment key={i}>
              <div className="flex items-center gap-2.5 mt-6 first:mt-0 mb-3 break-after-avoid">
                <span
                  className="text-[13px] font-semibold tracking-wide whitespace-nowrap"
                  style={{ color: BRAND }}
                >
                  {heading[1]}
                </span>
                <span className="flex-1 h-px" style={{ backgroundColor: "#E5DFD4" }} />
              </div>
              {heading[2] && (
                <p className="leading-[1.85] mb-3.5 last:mb-0">
                  {renderInline(heading[2], terms, `h${i}`)}
                </p>
              )}
            </Fragment>
          );
        }
        return (
          <p key={i} className="leading-[1.85] mb-3.5 last:mb-0">
            {renderInline(line, terms, `p${i}`)}
          </p>
        );
      })}
    </div>
  );
}
