"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SAFETY_TIMEOUT_MS = 6000;

/**
 * 페이지 전환(내부 링크 클릭)이 느릴 때 "클릭이 씹혔나?" 불안을 없애기 위한
 * 전역 상단 로딩바. 클릭 즉시(라우트가 실제로 바뀌기 전) 표시되고, 경로가
 * 바뀌면 사라진다. 앵커 클릭이 아닌 폼 제출·API 호출은 각 버튼의 자체
 * 스피너가 담당하므로 여기서는 다루지 않는다.
 */
export function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = `${pathname}?${searchParams.toString()}`;
  const prevKeyRef = useRef(key);

  useEffect(() => {
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key;
      setActive(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [key]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return; // 외부 링크
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // 같은 페이지

      setActive(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setActive(false), SAFETY_TIMEOUT_MS);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  if (!active) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent pointer-events-none">
      <div className="h-full w-2/5 bg-[#C8743A] animate-route-progress" />
    </div>
  );
}
