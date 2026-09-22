"use client";

import { PrintReportFooter } from "@/components/premium/PrintReport";
import { SaveReportButtons } from "@/components/premium/SaveReportButtons";
import { DeleteReportButton } from "@/components/premium/DeleteReportButton";
import { ReportBody } from "@/components/premium/ReportBody";
import { YearlySummaryCard } from "@/components/premium/YearlySummaryCard";
import type { YearlyCardData } from "@/lib/premium/yearly-card";

/**
 * §1(CoS 결정 2026-09-08, 오행과 동일 패턴): 방금 생성한 결과 화면(YearlyForm)과
 * 저장된 결과를 다시 여는 화면(app/premium/yearly/[id])이 서로 다른 JSX를 쓰면
 * "하나 고치고 하나 잊는" 사고가 난다 — 그래서 결과 뷰만 공용 컴포넌트로 뺀다.
 */
export function YearlyReportResultView({
  report,
  year,
  card,
  onDelete,
}: {
  report: string;
  year: number;
  /** 결과 최상단 요약 카드 데이터. 없으면(엔진 오류·구버전 응답) 카드는 생략한다. */
  card?: YearlyCardData | null;
  onDelete: () => Promise<void>;
}) {
  return (
    <div className="px-5 py-6 flex flex-col gap-4">
      {/* 결과 최상단 요약 카드 — 캡처·공유용 (CoS 2026-09-19 §C). 인쇄본에는 아래 본문과 중복이라 넣지 않는다. */}
      {card && (
        <div className="no-print">
          <YearlySummaryCard card={card} />
        </div>
      )}
      <div className="print-area flex flex-col gap-4">
        <div className="print-card print-card-flow bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5DFD4]">
            <span className="text-base">運</span>
            <span className="text-xs font-medium text-[#6B6661] tracking-wide">{year}년 프리미엄 연운세</span>
          </div>
          <ReportBody text={report} />
        </div>
        <PrintReportFooter />
      </div>
      <SaveReportButtons text={report} title="프리미엄 연운세" />
      <p className="no-print text-center text-[11px] text-[#9B968F]">생성된 결과는 1년간 다시 볼 수 있습니다</p>
      <DeleteReportButton onConfirm={onDelete} />
    </div>
  );
}
