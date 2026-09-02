"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** 사람만 목적지로 넘긴다. 크롤러는 JS를 실행하지 않으므로 부모의 OG 메타만 읽는다. */
export function OhangForward({ to }: { to: string }) {
  const router = useRouter();
  // replace를 쓴다 — back으로 돌아왔을 때 이 경유 페이지가 다시 잡히면 무한 왕복이 된다.
  useEffect(() => { router.replace(to); }, [router, to]);
  return null;
}
