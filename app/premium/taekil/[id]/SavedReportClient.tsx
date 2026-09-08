"use client";

import { useRouter } from "next/navigation";
import { TaekilReportResultView, type TaekilBestDate } from "@/components/premium/TaekilReportResultView";

/**
 * §1(CoS 결정 2026-09-08): 저장된 리포트를 다시 여는 화면 — 이용권 검사가
 * 아예 없다(서버 컴포넌트에서 소유권만 확인하고 이미 통과했다).
 */
export function SavedReportClient({ content, best, reportId }: { content: string; best: TaekilBestDate[]; reportId: string }) {
  const router = useRouter();

  async function handleDelete() {
    const res = await fetch("/api/premium/taekil", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reportId }),
    });
    if (!res.ok) throw new Error("delete failed");
    router.push("/mypage");
    router.refresh();
  }

  return <TaekilReportResultView report={content} best={best} onDelete={handleDelete} />;
}
