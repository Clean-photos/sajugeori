"use client";

import Link from "next/link";
import { TERMS } from "@/app/dictionary/terms";
import { PrintReportFooter } from "@/components/premium/PrintReport";
import { SaveReportButtons } from "@/components/premium/SaveReportButtons";
import { DeleteReportButton } from "@/components/premium/DeleteReportButton";
import { ReportBody } from "@/components/premium/ReportBody";

export type DetectedSal = { name: string; where: string[] };

/** 엔진이 돌려준 신살 이름 → 백과 slug. 이름이 백과 표제어와 일치하면 링크를 건다. */
function slugForSal(name: string): string | undefined {
  return TERMS.find((t) => t.term === name)?.slug;
}

/**
 * §1(CoS 결정 2026-09-08, 오행과 동일 패턴): 방금 생성한 결과 화면(SalpuriForm)과
 * 저장된 결과를 다시 여는 화면(app/premium/salpuri/[id])이 서로 다른 JSX를 쓰면
 * "하나 고치고 하나 잊는" 사고가 난다 — 그래서 결과 뷰만 공용 컴포넌트로 뺀다.
 */
export function SalpuriReportResultView({
  report,
  sal,
  onDelete,
}: {
  report: string;
  sal: DetectedSal[];
  onDelete: () => Promise<void>;
}) {
  return (
    <div className="px-5 py-6 flex flex-col gap-4">
      <div className="print-area flex flex-col gap-4">
        {sal.length > 0 && (
          <div className="print-card bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
            <p className="text-xs font-medium text-[#6B6661] tracking-wide mb-2.5">검출된 살 {sal.length}종</p>
            <div className="flex flex-wrap gap-2">
              {sal.map((s) => {
                const slug = slugForSal(s.name);
                const label = `${s.name} · ${s.where.join(", ")}`;
                return slug ? (
                  <Link key={s.name} href={`/dictionary/${slug}`}
                    className="text-xs text-[#1F3D34] bg-white border border-[#E5DFD4] rounded-full px-3 py-1.5 active:opacity-60">
                    {label}
                  </Link>
                ) : (
                  <span key={s.name}
                    className="text-xs text-[#6B6661] bg-white border border-[#E5DFD4] rounded-full px-3 py-1.5">
                    {label}
                  </span>
                );
              })}
            </div>
            <p className="text-[11px] text-[#6B6661]/70 mt-2.5 no-print">살 이름을 누르면 용어 백과에서 자세한 뜻을 볼 수 있어요</p>
          </div>
        )}

        <div className="print-card bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5DFD4]">
            <span className="text-base">殺</span>
            <span className="text-xs font-medium text-[#6B6661] tracking-wide">프리미엄 살풀이</span>
          </div>
          <ReportBody text={report} highlight={sal.map((s) => s.name)} />
        </div>

        <div className="print-card bg-[#C8743A]/8 border border-[#C8743A]/25 rounded-2xl p-4 text-xs text-[#6B6661] leading-relaxed">
          신살은 사주 해석의 보조 요소이며, 하나의 살로 운명이 정해지지 않습니다.
          본 풀이는 오락 및 참고 목적으로 제공됩니다.
        </div>
        <PrintReportFooter />
      </div>

      <SaveReportButtons text={report} title="프리미엄 살풀이" />
      <p className="no-print text-center text-[11px] text-[#9B968F]">생성된 결과는 1년간 다시 볼 수 있습니다</p>
      <DeleteReportButton onConfirm={onDelete} />
    </div>
  );
}
