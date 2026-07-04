"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "오류가 발생했습니다.");
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
      <div className="relative overflow-hidden bg-[#1F3D34] pt-16 pb-10 px-6 text-center flex-shrink-0">
        <h1 className="relative font-serif text-2xl font-bold text-white">비밀번호 찾기</h1>
        <p className="relative text-sm text-white/55 mt-1">가입한 이메일로 재설정 링크를 보내드려요</p>
      </div>

      <div className="flex-1 px-5 py-7 flex flex-col gap-4 max-w-sm mx-auto w-full">
        {sent ? (
          <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-xl p-5 text-center">
            <p className="text-sm text-[#1A1A18] leading-relaxed">
              가입된 이메일이라면 비밀번호 재설정 링크를 보내드렸어요.
              <br />
              메일함(스팸함 포함)을 확인해주세요.
            </p>
            <Link href="/login" className="inline-block mt-4 text-sm text-[#1F3D34] font-semibold underline underline-offset-2">
              로그인으로 돌아가기
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="가입한 이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-sm bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] focus:ring-2 focus:ring-[#1F3D34]/10 transition-all"
            />
            {error && <p className="text-xs text-[#C0392B] px-1">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-[#1F3D34] text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.97] transition-all shadow-md"
            >
              {loading ? "전송 중..." : "재설정 링크 보내기"}
            </button>
            <Link href="/login" className="text-center text-sm text-[#6B6661] mt-1">
              로그인으로 돌아가기
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
