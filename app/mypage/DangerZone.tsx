"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

type Action = "profile" | "account";

const COPY: Record<Action, { trigger: string; warning: string; confirmLabel: string; checkboxLabel: string }> = {
  profile: {
    trigger: "사주 정보 삭제",
    warning:
      "등록된 사주 정보를 지우면 여기에 연결된 프리미엄 리포트(사주·궁합·살풀이·택일·연운세·펫·운명설계도)가 전부 함께 사라집니다. 계정 자체는 유지됩니다.",
    confirmLabel: "사주 정보 삭제하기",
    checkboxLabel: "결제하신 결과를 지우면 복구가 어렵고, 재생성이 필요하면 다시 결제해야 한다는 것을 확인했습니다.",
  },
  account: {
    trigger: "회원 탈퇴",
    warning:
      "탈퇴하면 계정과 등록된 사주, 결제로 받은 모든 프리미엄 리포트가 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.",
    confirmLabel: "완전히 탈퇴하기",
    checkboxLabel: "탈퇴하면 계정과 모든 결과가 삭제되어 복구할 수 없고, 다시 이용하려면 새로 가입하고 다시 결제해야 한다는 것을 확인했습니다.",
  },
};

function DangerAction({ action, endpoint }: { action: Action; endpoint: string }) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const copy = COPY[action];

  async function handleConfirm() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      router.push("/");
      router.refresh();
    } catch {
      setError("처리하지 못했습니다. 잠시 후 다시 시도해주세요.");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left text-sm text-[#C0392B] py-2"
      >
        {copy.trigger}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-[#C0392B]/25 bg-[#C0392B]/5 p-4 flex flex-col gap-3">
      <p className="text-xs text-[#C0392B] leading-relaxed">{copy.warning}</p>

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
        <span onClick={() => setChecked(!checked)}>{copy.checkboxLabel}</span>
      </label>

      {error && <p className="text-xs text-[#C0392B]">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setChecked(false); setError(""); }}
          disabled={busy}
          className="flex-1 border border-[#E5DFD4] text-[#6B6661] rounded-xl py-2.5 text-xs font-medium disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!checked || busy}
          className="flex-1 flex items-center justify-center gap-1.5 bg-[#C0392B] text-white rounded-xl py-2.5 text-xs font-semibold disabled:opacity-40"
        >
          {busy && <Spinner size={13} />}
          {busy ? "처리 중..." : copy.confirmLabel}
        </button>
      </div>
    </div>
  );
}

/** 마이페이지 위험 구역 — 사주 정보 삭제(계정 유지) / 회원 탈퇴(계정 삭제). */
export function DangerZone({ hasProfile }: { hasProfile: boolean }) {
  return (
    <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4 flex flex-col gap-1">
      <p className="text-sm font-semibold text-[#1B3A4B] mb-1">계정 관리</p>
      {hasProfile && <DangerAction action="profile" endpoint="/api/saju/profile" />}
      <DangerAction action="account" endpoint="/api/account" />
    </div>
  );
}
