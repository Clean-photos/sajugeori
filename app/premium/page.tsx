import { BottomTabBar } from "@/components/layout/BottomTabBar";

// Section placeholders — filled by LLM premium report
const SECTIONS = [
  { id: "personality", label: "타고난 성격·기질", icon: "🧠" },
  { id: "career", label: "직업운", icon: "💼" },
  { id: "money", label: "재물운", icon: "💰" },
  { id: "love", label: "연애운", icon: "❤️" },
  { id: "health", label: "건강", icon: "🌿" },
  { id: "life_pattern", label: "인생 패턴", icon: "🔄" },
  { id: "current_phase", label: "현재 대운", icon: "🌊" },
  { id: "yearly", label: "연도별 운세", icon: "📆" },
];

export default function PremiumPage() {
  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="px-5 pt-6 pb-4 bg-[#1B3A4B] text-white">
        <p className="text-xs opacity-70 mb-1">프리미엄 사주</p>
        <h1 className="text-xl font-bold">내 사주 풀이</h1>
        <p className="text-xs opacity-60 mt-1">庚辰일주 · 신약</p>
      </header>

      <div className="px-4 py-4 flex flex-col gap-3">
        {SECTIONS.map((sec, i) => (
          <div key={sec.id} className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span>{sec.icon}</span>
              <span className="text-sm font-semibold text-[#1B3A4B]">{sec.label}</span>
              {i > 1 && (
                <span className="ml-auto text-xs bg-[#1B3A4B]/10 text-[#1B3A4B] px-2 py-0.5 rounded-full">
                  프리미엄
                </span>
              )}
            </div>
            {i <= 1 ? (
              <p className="text-sm text-[#6B6661]">
                {/* TODO: LLM generated content */}
                분석 내용이 여기에 표시됩니다.
              </p>
            ) : (
              <div className="h-16 bg-gradient-to-r from-[#E5DFD4] to-transparent rounded-lg flex items-center justify-center">
                <p className="text-xs text-[#6B6661]">결제 후 열람 가능</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <BottomTabBar />
    </div>
  );
}
