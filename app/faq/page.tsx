import Link from "next/link";
import type { Metadata } from "next";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "자주 묻는 질문 (FAQ) | 사주거리",
  description:
    "사주를 볼 때 자주 묻는 질문 모음. 양력·음력, 야자시·조자시, 태어난 시각을 모를 때, 서머타임, 무료·프리미엄 차이, 사주 결과를 대하는 법까지 한눈에.",
  alternates: { canonical: "/faq" },
};

interface QA {
  q: string;
  a: string[]; // 문단 배열 (JSON-LD에는 합쳐서 넣는다)
}

const FAQS: QA[] = [
  {
    q: "사주는 양력으로 봐야 하나요, 음력으로 봐야 하나요?",
    a: [
      "사주는 태어난 ‘순간의 실제 하늘·땅의 기운’을 기준으로 하므로, 결국 양력(정확히는 절기)을 바탕으로 계산합니다. 음력 생일을 아신다면 그에 해당하는 양력 날짜로 환산해 입력하면 됩니다.",
      "특히 사주의 월(月)은 달력상의 1일이 아니라 절기(입춘·경칩 등)를 기준으로 바뀝니다. 예를 들어 한 해의 시작도 양력 1월 1일이나 음력 설이 아니라 입춘(대략 2월 4일)을 기준으로 봅니다. 사주거리는 입력하신 양력 날짜를 절기 기준으로 자동 변환해 계산하므로, 양력 생년월일만 정확히 넣으면 됩니다.",
    ],
  },
  {
    q: "태어난 시각을 모르면 사주를 볼 수 없나요?",
    a: [
      "볼 수 있습니다. 입력 화면에서 ‘시각 모름’을 선택하면 시주(時柱)를 제외한 연·월·일 세 기둥으로 분석합니다. 타고난 기질과 오행의 큰 흐름, 성향과 대운의 방향은 충분히 읽을 수 있습니다.",
      "다만 시주가 관장하는 말년운, 자녀와 관련한 세밀한 해석은 제한될 수 있습니다. 가능하다면 가족에게 태어난 시각을 확인하거나 출생 기록을 찾아보시는 것을 권합니다.",
    ],
  },
  {
    q: "밤 11시~새벽 1시(자시)에 태어났는데, 날짜를 어떻게 봐야 하나요?",
    a: [
      "하루의 경계를 언제로 볼지에 대한 문제로, 명리학에서 오래 논의되어 온 부분입니다. 전통적으로 하루는 자시(子時, 밤 11시~새벽 1시)에 시작한다고 보는데, 이 자시를 다시 둘로 나누기도 합니다.",
      "밤 11시부터 자정까지를 야자시(夜子時), 자정부터 새벽 1시까지를 조자시(早子時)라 합니다. 유파에 따라 야자시에 태어난 사람의 날짜(일주)를 그날로 볼지 다음 날로 볼지 견해가 갈립니다. 이처럼 자시 무렵(밤 11시~새벽 1시) 출생은 해석이 달라질 수 있으니, 결과를 볼 때 이 점을 감안하시면 좋습니다.",
    ],
  },
  {
    q: "한국 표준시·서머타임 같은 것도 반영되나요?",
    a: [
      "사주의 시(時)는 본래 태양의 위치를 기준으로 하므로, 시계가 가리키는 표준시와는 차이가 생깁니다. 한국에서 가장 크게 논의되는 것이 이 문제입니다. 우리나라의 실제 중심 경도는 동경 127도 30분 부근인데, 표준시는 동경 135도를 씁니다. 그래서 시계상의 시각이 실제 태양시보다 약 30분 앞서 있습니다.",
      "이 때문에 명리학에서는 자시(子時)를 밤 11시~새벽 1시가 아니라 실제로는 밤 11시 30분~새벽 1시 30분으로 보정해서 적용해야 한다는 견해가 널리 통용됩니다. 나머지 시진도 마찬가지로 30분씩 밀려납니다. 다만 보정을 적용할지 여부는 유파에 따라 견해가 갈립니다.",
      "여기에 더해 한국은 1948년부터 1961년까지, 그리고 서울올림픽을 앞둔 1987년과 1988년에 서머타임(일광절약시간제)을 시행했습니다. 이 기간에 태어났다면 시계 시각이 한 시간 앞당겨져 있었으므로, 시주를 세울 때 이를 되돌려 계산해야 합니다.",
      "사주거리의 무료 분석은 입력하신 시각을 그대로 기준으로 계산합니다. 위 보정을 적용하지 않으므로, 시진의 경계 무렵(각 두 시간대의 앞뒤 30분 이내)에 태어나셨다면 시주가 달라질 수 있다는 점을 감안해 주세요.",
    ],
  },
  {
    q: "무료 사주와 프리미엄(AI 역술가 대화)은 무엇이 다른가요?",
    a: [
      "무료 사주는 광고 시청 후 핵심 해설을 간추려 보여 드리는 요약형 서비스입니다. 타고난 기질과 오행의 균형, 기본 성향을 빠르게 확인하기에 좋습니다.",
      "프리미엄은 AI 역술가와 직접 대화하며 직업운·연애운·건강·대운의 흐름 등을 깊이 있게 물어보는 서비스입니다. 자신의 상황에 맞춰 이어서 질문할 수 있다는 점이 가장 큰 차이입니다.",
    ],
  },
  {
    q: "사주 결과를 얼마나 믿어야 하나요?",
    a: [
      "사주는 정해진 운명을 통보하는 것이 아니라, 타고난 기질과 삶의 리듬을 이해하는 지도에 가깝습니다. 강한 기운은 잘 살리고 부족한 기운은 채워 가는 방향으로 활용할 때 의미가 있습니다.",
      "사주거리가 제공하는 콘텐츠는 오락 및 참고 목적으로만 제공되며, 법률·의료·재정 등 전문적 자문을 대체하지 않습니다. 중요한 결정은 반드시 해당 분야 전문가와 상담하시기 바랍니다.",
    ],
  },
  {
    q: "입력한 생년월일 같은 개인정보는 어떻게 처리되나요?",
    a: [
      "사주 계산에 필요한 정보만 사용하며, 자세한 처리 방침은 개인정보처리방침에서 확인하실 수 있습니다. 궁금한 점이 있으면 문의하기를 통해 언제든 문의해 주세요.",
    ],
  },
  {
    q: "사주 용어가 너무 어려워요. 어디서 찾아볼 수 있나요?",
    a: [
      "십성(비견·겁재·식신·상관 등), 오행, 신살(도화살·역마살 등), 일간·용신·대운·세운 같은 자주 나오는 용어를 하나씩 풀어 정리한 ‘사주 용어 백과’를 준비해 두었습니다. 결과에서 낯선 단어를 만나면 백과에서 찾아보세요.",
    ],
  },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a.join(" ") },
    })),
  };

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#F6F1E7]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #C8743A 0%, transparent 50%)" }} />
        <Link href="/" className="relative flex items-center gap-2 text-white/60 text-sm mb-5 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          홈
        </Link>
        <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">FAQ</p>
        <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">자주 묻는 질문</h1>
        <p className="relative text-sm text-white/60 mt-1">사주를 볼 때 많이들 궁금해하는 것들을 모았어요</p>
      </header>

      <section className="px-4 py-6 flex flex-col gap-3">
        {FAQS.map((f, i) => (
          <article key={i} className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 shadow-sm">
            <div className="flex gap-2.5">
              <span className="font-serif font-bold text-[#C8743A] text-lg leading-none mt-0.5">Q.</span>
              <h2 className="font-semibold text-[16px] text-[#1F3D34] leading-snug">{f.q}</h2>
            </div>
            <div className="mt-3 pl-6 flex flex-col gap-2">
              {f.a.map((p, j) => (
                <p key={j} className="text-[14px] text-[#1A1A18] leading-[1.8]">{p}</p>
              ))}
            </div>
          </article>
        ))}
      </section>

      <div className="px-4">
        <Link href="/dictionary">
          <div className="bg-[#1F3D34] rounded-2xl px-5 py-4 flex items-center justify-between active:scale-[0.98] transition-all">
            <div>
              <p className="text-sm font-semibold text-white">사주 용어가 궁금하다면</p>
              <p className="text-xs text-white/60 mt-0.5">용어 백과에서 48가지 개념을 확인하세요</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8743A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </Link>
      </div>

      <SiteFooter />
      <BottomTabBar />
    </div>
  );
}
