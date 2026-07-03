"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8자 이상", ok: password.length >= 8 },
    { label: "영문 포함", ok: /[A-Za-z]/.test(password) },
    { label: "숫자 포함", ok: /[0-9]/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="flex gap-2 mt-2">
      {checks.map((c) => (
        <div key={c.label} className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${c.ok ? "bg-[#4F7A5C]" : "bg-[#E5DFD4]"}`} />
          <span className={`text-[10px] ${c.ok ? "text-[#4F7A5C]" : "text-[#6B6661]"}`}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

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

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", nickname: "" });
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "kakao" | null>(null);
  function handleSocial(provider: "google" | "kakao") {
    setSocialLoading(provider); // 클릭 즉시 스피너
    signIn(provider, { callbackUrl: "/onboarding" });
  }

  const pwValid = form.password.length >= 8 && /[A-Za-z]/.test(form.password) && /[0-9]/.test(form.password);
  const canSubmit = form.email && pwValid && form.nickname.trim() && agreed;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, password: form.password, nickname: form.nickname, agreed: true }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "오류가 발생했습니다.");
      setLoading(false);
      return;
    }

    // Auto-login after signup
    const loginResult = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (loginResult?.ok) {
      router.push("/onboarding");
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F6F1E7] flex flex-col items-center justify-center px-6 gap-5">
        <div className="w-16 h-16 rounded-2xl bg-[#4F7A5C]/10 flex items-center justify-center text-3xl">✓</div>
        <div className="text-center">
          <h2 className="font-serif text-xl font-bold text-[#1F3D34]">가입이 완료되었습니다</h2>
          <p className="text-sm text-[#6B6661] mt-1">{form.email}으로 가입했습니다</p>
        </div>
        <Link href="/login" className="w-full max-w-xs bg-[#1F3D34] text-white rounded-xl py-3.5 text-center font-semibold text-sm">
          로그인하러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
      {/* Header */}
      <div className="relative overflow-hidden bg-[#1F3D34] pt-14 pb-8 px-6">
        <div className="absolute inset-0 opacity-25"
          style={{ backgroundImage: "radial-gradient(circle at 80% 0%, #C8743A 0%, transparent 50%)" }}
        />
        <Link href="/login" className="relative flex items-center gap-2 text-white/60 text-sm mb-5 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          로그인으로
        </Link>
        <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-1">Join Us</p>
        <h1 className="relative font-serif text-[26px] font-bold text-white">회원가입</h1>
        <p className="relative text-sm text-white/55 mt-1">이메일 하나로 시작하세요</p>
      </div>

      <div className="flex-1 px-5 py-6 max-w-sm mx-auto w-full flex flex-col gap-5">
        {/* Social signup */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleSocial("google")}
            disabled={socialLoading !== null}
            className="w-full flex items-center justify-center gap-3 bg-white border border-[#E5DFD4] rounded-xl py-3.5 text-sm font-medium text-[#1A1A18] shadow-sm active:scale-[0.97] transition-all disabled:opacity-60"
          >
            {socialLoading === "google" ? <Spinner /> : <GoogleIcon />}
            {socialLoading === "google" ? "연결 중..." : "Google로 시작하기"}
          </button>
          <button
            onClick={() => handleSocial("kakao")}
            disabled={socialLoading !== null}
            className="w-full flex items-center justify-center gap-3 bg-[#FEE500] rounded-xl py-3.5 text-sm font-medium text-[#1A1A18] shadow-sm active:scale-[0.97] transition-all disabled:opacity-60"
          >
            {socialLoading === "kakao" ? <Spinner /> : <KakaoIcon />}
            {socialLoading === "kakao" ? "연결 중..." : "카카오로 시작하기"}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#E5DFD4]" />
          <span className="text-xs text-[#6B6661]">또는 이메일로</span>
          <div className="flex-1 h-px bg-[#E5DFD4]" />
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Nickname */}
          <div>
            <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-1.5">별명</label>
            <input
              type="text"
              placeholder="홍길동"
              maxLength={20}
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-sm bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] focus:ring-2 focus:ring-[#1F3D34]/10 transition-all"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-1.5">이메일</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
              className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-sm bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] focus:ring-2 focus:ring-[#1F3D34]/10 transition-all"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-1.5">비밀번호</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                placeholder="영문+숫자 8자 이상"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
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
            <PasswordStrength password={form.password} />
          </div>

          {error && (
            <p className="text-xs text-[#C0392B] bg-[#C0392B]/8 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Agreement */}
          <button
            type="button"
            onClick={() => setAgreed(!agreed)}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
              agreed ? "border-[#1F3D34] bg-[#1F3D34]/5" : "border-[#E5DFD4] bg-[#FBF8F2]"
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
              agreed ? "bg-[#1F3D34] border-[#1F3D34]" : "border-[#D0C9BE]"
            }`}>
              {agreed && (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M2 5.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span className="text-sm text-[#1A1A18] leading-relaxed">
              <Link
                href="/terms"
                onClick={(e) => e.stopPropagation()}
                className="text-[#1F3D34] font-semibold underline underline-offset-2"
              >
                이용약관
              </Link>
              {" "}및{" "}
              <Link
                href="/privacy"
                onClick={(e) => e.stopPropagation()}
                className="text-[#1F3D34] font-semibold underline underline-offset-2"
              >
                개인정보처리방침
              </Link>
              을 읽었으며 동의합니다
            </span>
          </button>

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full bg-[#C8743A] text-white rounded-xl py-4 font-semibold text-sm disabled:opacity-40 active:scale-[0.97] transition-all shadow-lg shadow-[#C8743A]/25 mt-1"
          >
            {loading ? "가입 중..." : "가입하고 사주 등록하기"}
          </button>
        </form>

        <p className="text-center text-sm text-[#6B6661]">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-[#1F3D34] font-semibold underline underline-offset-2">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
