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
      // 이용권이 생겼으니 리포트 화면으로 보낸다. 서버 컴포넌트가 새 이용권을
      // 보도록 refresh를 함께 호출한다.
      router.push(returnTo);
      router.refresh();
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
