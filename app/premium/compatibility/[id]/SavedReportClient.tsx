"use client";

import { useRouter } from "next/navigation";
import { CompatReportResultView } from "@/components/premium/CompatReportResultView";
import type { CompatPillarSummary } from "@/lib/premium/compat-pillars";

/**
 * §1(CoS 결정 2026-09-08): 저장된 리포트를 다시 여는 화면 — 이용권 검사가
 * 아예 없다(서버 컴포넌트에서 소유권만 확인하고 이미 통과했다). 삭제는 이 행의
 * PK(reportId)로 바로 보낸다.
 */
export function SavedReportClient({
  content, score, reportId, pillars,
}: {
  content: string;
  score: number | null;
  reportId: string;
  pillars?: { a: CompatPillarSummary; b: CompatPillarSummary } | null;
}) {
  const router = useRouter();

  async function handleDelete() {
    const res = await fetch("/api/premium/compatibility", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reportId }),
    });
    if (!res.ok) throw new Error("delete failed");
    router.push("/mypage");
    router.refresh();
  }

  return <CompatReportResultView report={content} score={score} pillars={pillars} onDelete={handleDelete} />;
}
