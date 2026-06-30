import Link from "next/link";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { BottomTabBar } from "@/components/layout/BottomTabBar";

const CHARACTERS = [
  {
    id: "sobaeksan_grandma",
    name: "소백산 할머니",
    tagline: "다정하고 푸근한 산신령 같은 할머니 역술가",
    emoji: "👵",
    tone: "따뜻하고 친근한",
    color: "#4F7A5C",
    bgColor: "#4F7A5C14",
  },
  {
    id: "bulte_doryeong",
    name: "뿔테도령",
    tagline: "뿔테 안경 쓴 선비풍 역술가, 논리와 데이터",
    emoji: "🤓",
    tone: "차분하고 체계적인",
    color: "#1F3D34",
    bgColor: "#1F3D3414",
  },
  {
    id: "tsundere_seonnyeo",
    name: "츤데레선녀",
    tagline: "퉁명한 척하지만 결국 다 챙겨주는 선녀",
    emoji: "🧚",
    tone: "냉소적이지만 따뜻한",
    color: "#7B5EA7",
    bgColor: "#7B5EA714",
  },
  {
    id: "tla_misuk_robot",
    name: "T라미숙로봇",
    tagline: "감정 빼고 데이터로만 말하는 분석 로봇",
    emoji: "🤖",
    tone: "데이터 중심, 정확한",
    color: "#2563EB",
    bgColor: "#2563EB14",
  },
  {
    id: "daewang_f_hamzzi",
    name: "대왕F햄찌",
    tagline: "공감 폭발 대왕 햄스터, 감정 먼저 보듬는 극F",
    emoji: "🐹",
    tone: "공감 넘치는, 따뜻한",
    color: "#C8743A",
    bgColor: "#C8743A14",
  },
];

export default async function StreetPage() {
  const session = await auth();
  let hasProfile = false;

  if (session?.user?.id) {
    const { data } = await supabaseAdmin
      .from("saju_profiles")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("label", "본인")
      .limit(1)
      .single();
    hasProfile = !!data;
  }

  const locked = !session?.user || !hasProfile;

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#F6F1E7]">
      {/* Header */}
      <header className="relative px-6 pt-14 pb-6 overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-[#1F3D34]/5" />
        <p className="text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">
          AI Characters
        </p>
        <h1 className="font-serif text-[28px] font-bold text-[#1F3D34] leading-tight">
          사주 거리
        </h1>
        <p className="text-sm text-[#6B6661] mt-1">어느 방에 들어갈까요?</p>
      </header>

      {/* 잠금 배너 */}
      {locked && (
        <div className="mx-4 mb-4 rounded-2xl bg-[#1F3D34] px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">🔒</span>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">
              {!session?.user ? "로그인이 필요합니다" : "사주 등록이 필요합니다"}
            </p>
            <p className="text-white/60 text-xs mt-0.5">
              {!session?.user
                ? "역술가와 대화하려면 먼저 로그인하세요"
                : "내 사주를 등록해야 역술가와 대화할 수 있어요"}
            </p>
          </div>
          <Link
            href={!session?.user ? "/login?redirect=/street" : "/onboarding?from=street"}
            className="bg-[#C8743A] text-white text-xs font-semibold px-3 py-2 rounded-xl whitespace-nowrap"
          >
            {!session?.user ? "로그인" : "등록하기"}
          </Link>
        </div>
      )}

      {/* Character Cards */}
      <div className="px-4 flex flex-col gap-3">
        {CHARACTERS.map((char, i) => {
          const card = (
            <div
              className={`bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 shadow-sm overflow-hidden relative ${
                locked ? "opacity-50" : "active:scale-[0.98]"
              }`}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                style={{ backgroundColor: char.color }}
              />
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 border border-[#E5DFD4]"
                style={{ backgroundColor: char.bgColor }}
              >
                {locked ? "🔒" : char.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[15px] text-[#1A1A18]">{char.name}</p>
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: char.bgColor, color: char.color }}
                  >
                    {char.tone}
                  </span>
                </div>
                <p className="text-xs text-[#6B6661] mt-0.5 leading-snug">{char.tagline}</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: char.bgColor }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={char.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {locked
                    ? <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>
                    : <path d="M5 12h14M12 5l7 7-7 7"/>
                  }
                </svg>
              </div>
            </div>
          );

          return locked ? (
            <div key={char.id} className="animate-fade-up" style={{ animationDelay: `${i * 0.07}s` }}>
              {card}
            </div>
          ) : (
            <Link
              key={char.id}
              href={`/street/${char.id}`}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              {card}
            </Link>
          );
        })}
      </div>

      <p className="text-center text-xs text-[#6B6661] mt-6 px-8 leading-relaxed">
        각 역술가는 고유한 성격과 말투를 가지고 있어요.<br/>
        사주를 등록하면 더 정확한 상담이 가능합니다.
      </p>

      <BottomTabBar />
    </div>
  );
}
