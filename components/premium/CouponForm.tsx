"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

/**
 * 쿠폰 코드 입력 → 이용권 발급. 990원 리포트 6종에만 쓸 수 있다.
 * 쿠폰은 결제창을 타지 않으므로 결제 오픈 전에도 동작한다.
 */
export function CouponForm({ productId, returnTo }: { productId: string; returnTo: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function apply() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), productId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === "login_required") {
          router.push(`/login?redirect=${encodeURIComponent(`/premium/buy?product=${productId}`)}`);
          return;
        }
        setError(data?.error ?? "쿠폰을 사용할 수 없습니다.");
        setBusy(false);
        return;
      }
      setDone(true);
      // §3-3과 동일 버그(2026-09-15 실물 재검증에서 확인): push 직후 refresh를
      // 부르면, push가 아직 "현재 경로"를 buy로 들고 있는 시점에 refresh가 같은
      // 경로 재요청을 큐에 넣어 두 요청이 경합한다 — 늦게 도착하는 buy 응답이
      // push의 전환을 덮어써 이동이 안 되거나(반려동물 "결제 후 폼 초기화"로
      // 지적된 것과 같은 계열) 화면이 꼬일 수 있다. 이동 대상(returnTo)도
      // auth()를 쓰는 동적 라우트라 push만으로 이미 최신 이용권 상태를 받으므로
      // refresh는 불필요했다.
      router.push(returnTo);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl bg-[#4F7A5C]/8 border border-[#4F7A5C]/25 px-4 py-3">
        <p className="text-sm font-medium text-[#3D5F47]">쿠폰이 적용됐어요</p>
        <p className="text-xs text-[#6B6661] mt-1">리포트 화면으로 이동합니다…</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-[#6B6661] underline underline-offset-4 py-1 w-fit mx-auto"
      >
        쿠폰 코드가 있어요
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[#E5DFD4] bg-[#FBF8F2] px-4 py-3.5">
      <p className="text-sm font-semibold text-[#1F3D34]">쿠폰 코드</p>
      <div className="mt-2.5 flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="예: SAJU-OPEN"
          autoCapitalize="characters"
          className="flex-1 min-w-0 border border-[#E5DFD4] rounded-xl px-3 py-2.5 text-sm bg-white tracking-wider focus:outline-none focus:border-[#1F3D34]"
        />
        <button
          type="button"
          onClick={apply}
          disabled={busy || code.trim().length < 3}
          className="flex items-center justify-center gap-1.5 bg-[#1F3D34] text-white rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-40 active:scale-[0.97] transition-all whitespace-nowrap"
        >
          {busy && <Spinner size={13} />}
          적용
        </button>
      </div>
      {error && <p className="text-xs text-[#C0392B] mt-2">{error}</p>}
    </div>
  );
}
