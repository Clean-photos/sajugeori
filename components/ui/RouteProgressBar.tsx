"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SAFETY_TIMEOUT_MS = 6000;
const NAV_START_EVENT = "route-progress:nav-start";

/**
 * 2026-09-17(CoS 실물 확인: "사주거리가 전체적으로 느린데 클릭해도 반응이
 * 없다"): 이 컴포넌트는 원래 <a href> 클릭만 감지했다 — 그런데 삭제·쿠폰
 * 적용처럼 "먼저 API를 기다렸다가 성공하면 router.push()"하는 버튼은 앵커가
 * 아니라 <button onClick>이라 이 감지에 전혀 안 걸렸다. 그 버튼들은 자체
 * 스피너로 "API 기다리는 동안"은 이미 표시하지만, API가 끝난 뒤
 * router.push()가 실제 페이지 전환을 마칠 때까지(목적지 페이지가 서버에서
 * 데이터를 다 가져오는 시간, 예: 마이페이지) 보여줄 것이 없어 그 구간만
 * "먹통처럼" 보였다. Next의 클라이언트 라우터는 결국 history.pushState/
 * replaceState를 호출하므로, 그걸 가로채면 트리거가 무엇이든(Link, 앵커,
 * 어떤 버튼의 router.push()든) 전부 잡힌다 — 폼 자체의 스피너와 겹치는
 * 구간이 있어도 문제없다(둘 다 "로딩 중"이라는 같은 사실을 말할 뿐).
 */
function patchHistoryOnce() {
  const w = window as typeof window & { __routeProgressPatched?: boolean };
  if (w.__routeProgressPatched) return;
  w.__routeProgressPatched = true;
  const notify = () => window.dispatchEvent(new Event(NAV_START_EVENT));
  const origPush = window.history.pushState.bind(window.history);
  window.history.pushState = (...args) => {
    notify();
    return origPush(...args);
  };
  const origReplace = window.history.replaceState.bind(window.history);
  window.history.replaceState = (...args) => {
    notify();
    return origReplace(...args);
  };
}

/**
 * 페이지 전환이 느릴 때 "클릭이 씹혔나?" 불안을 없애기 위한 전역 상단
 * 로딩바. 클릭 즉시(또는 router.push() 호출 즉시, 라우트가 실제로 바뀌기
 * 전) 표시되고, 경로가 바뀌면 사라진다. 페이지 전환이 없는 폼 제출·API
 * 호출은 각 버튼의 자체 스피너가 담당한다.
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
    function activate() {
      setActive(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setActive(false), SAFETY_TIMEOUT_MS);
    }

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

      activate();
    }

    // router.push()/replace()가 실제로 URL을 바꾸는 순간(트리거가 앵커든,
    // 삭제·쿠폰 적용처럼 API 완료 후 호출하는 버튼이든) 전부 여기로 모인다.
    patchHistoryOnce();
    window.addEventListener(NAV_START_EVENT, activate);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener(NAV_START_EVENT, activate);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  if (!active) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent pointer-events-none">
      <div className="h-full w-2/5 bg-[#C8743A] animate-route-progress" />
    </div>
  );
}
