"use client";

import { useRouter } from "next/navigation";
import type { WuxingReportData } from "@/lib/wuxing/report";
import { WuxingReportResultView } from "@/components/wuxing/WuxingReportResultView";

type Target = { birth_date: string; birth_time: string | null; gender: string };

/**
 * §1(CoS 결정 2026-09-08): 저장된 리포트를 다시 여는 화면 — 이용권 검사가
 * 아예 없다(서버 컴포넌트에서 소유권만 확인하고 이미 통과했다). 삭제만
 * 클라이언트에서 처리하고, 삭제 후에는 마이페이지로 돌려보낸다.
 */
export function SavedReportClient({ report, target, reportId }: { report: WuxingReportData; target?: Target; reportId?: string }) {
  const router = useRouter();

  async function handleDelete() {
    // 일반 저장본은 이 행의 PK로, 가족·지인(018) 소급 열람은 대상(생년월일시·성별)으로 지운다.
    let res: Response;
    if (reportId) {
      res = await fetch(`/api/premium/wuxing?id=${encodeURIComponent(reportId)}`, { method: "DELETE" });
    } else if (target) {
      const q = new URLSearchParams({ birth_date: target.birth_date, gender: target.gender });
      if (target.birth_time) q.set("birth_time", target.birth_time);
      res = await fetch(`/api/premium/wuxing?${q.toString()}`, { method: "DELETE" });
    } else {
      throw new Error("delete failed");
    }
    if (!res.ok) throw new Error("delete failed");
    router.push("/mypage");
  }

  return <WuxingReportResultView report={report} onDelete={handleDelete} />;
}
