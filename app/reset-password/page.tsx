"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || !confirm) return;
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "오류가 발생했습니다.");
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F6F1E7] flex flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-sm text-[#6B6661]">유효하지 않은 링크입니다.</p>
        <Link href="/forgot-password" className="text-sm text-[#1F3D34] font-semibold underline underline-offset-2">
          비밀번호 찾기 다시 요청
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
      <div className="relative overflow-hidden bg-[#1F3D34] pt-16 pb-10 px-6 text-center flex-shrink-0">
        <h1 className="relative font-serif text-2xl font-bold text-white">새 비밀번호 설정</h1>
      </div>

      <div className="flex-1 px-5 py-7 flex flex-col gap-4 max-w-sm mx-auto w-full">
        {done ? (
          <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-xl p-5 text-center">
            <p className="text-sm text-[#1A1A18]">비밀번호가 변경됐어요. 로그인 화면으로 이동합니다...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              placeholder="새 비밀번호 (8자 이상, 영문+숫자)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-sm bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] focus:ring-2 focus:ring-[#1F3D34]/10 transition-all"
            />
            <input
              type="password"
              placeholder="새 비밀번호 확인"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-sm bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] focus:ring-2 focus:ring-[#1F3D34]/10 transition-all"
            />
            {error && <p className="text-xs text-[#C0392B] px-1">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password || !confirm}
              className="w-full bg-[#1F3D34] text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.97] transition-all shadow-md"
            >
              {loading ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
