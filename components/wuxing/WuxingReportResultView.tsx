"use client";

import type { WuxingReportData } from "@/lib/wuxing/report";
import { wuxingReportToPlainText } from "@/lib/wuxing/report";
import { WuxingReport } from "./WuxingReport";
import { SaveReportButtons } from "@/components/premium/SaveReportButtons";
import { DeleteReportButton } from "@/components/premium/DeleteReportButton";
import { PrintReportFooter } from "@/components/premium/PrintReport";

/**
 * §1(CoS 결정 2026-09-08): 방금 생성한 결과 화면(WuxingResultForm)과 저장된
 * 리포트를 다시 여는 화면(app/premium/ohang/[id])이 완전히 같은 내용을 보여줘야
 * 한다 — 실제로 결제한 사람이 "다시보기"에서 다른 화면을 보면 안 된다. 둘이
 * 각자 마크업을 들고 있으면 문구 하나 고칠 때 한쪽을 빠뜨리게 되므로 공용으로 뺀다.
 */
export function WuxingReportResultView({
  report,
  onDelete,
}: {
  report: WuxingReportData;
  onDelete: () => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="print-area">
        <div className="print-card">
          <WuxingReport data={report} />
        </div>
        <PrintReportFooter />
      </div>
      <div className="px-5">
        <SaveReportButtons text={wuxingReportToPlainText(report)} title="오행 보완 리포트" />
      </div>
      <p className="no-print text-center text-[11px] text-[#9B968F] px-5">생성된 결과는 1년간 다시 볼 수 있습니다</p>
      <div className="px-5 pb-4">
        <DeleteReportButton onConfirm={onDelete} />
      </div>
    </div>
  );
}
