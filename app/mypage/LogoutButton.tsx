"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="w-full text-center text-sm font-medium text-[#6B6661] py-2.5"
    >
      로그아웃
    </button>
  );
}
