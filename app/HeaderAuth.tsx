"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export function HeaderAuth({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (isLoggedIn) {
    return (
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="text-xs font-medium text-[#6B6661] border border-[#E5DFD4] bg-[#FBF8F2] rounded-full px-3 py-1.5 active:scale-95 transition-all"
      >
        로그아웃
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="text-xs font-medium text-[#1F3D34] border border-[#E5DFD4] bg-[#FBF8F2] rounded-full px-3 py-1.5 active:scale-95 transition-all"
      >
        로그인
      </Link>
      <Link
        href="/signup"
        className="text-xs font-semibold text-white bg-[#1F3D34] rounded-full px-3 py-1.5 active:scale-95 transition-all"
      >
        회원가입
      </Link>
    </div>
  );
}
