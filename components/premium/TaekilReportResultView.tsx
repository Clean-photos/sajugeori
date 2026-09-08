"use client";

import { PrintReportFooter } from "@/components/premium/PrintReport";
import { SaveReportButtons } from "@/components/premium/SaveReportButtons";
import { DeleteReportButton } from "@/components/premium/DeleteReportButton";
import { ReportBody } from "@/components/premium/ReportBody";

export type TaekilBestDate = { date: string; weekday: string; ganji: string };

/**
 * §1(CoS 결정 2026-09-08, 오행과 동일 패턴): 방금 생성한 결과 화면(TaekilForm)과
 * 저장된 결과를 다시 여는 화면(app/premium/taekil/[id])이 서로 다른 JSX를 쓰면
 * "하나 고치고 하나 잊는" 사고가 난다 — 그래서 결과 뷰만 공용 컴포넌트로 뺀다.
 */
export function TaekilReportResultView({
  report,
  best,
  onDelete,
}: {
  report: string;
  best: TaekilBestDate[];
  onDelete: () => Promise<void>;
}) {
  return (
    <div className="px-5 py-6 flex flex-col gap-4">
      <div className="print-area flex flex-col gap-4">
        {best.length > 0 && (
          <div className="print-card flex flex-wrap gap-2">
            {best.map((d) => (
              <div key={d.date} className="bg-[#1F3D34] text-white rounded-xl px-3 py-2 text-center">
                <p className="text-sm font-bold">{d.date.slice(5)}</p>
                <p className="text-[10px] text-white/60">{d.weekday} · {d.ganji}</p>
              </div>
            ))}
          </div>
        )}
        <div className="print-card bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5DFD4]">
            <span className="text-base">📅</span>
            <span className="text-xs font-medium text-[#6B6661] tracking-wide">프리미엄 택일 분석</span>
          </div>
          <ReportBody text={report} />
        </div>
        <PrintReportFooter />
      </div>
      <SaveReportButtons text={report} title="프리미엄 택일" />
      <p className="no-print text-center text-[11px] text-[#9B968F]">생성된 결과는 1년간 다시 볼 수 있습니다</p>
      <DeleteReportButton onConfirm={onDelete} />
    </div>
  );
}
