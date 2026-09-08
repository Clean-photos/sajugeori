"use client";

import { useRouter } from "next/navigation";
import { PetReportResultView } from "@/components/premium/PetReportResultView";

/**
 * §1(CoS 결정 2026-09-08): 저장된 리포트를 다시 여는 화면 — 이용권 검사가
 * 아예 없다(서버 컴포넌트에서 소유권만 확인하고 이미 통과했다). 삭제는 이 행의
 * PK(reportId)로 바로 보낸다(species·이름으로 되짚어 찾지 않는다 — route.ts 주석 참고).
 */
export function SavedReportClient({
  content,
  species,
  petLabel,
  petName,
  reportId,
}: {
  content: string;
  species: "dog" | "cat";
  petLabel: string;
  petName: string;
  reportId: string;
}) {
  const router = useRouter();

  async function handleDelete() {
    const res = await fetch("/api/premium/pet", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reportId }),
    });
    if (!res.ok) throw new Error("delete failed");
    router.push("/mypage");
    router.refresh();
  }

  return <PetReportResultView report={content} species={species} petLabel={petLabel} petName={petName} onDelete={handleDelete} />;
}
