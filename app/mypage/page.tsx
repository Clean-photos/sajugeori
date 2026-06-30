import { BottomTabBar } from "@/components/layout/BottomTabBar";

export default function MypagePage() {
  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold text-[#1B3A4B]">보관함</h1>
        <p className="text-sm text-[#6B6661] mt-0.5">내 정보 · 저장된 사주 · 결제 내역</p>
      </header>

      <div className="px-4 flex flex-col gap-3">
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
          <p className="text-sm font-semibold text-[#1B3A4B] mb-2">내 사주</p>
          <p className="text-sm text-[#6B6661]">로그인 후 사주를 등록하세요</p>
          <a href="/login" className="mt-3 block text-center bg-[#1B3A4B] text-white rounded-xl py-2.5 text-sm font-medium">
            로그인
          </a>
        </div>

        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
          <p className="text-sm font-semibold text-[#1B3A4B] mb-2">결제 내역</p>
          <p className="text-sm text-[#6B6661]">결제 내역이 없습니다</p>
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
}
