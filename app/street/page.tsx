import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { seasonalCharacterImage } from "@/lib/season";

const CHARACTERS = [
  {
    id: "sobaeksan_grandma",
    name: "소백산 할머니",
    tagline: "다정하고 푸근한 산신령 같은 할머니 역술가",
    tone: "따뜻함",
  },
  {
    id: "bulte_doryeong",
    name: "뿔테도령",
    tagline: "뿔테 안경 쓴 선비풍 역술가, 논리와 데이터",
    tone: "체계적",
  },
  {
    id: "tsundere_seonnyeo",
    name: "츤데레선녀",
    tagline: "퉁명한 척하지만 결국 다 챙겨주는 선녀",
    tone: "냉소·따뜻",
  },
  {
    id: "tla_misuk_robot",
    name: "T라미숙로봇",
    tagline: "감정 빼고 데이터로만 말하는 분석 로봇",
    tone: "데이터",
  },
  {
    id: "daewang_f_hamzzi",
    name: "대왕F햄찌",
    tagline: "공감 폭발 대왕 햄스터, 감정 먼저 보듬는 극F",
    tone: "공감",
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
    <div className="flex flex-col min-h-screen pb-24 bg-[#0E2521] relative overflow-hidden">
      {/* 은은한 구름 문양 */}
      <svg className="absolute inset-0 w-full opacity-[0.14] pointer-events-none" viewBox="0 0 400 900" preserveAspectRatio="none">
        <path d="M-20 70 Q30 45 80 70 T180 68 T280 62 T400 75" stroke="#D98A52" strokeWidth="1.4" fill="none" />
        <path d="M-20 110 Q40 88 90 110 T190 105 T290 115 T400 100" stroke="#F6F1E7" strokeWidth="1" fill="none" />
      </svg>

      {/* Header */}
      <header className="relative px-6 pt-14 pb-5 text-center">
        <p className="text-[11px] font-medium tracking-[0.2em] text-[#D98A52] mb-2">
          사주거리에 잘 오셨습니다
        </p>
        <h1 className="font-serif text-[27px] font-bold text-[#F6F1E7] leading-tight">
          어느 집을 두드릴까요
        </h1>
        <div className="w-14 h-px mx-auto mt-2.5 bg-gradient-to-r from-transparent via-[#D98A52] to-transparent" />
        <p className="text-sm text-[#8FA39C] mt-2.5">창호에 불빛이 비치면, 안에 역술가가 있어요</p>
      </header>

      {/* 잠금 배너 */}
      {locked && (
        <div className="relative mx-4 mb-4 rounded-2xl bg-[#16302B] border border-[#2A4742] px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">🔒</span>
          <div className="flex-1">
            <p className="text-[#F6F1E7] font-semibold text-sm">
              {!session?.user ? "로그인이 필요합니다" : "사주 등록이 필요합니다"}
            </p>
            <p className="text-[#8FA39C] text-xs mt-0.5">
              {!session?.user
                ? "역술가와 대화하려면 먼저 로그인하세요"
                : "내 사주를 등록해야 역술가와 대화할 수 있어요"}
            </p>
          </div>
          <Link
            href={!session?.user ? "/login?redirect=/street" : "/onboarding?from=street"}
            className="bg-[#D98A52] text-[#0E2521] text-xs font-semibold px-3 py-2 rounded-xl whitespace-nowrap"
          >
            {!session?.user ? "로그인" : "등록하기"}
          </Link>
        </div>
      )}

      {/* Character Houses */}
      <div className="relative px-8 flex flex-col gap-2.5">
        {CHARACTERS.map((char, i) => {
          const card = (
            <div
              className={`flex items-stretch gap-3 py-1.5 transition-all duration-200 ${
                locked ? "opacity-40" : "active:scale-[0.98]"
              }`}
            >
              {/* 지붕 + 창호 */}
              <div className="w-[76px] flex-shrink-0 relative">
                <div
                  className="h-4 bg-[#0A1815]"
                  style={{ clipPath: "polygon(2% 100%, 10% 40%, 50% 0%, 90% 40%, 98% 100%)" }}
                />
                <div className="relative w-[76px] h-[95px] border-2 border-[#D98A52] rounded-sm overflow-hidden bg-[#3a2415]">
                  {locked ? (
                    <div className="w-full h-full flex items-center justify-center text-xl">🔒</div>
                  ) : (
                    <Image
                      src={seasonalCharacterImage(char.id)}
                      alt={char.name}
                      fill
                      sizes="76px"
                      className="object-cover"
                    />
                  )}
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#F3C98A] shadow-[0_0_6px_2px_rgba(243,201,138,0.6)]" />
                </div>
                <div className="h-1 bg-[#0A1815] border-t border-[#D98A5288]" />
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-[17px] text-[#F6F1E7]">{char.name}</p>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#D98A5222] text-[#D98A52]">
                    {char.tone}
                  </span>
                </div>
                <p className="text-[13px] text-[#8FA39C] mt-1.5 leading-snug">{char.tagline}</p>
              </div>

              <div className="flex-shrink-0 flex items-center pr-1">
                <div className="w-11 h-11 rounded-full flex items-center justify-center bg-[#D98A5218] border border-[#D98A5233]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D98A52" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {locked
                      ? <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>
                      : <path d="M5 12h14M12 5l7 7-7 7"/>
                    }
                  </svg>
                </div>
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

      <p className="relative text-center text-xs text-[#8FA39C] mt-6 px-8 leading-relaxed">
        각 역술가는 고유한 성격과 말투를 가지고 있어요.<br/>
        사주를 등록하면 더 정확한 상담이 가능합니다.
      </p>

      <BottomTabBar dark />
    </div>
  );
}
