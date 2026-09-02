import type { Metadata } from "next";
import Link from "next/link";
import { OhangForward } from "./OhangForward";

/**
 * /ohang — 네이버 블로그 유입용 짧은 링크(sajugeori.com/ohang).
 *
 * 왜 리다이렉트(307)가 아니라 페이지인가:
 * 307로 넘기면 크롤러가 목적지(/premium/menu)까지 따라가 **그 페이지의 OG**를 읽는다.
 * 프리미엄 메뉴는 일곱 상품 전체를 소개하는 곳이라, 거기에 오행 이미지를 붙이면
 * 다른 데 공유될 때도 오행 카드가 뜨게 된다. 그래서 이 경로가 자기 OG를 갖고,
 * 사람만 메뉴로 넘긴다 — 크롤러는 JS를 실행하지 않으므로 메타만 읽고 끝난다.
 *
 * 목적지는 오행 상세(/premium/ohang)가 아니라 프리미엄 메뉴다(지시).
 */
const DEST = "/premium/menu?utm_source=naver_blog&utm_medium=referral&utm_campaign=ohang";

export const metadata: Metadata = {
  title: "오행 보완 리포트 — 부족한 기운을 무엇으로, 언제 채울지 | 사주거리",
  description:
    "내 사주에 부족한 오행을 판정하고 색·방위·음식부터 가까이할 사람, 3년 세운 처방까지 정리해 드립니다. 리포트 한 편 990원.",
  // 이 링크로 공유될 때만 오행 카드가 뜨도록 여기서만 이미지를 덮어쓴다.
  openGraph: {
    title: "오행 보완 리포트 — 부족한 기운을 무엇으로, 언제 채울지",
    description: "색·방위·음식 · 가까이할 사람 · 3년 세운 처방. 리포트 한 편 990원.",
    images: [{ url: "/og-ohang.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "오행 보완 리포트 — 부족한 기운을 무엇으로, 언제 채울지",
    images: ["/og-ohang.png"],
  },
  // 메뉴 페이지의 중복본으로 색인되지 않게 한다(내용이 실질적으로 같다).
  alternates: { canonical: "/premium/menu" },
};

export default function OhangEntryPage() {
  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <OhangForward to={DEST} />
      <p className="text-sm text-[#6B6661]">프리미엄 메뉴로 이동하고 있어요…</p>
      {/* JS가 꺼져 있거나 이동이 막힌 경우의 대비 */}
      <Link href={DEST} className="text-sm font-semibold text-[#1F3D34] underline">
        바로 이동하기
      </Link>
    </div>
  );
}
