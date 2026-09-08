"use client";

import { useRouter } from "next/navigation";
import { YearlyReportResultView } from "@/components/premium/YearlyReportResultView";

type Target = { birth_date: string; birth_time: string | null; gender: string };

/**
 * §1(CoS 결정 2026-09-08): 저장된 리포트를 다시 여는 화면 — 이용권 검사가
 * 아예 없다(서버 컴포넌트에서 소유권만 확인하고 이미 통과했다).
 */
export function SavedReportClient({ content, year, target }: { content: string; year: number; target: Target | null }) {
  const router = useRouter();

  async function handleDelete() {
    const res = await fetch("/api/premium/yearly", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, ...(target ?? {}) }),
    });
    if (!res.ok) throw new Error("delete failed");
    router.push("/mypage");
    router.refresh();
  }

  return <YearlyReportResultView report={content} year={year} onDelete={handleDelete} />;
}
