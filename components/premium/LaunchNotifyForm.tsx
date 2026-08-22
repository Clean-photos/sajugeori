"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

/**
 * 결제 오픈(9월 예정) 알림 신청. 결제가 막혀 있는 동안 구매 의사가 가장 높은
 * 방문자를 리드로 회수해, 오픈 첫날 매출로 전환하는 것이 목적이다.
 *
 * 개인정보 최소 수집 원칙에 따라 이메일만 받는다. 구체적 할인가·할인율은
 * 표기하지 않는다(정찰제 요건·카드사 심사와 충돌하지 않도록).
 */
export function LaunchNotifyForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/launch-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "신청하지 못했습니다.");
        setBusy(false);
        return;
      }
      setDone(true);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="mt-3 rounded-xl bg-[#4F7A5C]/8 border border-[#4F7A5C]/25 px-4 py-3">
        <p className="text-sm font-medium text-[#3D5F47]">알림 신청이 완료됐어요</p>
        <p className="text-xs text-[#6B6661] mt-1 leading-relaxed">
          결제가 열리면 메일로 알려드리고, 무료 쿠폰도 함께 보내드릴게요.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl bg-[#C8743A]/8 border border-[#C8743A]/25 px-4 py-3.5">
      <p className="text-sm font-semibold text-[#8A5228]">오픈 알림 받기</p>
      <p className="text-xs text-[#6B6661] mt-1 leading-relaxed">
        알림 신청하시면 오픈 기념 990원 리포트 1종 무료 쿠폰을 드립니다.
      </p>
      <div className="mt-2.5 flex gap-2">
        <input
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일 주소"
          className="flex-1 min-w-0 border border-[#E5DFD4] rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#C8743A]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || !email.includes("@")}
          className="flex items-center justify-center gap-1.5 bg-[#C8743A] text-white rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-40 active:scale-[0.97] transition-all whitespace-nowrap"
        >
          {busy && <Spinner size={13} />}
          신청
        </button>
      </div>
      {error && <p className="text-xs text-[#C0392B] mt-2">{error}</p>}
      <p className="text-[11px] text-[#6B6661]/70 mt-2 leading-relaxed">
        오픈 알림 발송에만 사용하며, 발송 후 지체 없이 파기합니다.
      </p>
    </div>
  );
}
