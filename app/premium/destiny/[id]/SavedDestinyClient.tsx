"use client";

import { useRouter } from "next/navigation";
import type { BlueprintReport } from "@/lib/blueprint-engine/generate";
import { BlueprintReportView } from "@/components/blueprint/BlueprintReportView";
import { DeleteReportButton } from "@/components/premium/DeleteReportButton";

type Target = { birth_date: string; birth_time: string | null; gender: string };

/**
 * §2-11순위: ID로 연 저장본 전용 — 생성/재생성 상태 머신(DestinyReport.tsx)은
 * 여기서 다루지 않는다. 삭제만 기존 DELETE 엔드포인트를 그대로 호출한다
 * (대상을 함께 보내는 계약은 route.ts와 동일 — 이 페이지가 profile에서
 * 읽어온 생년월일시를 그대로 실어 보낸다).
 */
export function SavedDestinyClient({ report, target }: { report: BlueprintReport; target: Target }) {
  const router = useRouter();

  async function handleDelete() {
    const q = new URLSearchParams({ birth_date: target.birth_date, gender: target.gender });
    if (target.birth_time) q.set("birth_time", target.birth_time);
    const res = await fetch(`/api/premium/destiny?${q.toString()}`, { method: "DELETE" });
    if (!res.ok) throw new Error("delete failed");
    router.push("/mypage");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <BlueprintReportView report={report} />
      <p className="no-print text-center text-[11px] text-[#9B968F]">생성된 결과는 1년간 다시 볼 수 있습니다</p>
      <div className="px-4">
        <DeleteReportButton onConfirm={handleDelete} />
      </div>
    </div>
  );
}
