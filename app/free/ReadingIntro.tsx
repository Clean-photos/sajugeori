import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";

export interface IntroSection {
  heading: string;
  paragraphs: string[];
}

export interface RelatedTerm {
  slug: string;
  label: string;
}

/**
 * 무료 운세 입력 페이지 하단에 붙는 정보성 설명 블록.
 * 크롤러가 보는 SSR HTML에 실제 콘텐츠를 제공해 thin-content를 방지한다.
 * (입력 폼 페이지가 form 스텝을 초기 렌더하므로 이 블록은 초기 HTML에 포함된다.)
 */
export function ReadingIntro({
  lead,
  sections,
  related,
}: {
  lead: string;
  sections: IntroSection[];
  related?: RelatedTerm[];
}) {
  return (
    <section className="px-5 pb-10 pt-2 flex flex-col gap-5 border-t border-[#E5DFD4] mt-4">
      <p className="text-[15px] text-[#1A1A18] leading-[1.85] pt-5">{lead}</p>

      {sections.map((s, i) => (
        <div key={i} className="flex flex-col gap-2">
          <h2 className="font-serif text-lg font-bold text-[#1F3D34]">{s.heading}</h2>
          {s.paragraphs.map((p, j) => (
            <p key={j} className="text-[15px] text-[#1A1A18] leading-[1.85]">{p}</p>
          ))}
        </div>
      ))}

      {related && related.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          <h2 className="font-serif text-lg font-bold text-[#1F3D34]">관련 용어 더 알아보기</h2>
          <div className="flex flex-wrap gap-2">
            {related.map((t) => (
              <Link
                key={t.slug}
                href={`/dictionary/${t.slug}`}
                className="text-sm text-[#1F3D34] bg-[#FBF8F2] border border-[#E5DFD4] rounded-full px-3.5 py-1.5 active:opacity-60"
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#C8743A]/8 border border-[#C8743A]/25 rounded-2xl p-4 text-xs text-[#6B6661] leading-relaxed mt-1">
        본 서비스가 제공하는 사주·운세 콘텐츠는 오락 및 참고 목적으로만 제공되며,
        법률·의료·재정 등 어떠한 전문적 자문도 대체하지 않습니다.
        중요한 결정은 해당 분야 전문가와 상담하시기 바랍니다.
      </div>

      {/* 입력 폼 페이지에서도 읽을거리·용어 백과 등으로 이동할 수 있도록 공통 푸터를 둔다 */}
      <div className="-mx-5">
        <SiteFooter />
      </div>
    </section>
  );
}
