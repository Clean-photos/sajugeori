import Link from "next/link";

export function HeaderAuth({ isLoggedIn }: { isLoggedIn: boolean }) {
  // §4(CEO 결정 2026-09-02): 홈 우상단에 "로그아웃"이 로그인/회원가입 버튼만큼
  // 눈에 띄게 떠 있었다 — 굳이 홈에서 로그아웃할 이유가 없는데 핵심 액션처럼
  // 보인다. 로그아웃은 마이페이지(LogoutButton)로만 남기고, 여기서는 로그인된
  // 사람에게 마이페이지로 가는 조용한 링크만 보여준다.
  if (isLoggedIn) {
    return (
      <Link
        href="/mypage"
        className="text-xs font-medium text-[#6B6661] border border-[#E5DFD4] bg-[#FBF8F2] rounded-full px-3 py-1.5 active:scale-95 transition-all"
      >
        마이페이지
      </Link>
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
