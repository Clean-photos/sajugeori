// §① 한 줄 진단 (§2-3 규격) — 굵은 헤드라인은 코드 확정, 보충 2문장은 LLM(narratives.diagnosis).
// LLM 결과가 아직 없으면(narratives 비어있음) 헤드라인만 보여주고 문장 자리는 렌더하지 않는다
// — 지어낸 문구를 채우지 않는다는 이 상품 전체의 원칙과 같다.
import type { DiagnosisSkeleton } from "@/lib/wuxing/diagnosis";
import type { WuxingNarratives } from "@/lib/wuxing/report";

export function DiagnosisHeader({
  diagnosis,
  narrative,
}: {
  diagnosis: DiagnosisSkeleton;
  narrative?: WuxingNarratives["diagnosis"];
}) {
  const headlineText = diagnosis.headline.replace(/\*\*/g, "");
  return (
    <header className="flex flex-col gap-2">
      <p className="font-serif text-[19px] font-bold text-[#1F3D34] leading-snug">{headlineText}</p>
      {narrative ? (
        <p className="text-sm text-[#1A1A18] leading-relaxed">
          {narrative.sentence1} {narrative.sentence2}
        </p>
      ) : (
        <p className="text-xs text-[#6B6661]">해설을 준비하고 있습니다.</p>
      )}
    </header>
  );
}
