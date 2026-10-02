"use client";

import { useRouter } from "next/navigation";
import { cleanReportText } from "@/lib/report-format";
import { PrintReportFooter } from "@/components/premium/PrintReport";
import { SaveReportButtons } from "@/components/premium/SaveReportButtons";
import { DeleteReportButton } from "@/components/premium/DeleteReportButton";
import { ReportBody } from "@/components/premium/ReportBody";

// app/premium/PremiumReport.tsx의 SECTIONS와 같은 목록(생성기 lib/premium/saju-generate.ts 키와 일치).
const SECTIONS: { id: string; label: string; icon: string }[] = [
  { id: "personality", label: "타고난 성격·기질", icon: "🧠" },
  { id: "career", label: "직업운", icon: "💼" },
  { id: "money", label: "재물운", icon: "💰" },
  { id: "love", label: "연애·결혼운", icon: "❤️" },
  { id: "health", label: "건강", icon: "🌿" },
  { id: "life_pattern", label: "인생 패턴", icon: "🔄" },
  { id: "current_phase", label: "현재 대운", icon: "🌊" },
  { id: "yearly", label: "연도별 운세", icon: "📆" },
];

/**
 * 저장된 프리미엄 사주 재열람 화면(9차 B) — 이용권 검사 없이 id로만 연다. 삭제는 이 행의
 * PK(reportId)로 바로 보낸다(DELETE /api/premium/report는 "현재 본인 사주"가 아니라 id 기준).
 */
export function SavedReportClient({ content, reportId }: { content: Record<string, string>; reportId: string }) {
  const router = useRouter();
  const cleaned: Record<string, string> = {};
  for (const k of Object.keys(content)) cleaned[k] = cleanReportText(content[k]);

  async function handleDelete() {
    const res = await fetch("/api/premium/report", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reportId }),
    });
    if (!res.ok) throw new Error("delete failed");
    router.push("/mypage");
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      <div className="print-area flex flex-col gap-3">
        {SECTIONS.map((sec) => (
          <div key={sec.id} className="print-card bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span>{sec.icon}</span>
              <h2 className="m-0 text-sm font-semibold text-[#1B3A4B]">{sec.label}</h2>
            </div>
            <ReportBody text={cleaned[sec.id] ?? "준비 중입니다."} />
          </div>
        ))}
        <PrintReportFooter />
      </div>
      <SaveReportButtons
        title="프리미엄 사주"
        text={SECTIONS.map((sec) => `【 ${sec.label} 】\n${cleaned[sec.id] ?? ""}`).join("\n\n")}
      />
      <p className="no-print text-center text-[11px] text-[#9B968F]">생성된 결과는 1년간 다시 볼 수 있습니다</p>
      <DeleteReportButton onConfirm={handleDelete} />
    </div>
  );
}
