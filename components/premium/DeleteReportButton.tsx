"use client";

import { useState } from "react";
import { PrintButton } from "@/components/premium/PrintReport";
import { Spinner } from "@/components/ui/Spinner";

/**
 * 결제한 리포트 결과를 사용자가 직접 삭제할 수 있게 하는 공용 UI.
 *
 * 기본값은 "보관"이다 — 저장 기간(1년) 동안은 별다른 조치 없이도 결과가 남아있고,
 * 사용자가 원할 때만 이 버튼으로 지울 수 있다. 되돌릴 수 없는 삭제이므로:
 * 1) 다운로드(인쇄) 옵션을 먼저 보여주고,
 * 2) "재생성하려면 다시 결제해야 한다"는 문구에 체크해야만 삭제 버튼이 활성화된다.
 */
export function DeleteReportButton({ onConfirm }: { onConfirm: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="no-print text-center text-xs text-[#C0392B]/70 py-2"
      >
        결과 삭제하기
      </button>
    );
  }

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      await onConfirm();
    } catch {
      setError("삭제하지 못했습니다. 잠시 후 다시 시도해주세요.");
      setDeleting(false);
    }
  }

  return (
    <div className="no-print rounded-2xl border border-[#C0392B]/25 bg-[#C0392B]/5 p-4 flex flex-col gap-3">
      <p className="text-xs text-[#C0392B] leading-relaxed">
        지금 지우면 이 결과가 사라집니다. 복구할 수 없으니, 필요하면 먼저 다운로드해 두세요.
      </p>

      <PrintButton label="다운로드(인쇄 · PDF로 저장)" />

      <label className="flex items-start gap-2.5 text-xs text-[#1A1A18] leading-relaxed cursor-pointer select-none">
        <div
          onClick={() => setChecked(!checked)}
          className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            checked ? "bg-[#C0392B] border-[#C0392B]" : "border-[#E5DFD4] bg-white"
          }`}
        >
          {checked && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span onClick={() => setChecked(!checked)}>
          결제하신 결과를 지우면 복구가 어렵고, 재생성이 필요하면 다시 결제해야 한다는 것을 확인했습니다.
        </span>
      </label>

      {error && <p className="text-xs text-[#C0392B]">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setChecked(false); setError(""); }}
          disabled={deleting}
          className="flex-1 border border-[#E5DFD4] text-[#6B6661] rounded-xl py-2.5 text-xs font-medium disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={!checked || deleting}
          className="flex-1 flex items-center justify-center gap-1.5 bg-[#C0392B] text-white rounded-xl py-2.5 text-xs font-semibold disabled:opacity-40"
        >
          {deleting && <Spinner size={13} />}
          {deleting ? "삭제 중..." : "완전히 삭제하기"}
        </button>
      </div>
    </div>
  );
}
