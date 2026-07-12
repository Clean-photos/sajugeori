import Link from "next/link";
import { BottomTabBar } from "@/components/layout/BottomTabBar";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#F6F1E7]">
      <header className="px-6 pt-14 pb-6">
        <p className="text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">Premium</p>
        <h1 className="font-serif text-[26px] font-bold text-[#1F3D34] leading-tight">{title}</h1>
        <p className="text-sm text-[#6B6661] mt-1">{description}</p>
      </header>

      <section className="px-5 flex-1 flex flex-col items-center justify-center text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-[#1F3D34]/8 flex items-center justify-center text-2xl">🔧</div>
        <p className="text-sm font-medium text-[#1A1A18]">준비 중인 기능이에요</p>
        <p className="text-xs text-[#6B6661] max-w-[240px] leading-relaxed">
          더 깊이 있는 분석으로 곧 찾아올게요. 그때까지는 무료 버전을 이용해주세요.
        </p>
        <Link
          href="/premium/menu"
          className="mt-3 text-xs font-semibold text-[#C8743A]"
        >
          ← 프리미엄 메뉴로 돌아가기
        </Link>
      </section>

      <BottomTabBar />
    </div>
  );
}
