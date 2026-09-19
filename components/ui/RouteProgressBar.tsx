"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SAFETY_TIMEOUT_MS = 6000;

/** 현재 화면과 다른 같은 출처 이동인지 — 같은 페이지·외부 링크·해시는 로딩바를 켜지 않는다. */
function isRealNavigation(href: string): boolean {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return false;
  }
  if (url.origin !== window.location.origin) return false;
  return !(url.pathname === window.location.pathname && url.search === window.location.search);
}

/**
 * 페이지 전환이 느릴 때 "클릭이 씹혔나?" 불안을 없애기 위한 전역 상단 로딩바.
 * 전환이 시작되는 즉시(라우트가 실제로 바뀌기 전) 켜지고, 경로가 바뀌면 꺼진다.
 *
 * 켜지는 경로 두 가지:
 *  1) 내부 <a href>/<Link> 클릭 — 문서 레벨 캡처 리스너.
 *  2) router.push()/replace() 호출 — 삭제·쿠폰 적용처럼 "API가 끝난 뒤 이동"하는
 *     <button onClick>은 앵커가 아니라 1)에 안 걸린다. 그 뒤 목적지 페이지가 서버에서
 *     데이터를 가져오는 동안(예: 마이페이지) 화면이 멈춘 것처럼 보였다.
 *
 * 2026-09-17 정정: 처음엔 history.pushState를 가로채는 방식으로 2)를 처리했으나
 * 실측(3초 걸리는 페이지로 router.push) 결과 Next는 서버 응답이 도착한 뒤에야
 * pushState를 부른다 — 호출 후 0~3초 대기 구간엔 로딩바가 없고 전환 직전에야 켜져
 * 무의미했다. 그래서 router 객체의 push/replace 메서드를 직접 감싼다(모든 컴포넌트의
 * useRouter()가 같은 객체를 돌려주므로 한 곳에서 감싸면 전부 적용된다).
 */
export function RouteProgressBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = `${pathname}?${searchParams.toString()}`;
  const prevKeyRef = useRef(key);

  const activate = useCallback(() => {
    setActive(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setActive(false), SAFETY_TIMEOUT_MS);
  }, []);

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
      if (isRealNavigation(anchor.getAttribute("href") ?? "")) activate();
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [activate]);

  useEffect(() => {
    const origPush = router.push;
    const origReplace = router.replace;
    router.push = ((href: string, ...rest: unknown[]) => {
      if (isRealNavigation(String(href))) activate();
      return (origPush as (...a: unknown[]) => void).call(router, href, ...rest);
    }) as typeof router.push;
    router.replace = ((href: string, ...rest: unknown[]) => {
      if (isRealNavigation(String(href))) activate();
      return (origReplace as (...a: unknown[]) => void).call(router, href, ...rest);
    }) as typeof router.replace;
    return () => {
      router.push = origPush;
      router.replace = origReplace;
    };
  }, [router, activate]);

  if (!active) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent pointer-events-none">
      <div className="h-full w-2/5 bg-[#C8743A] animate-route-progress" />
    </div>
  );
}
