"use client";

// §2 재등록 경고 모달(3/3 문서). /api/saju/calculate의 재등록은 실제 DELETE가
// 아니라 새 saju_profiles row를 INSERT하는 것뿐이라 옛 row는 DB에 남지만, 모든
// 리포트 조회 경로가 "label=본인 중 최신 1건"만 읽기 때문에 그 순간부터 기존
// 리포트는 앱에서 영구히 못 보게 된다 — 사용자 입장에선 삭제와 동일하다.
// 근본 해법(프로필 단위 바인딩)까지는 이 확인창이 방어선 역할을 한다.
import { useEffect, useRef } from "react";
import type { MyReport } from "@/lib/billing/my-reports";

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function ReregisterWarningModal({
  reports,
  onCancel,
  onConfirm,
}: {
  reports: MyReport[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // 기본 포커스는 취소 — 실수로 엔터를 눌러도 되돌릴 수 없는 쪽으로 가지 않게.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reregister-warning-title"
      onClick={onCancel}
    >
      <div
        className="w-full sm:max-w-sm bg-[#FBF8F2] rounded-2xl p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="reregister-warning-title" className="font-serif text-[17px] font-bold text-[#1A1A18] mb-2">
          ⚠ 사주를 다시 등록하시겠어요?
        </p>

        {reports.length > 0 ? (
          <>
            <p className="text-[13px] text-[#1A1A18] leading-relaxed mb-2">
              현재 등록된 사주로 만든 리포트 {reports.length}건이 삭제됩니다.
            </p>
            <ul className="flex flex-col gap-0.5 mb-3">
              {reports.map((r, i) => (
                <li key={i} className="text-[12.5px] text-[#6B6661]">
                  · {r.label} ({shortDate(r.created_at)} 구매)
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-[13px] text-[#1A1A18] leading-relaxed mb-3">
            현재 등록된 사주 정보가 새 정보로 교체됩니다.
          </p>
        )}

        <p className="text-[11.5px] text-[#C0392B] bg-[#C0392B]/8 border border-[#C0392B]/25 rounded-xl px-3 py-2.5 leading-relaxed mb-4">
          삭제된 리포트는 복구할 수 없으며 환불되지 않습니다.
        </p>

        <div className="flex gap-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 text-center border border-[#E5DFD4] text-[#1F3D34] rounded-xl py-3 font-semibold text-sm active:scale-[0.97] transition-all"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 text-center bg-[#C0392B] text-white rounded-xl py-3 font-semibold text-sm active:scale-[0.97] transition-all"
          >
            삭제하고 등록
          </button>
        </div>
      </div>
    </div>
  );
}
