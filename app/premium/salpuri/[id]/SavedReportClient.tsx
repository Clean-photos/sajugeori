"use client";

import { useRouter } from "next/navigation";
import { SalpuriReportResultView, type DetectedSal } from "@/components/premium/SalpuriReportResultView";
import type { SalpuriCardData } from "@/lib/premium/salpuri-card";

type Target = { birth_date: string; birth_time: string | null; gender: string };

/**
 * §1(CoS 결정 2026-09-08): 저장된 리포트를 다시 여는 화면 — 이용권 검사가
 * 아예 없다(서버 컴포넌트에서 소유권만 확인하고 이미 통과했다). 삭제만
 * 클라이언트에서 처리하고, 삭제 후에는 마이페이지로 돌려보낸다.
 */
export function SavedReportClient({ content, sal, card, reportId }: { content: string; sal: DetectedSal[]; card: SalpuriCardData | null; target?: Target; reportId: string }) {
  const router = useRouter();

  async function handleDelete() {
    // 이 행의 정확한 PK로 지운다 — "지금의 본인 프로필"과 이 리포트의 프로필이 달라도 안전하다.
    const res = await fetch(`/api/premium/salpuri?id=${encodeURIComponent(reportId)}`, { method: "DELETE" });
    if (!res.ok) throw new Error("delete failed");
    router.push("/mypage");
    router.refresh();
  }

  return <SalpuriReportResultView report={content} sal={sal} card={card} onDelete={handleDelete} />;
}
