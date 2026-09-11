// 리포트 최상위 섹션 제목 공용 컴포넌트.
//
// U1(CEO 지시, 2026-09-08 · CoS 실물 재검증 2026-09-10): 제목 크기는 먼저
// 키웠으나("채우는 법" 등 여러 곳이 그냥 <h2 className="...text-lg...">여서)
// "제목 옆 가로선을 더 굵게"는 반영되지 않은 채 남아 있었다 — LLM이 쓴
// 【 제목 】 섹션(components/premium/ReportBody.tsx)에는 이미 있었지만, 코드가
// 고정으로 박아 넣는 섹션 제목(오행 지도·채우는 법·3년 처방 등)에는 아예
// 없었다. 그 둘의 시각 언어를 통일해 전 상품에 일괄 적용한다.
export function SectionHeading({ title, className = "" }: { title: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <h2 className="font-serif text-lg font-bold text-[#1F3D34] whitespace-nowrap">{title}</h2>
      <span className="flex-1 h-[2px] rounded-full" style={{ backgroundColor: "#E5DFD4" }} aria-hidden />
    </div>
  );
}
