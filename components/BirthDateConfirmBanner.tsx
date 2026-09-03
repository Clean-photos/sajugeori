"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * §1(양력·음력 선택) 도입 전 저장된 생년월일을 본인이 직접 확인하도록 유도하는
 * 배너(B안). 음력 생일을 양력 칸에 잘못 넣은 경우는 데이터만으로 식별할 수
 * 없어(마이그레이션 019 참고) 자동 교정이 불가능하다 — 본인 확인이 유일한 방법이다.
 *
 * "확인했어요"를 누르면 서버에 확인 시각을 남기고(POST /api/saju/profile),
 * 이 컴포넌트는 곧바로 자신을 숨긴다. 부모(mypage/onboarding)는 다음 방문부터
 * birth_date_confirmed_at이 채워진 프로필을 넘겨 이 컴포넌트를 아예 렌더하지
 * 않는다 — 이미 정상 입력한 사용자에게 매번 뜨면 그냥 소음이 되기 때문이다.
 */
export function BirthDateConfirmBanner({ birthDate }: { birthDate: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);

  if (dismissed) return null;

  async function confirm() {
    setSaving(true);
    try {
      await fetch("/api/saju/profile", { method: "POST" });
    } catch {
      // 저장이 실패해도 다음 방문에 다시 뜰 뿐, 지금 화면에서 굳이 다시
      // 방해할 필요는 없다 — 조용히 숨긴다.
    }
    setSaving(false);
    setDismissed(true);
  }

  return (
    <div className="bg-[#FDF0E3] border border-[#E9D9C4] rounded-2xl p-4 flex flex-col gap-2.5">
      <p className="text-sm font-semibold text-[#8A5228]">생년월일을 확인해 주세요</p>
      <p className="text-sm text-[#1A1A18]">
        등록된 생년월일: <b>{birthDate} (양력)</b>
      </p>
      <p className="text-xs text-[#6B6661] leading-relaxed">
        이전에는 음력 입력을 지원하지 않아, 음력 생일을 양력 칸에 넣으신 경우가 있을 수 있습니다.
        음력 생일이시라면 지금 수정해 주세요. 사주 결과가 달라집니다.
      </p>
      <div className="flex gap-2 mt-1">
        <button
          onClick={confirm}
          disabled={saving}
          className="flex-1 text-center border border-[#E9D9C4] text-[#8A5228] rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
        >
          확인했어요
        </button>
        <Link
          href="/onboarding"
          className="flex-1 text-center bg-[#C8743A] text-white rounded-xl py-2.5 text-sm font-semibold"
        >
          생년월일 수정
        </Link>
      </div>
    </div>
  );
}
