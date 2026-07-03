"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1A1A18">
      <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.736 1.63 5.14 4.09 6.6L5.09 21l4.25-2.3c.87.16 1.75.24 2.66.24 5.523 0 10-3.477 10-7.8C22 6.477 17.523 3 12 3z"/>
    </svg>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("redirect") ?? searchParams.get("callbackUrl") ?? "/";
  const errorCode = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    errorCode === "invalid_credentials" ? "이메일 또는 비밀번호가 올바르지 않습니다." : ""
  );

  // 소셜 로그인 준비 중 (OAuth 키 미연결)
  const SOCIAL_READY = false;
  function handleSocialSoon() {
    setError("소셜 로그인은 준비 중이에요. 이메일로 로그인해 주세요.");
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
      {/* Top decoration */}
      <div className="relative overflow-hidden bg-[#1F3D34] pt-16 pb-10 px-6 text-center flex-shrink-0">
        <div className="absolute inset-0 opacity-25"
          style={{ backgroundImage: "radial-gradient(circle at 50% 120%, #C8743A 0%, transparent 60%)" }}
        />
        <div className="relative w-16 h-16 mx-auto rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-3xl mb-4">
          🏮
        </div>
        <h1 className="relative font-serif text-2xl font-bold text-white">사주거리 입장</h1>
        <p className="relative text-sm text-white/55 mt-1">AI 역술가와 대화를 시작하세요</p>
      </div>

      <div className="flex-1 px-5 py-7 flex flex-col gap-4 max-w-sm mx-auto w-full">
        {/* Social logins — OAuth 키 연결 전까지 준비 중 */}
        <button
          onClick={() => (SOCIAL_READY ? signIn("google", { callbackUrl }) : handleSocialSoon())}
          disabled={!SOCIAL_READY}
          className="relative w-full flex items-center justify-center gap-3 bg-white border border-[#E5DFD4] rounded-xl py-3.5 text-sm font-medium text-[#1A1A18] shadow-sm transition-all disabled:opacity-50"
        >
          <GoogleIcon />
          Google로 계속하기
          {!SOCIAL_READY && <span className="absolute right-3 text-[10px] text-[#6B6661] bg-[#F6F1E7] border border-[#E5DFD4] rounded-full px-2 py-0.5">준비 중</span>}
        </button>
        <button
          onClick={() => (SOCIAL_READY ? signIn("kakao", { callbackUrl }) : handleSocialSoon())}
          disabled={!SOCIAL_READY}
          className="relative w-full flex items-center justify-center gap-3 bg-[#FEE500] rounded-xl py-3.5 text-sm font-medium text-[#1A1A18] shadow-sm transition-all disabled:opacity-50"
        >
          <KakaoIcon />
          카카오로 계속하기
          {!SOCIAL_READY && <span className="absolute right-3 text-[10px] text-[#6B6661] bg-white/70 border border-black/10 rounded-full px-2 py-0.5">준비 중</span>}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#E5DFD4]" />
          <span className="text-xs text-[#6B6661]">또는 이메일로</span>
          <div className="flex-1 h-px bg-[#E5DFD4]" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
          <div>
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-sm bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] focus:ring-2 focus:ring-[#1F3D34]/10 transition-all"
            />
          </div>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 pr-12 text-sm bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] focus:ring-2 focus:ring-[#1F3D34]/10 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B6661]"
            >
              {showPw ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          {error && (
            <p className="text-xs text-[#C0392B] px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-[#1F3D34] text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.97] transition-all shadow-md mt-1"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        {/* Signup link */}
        <p className="text-center text-sm text-[#6B6661]">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-[#1F3D34] font-semibold underline underline-offset-2">
            회원가입
          </Link>
        </p>

        {/* Legal */}
        <p className="text-center text-[11px] text-[#6B6661] leading-relaxed mt-2">
          로그인 시{" "}
          <Link href="/terms" className="underline underline-offset-1">이용약관</Link>
          {" "}및{" "}
          <Link href="/privacy" className="underline underline-offset-1">개인정보처리방침</Link>
          에 동의하는 것으로 간주합니다
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
