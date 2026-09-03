"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * §4(CEO 결정 2026-09-02): "/premium 스크롤 위치가 내비게이션에서 유지되지 않음".
 *
 * /premium의 샘플 전문이 4,000px 넘게 이어지는데(b2b49ba), 결제/로그인으로 갔다가
 * 뒤로가기로 돌아오면 스크롤이 맨 위로 리셋돼 읽던 위치를 다시 찾아 내려가야 했다.
 * Next.js App Router는 서버 컴포넌트가 다시 렌더링되는 뒤로가기에서 브라우저 기본
 * 스크롤 복원(history.scrollRestoration)이 타이밍상 안정적으로 먹지 않는다 —
 * sessionStorage에 직접 저장하고 복원한다(탭을 벗어나거나 닫아도 남도록 pagehide·
 * visibilitychange 시점에 저장).
 *
 * 페이지 컴포넌트 어디든 한 번만 렌더하면 된다(children 없음, 화면에 아무것도
 * 그리지 않음). 경로별로 키를 나눠 여러 페이지에 재사용할 수 있다.
 */
export function ScrollRestoration() {
  const pathname = usePathname();

  useEffect(() => {
    const key = `scrollY:${pathname}`;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      // 콘텐츠가 아직 자리 잡기 전이면 스크롤이 씹힐 수 있어 한 틱 미룬다.
      requestAnimationFrame(() => window.scrollTo(0, Number(saved)));
    }

    const save = () => sessionStorage.setItem(key, String(window.scrollY));
    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", save);
    return () => {
      save();
      window.removeEventListener("pagehide", save);
      window.removeEventListener("beforeunload", save);
      document.removeEventListener("visibilitychange", save);
    };
  }, [pathname]);

  return null;
}
