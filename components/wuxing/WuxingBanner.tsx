// `/guide/fill-*` 하단 CTA 배너 (§10-5, docs/wuxing_seun_diagnosis_banner_v1.md §3).
// 카드 형태로 눈에 띄게 배치할 것 — 본문 끝 작은 링크가 아니라 CTA 자체가 요구사항이다.
import Link from "next/link";
import { wuxingBannerCopy } from "@/lib/wuxing/banner";
import type { Element } from "@/lib/saju-engine/constants";

export function WuxingBanner({ element }: { element: Element }) {
  const copy = wuxingBannerCopy(element);
  return (
    <div className="px-5 mb-4">
      <Link href={copy.href}>
        <div className="relative overflow-hidden rounded-2xl bg-[#1F3D34] p-5 active:scale-[0.98] transition-all duration-200 shadow-lg">
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle at 80% 0%, #C8743A 0%, transparent 60%)" }}
          />
          <p className="relative font-serif text-[16px] font-bold text-white leading-snug">{copy.title}</p>
          <p className="relative text-sm text-white/70 leading-relaxed mt-2">{copy.body}</p>
          <div className="relative mt-4 rounded-xl bg-[#C8743A] px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-bold text-white">{copy.cta}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <p className="relative text-[11px] text-white/50 mt-2 text-center">{copy.subCta}</p>
        </div>
      </Link>
    </div>
  );
}
