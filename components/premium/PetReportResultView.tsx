"use client";

import Link from "next/link";
import { PrintReportFooter } from "@/components/premium/PrintReport";
import { SaveReportButtons } from "@/components/premium/SaveReportButtons";
import { DeleteReportButton } from "@/components/premium/DeleteReportButton";
import { ReportBody } from "@/components/premium/ReportBody";

/**
 * §1(CoS 결정 2026-09-08, 오행과 동일 패턴): 방금 생성한 결과 화면(PetForm)과
 * 저장된 결과를 다시 여는 화면(app/premium/pet/[id])이 서로 다른 JSX를 쓰면
 * "하나 고치고 하나 잊는" 사고가 난다 — 그래서 결과 뷰만 공용 컴포넌트로 뺀다.
 *
 * §[다중 사주 우선순위 확정, 2026-09-30]: 방금 생성한 결과(PetForm)에는 "다른
 * 아이 보기"(그 자리에서 폼으로 리셋)가 있었지만, 마이페이지에서 저장된 결과를
 * 다시 열 때(app/premium/pet/[id])는 이 버튼이 아예 없어 다른 아이 리포트로
 * 건너갈 방법이 없었다(CoS 실물 확인). otherPets가 있을 때만 여기서도 보여준다
 * — 값이 없으면(=PetForm 경로) 기존처럼 렌더링 안 함, PetForm은 자체 버튼을 유지.
 */
export function PetReportResultView({
  report,
  species,
  petLabel,
  petName,
  onDelete,
  otherPets,
}: {
  report: string;
  species: "dog" | "cat";
  petLabel: string;
  petName: string;
  onDelete: () => Promise<void>;
  otherPets?: { href: string; label: string }[];
}) {
  return (
    <div className="px-5 py-6 flex flex-col gap-4">
      <div className="print-area flex flex-col gap-4">
        <div className="print-card print-card-flow bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 shadow-sm">
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

      {otherPets && otherPets.length > 0 && (
        <div className="no-print flex flex-col gap-2 items-center">
          <p className="text-xs text-[#6B6661]">다른 아이 보기</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {otherPets.map((p, i) => (
              <Link
                // §(2026-10-02 실물 확인): 018(가족·지인 대상) 출신 펫 리포트는
                // 전용 열람 라우트가 없어 href가 전부 "/premium/pet" 정적 경로로
                // 겹친다 — href만으로는 key가 유니크하지 않다(React 중복 키 경고
                // 실측). label도 같은 경우가 있어 index까지 함께 섞는다.
                key={`${p.href}-${p.label}-${i}`}
                href={p.href}
                className="rounded-full border border-[#E5DFD4] text-[#1F3D34] px-3 py-1.5 text-xs font-medium"
              >
                {p.label}
              </Link>
            ))}
            <Link href="/premium/pet" className="rounded-full border border-dashed border-[#C8743A]/50 text-[#C8743A] px-3 py-1.5 text-xs font-medium">
              + 새로 보기
            </Link>
          </div>
        </div>
      )}

      <DeleteReportButton onConfirm={onDelete} />
    </div>
  );
}
