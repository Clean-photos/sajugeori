"use client";

import { PrintReportFooter } from "@/components/premium/PrintReport";
import { SaveReportButtons } from "@/components/premium/SaveReportButtons";
import { DeleteReportButton } from "@/components/premium/DeleteReportButton";
import { ReportBody } from "@/components/premium/ReportBody";

/**
 * §1(CoS 결정 2026-09-08, 오행과 동일 패턴): 방금 생성한 결과 화면(PetForm)과
 * 저장된 결과를 다시 여는 화면(app/premium/pet/[id])이 서로 다른 JSX를 쓰면
 * "하나 고치고 하나 잊는" 사고가 난다 — 그래서 결과 뷰만 공용 컴포넌트로 뺀다.
 */
export function PetReportResultView({
  report,
  species,
  petLabel,
  petName,
  onDelete,
}: {
  report: string;
  species: "dog" | "cat";
  petLabel: string;
  petName: string;
  onDelete: () => Promise<void>;
}) {
  return (
    <div className="px-5 py-6 flex flex-col gap-4">
      <div className="print-area flex flex-col gap-4">
        <div className="print-card bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5DFD4]">
            <span className="text-base">{species === "cat" ? "🐈" : "🐕"}</span>
            <span className="text-xs font-medium text-[#6B6661] tracking-wide">{petLabel}</span>
          </div>
          <ReportBody text={report} highlight={[petName]} />
        </div>

        <div className="print-card bg-[#C8743A]/8 border border-[#C8743A]/25 rounded-2xl p-4 text-xs text-[#6B6661] leading-relaxed">
          반려동물 사주는 사람의 사주만큼 정밀하게 풀이하기 어려운 영역입니다.
          본 풀이는 오락 및 참고 목적으로 제공되며, 아이의 건강과 관련한 문제는 반드시 수의사와 상담해 주세요.
        </div>
        <PrintReportFooter />
      </div>

      <SaveReportButtons text={report} title="반려동물 궁합" />
      <p className="no-print text-center text-[11px] text-[#9B968F]">생성된 결과는 1년간 다시 볼 수 있습니다</p>
      <DeleteReportButton onConfirm={onDelete} />
    </div>
  );
}
