"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * 샘플을 읽는 동안 따라다니는 결제 CTA.
 *
 * 샘플 전문이 4,000px 넘게 이어지는데 결제 버튼이 최상단에만 있어서, 다 읽고
 * 사고 싶어진 사람이 맨 위까지 되돌아가야 했다. 스크롤을 조금이라도 내리면
 * 하단에 붙어 따라온다.
 *
 * 하단 탭바(fixed, 높이 63px)가 이미 화면 아래를 차지하고 있으므로 그 위에 올린다.
 * 처음부터 띄우면 상단 CTA와 겹쳐 같은 버튼이 두 개로 보이므로, 상단 CTA가
 * 화면에서 사라질 만큼 내려갔을 때부터 나타낸다.
 */
export function SampleStickyCta({ href, price }: { href: string; price: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 px-4 transition-all duration-200 ${
        visible ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
      }`}
      style={{ bottom: 63 + 8 }}
      aria-hidden={!visible}
    >
      <Link
        href={href}
        tabIndex={visible ? undefined : -1}
        className="flex items-center justify-between rounded-2xl bg-[#C8743A] text-white px-5 py-3.5 shadow-lg shadow-black/15"
      >
        <span className="text-sm font-semibold">전체 풀이 열람하기</span>
        <span className="text-xs opacity-90">{price.toLocaleString()}원 · 1회 결제</span>
      </Link>
    </div>
  );
}
