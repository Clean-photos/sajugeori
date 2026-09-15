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
    // §3-3(CoS 실물 재검증, 2026-09-15): 서버 삭제는 항상 성공했는데 화면이
    // 현재 경로에 그대로 멈춰 있었다 — 바로 뒤에 있던 router.refresh()가
    // 원인이었다. push()가 아직 "현재 경로"를 destiny로 들고 있는 채로
    // refresh()가 같은 경로 재요청을 큐에 넣어, 두 요청이 경합하면 늦게
    // 도착하는 destiny 응답이 push의 mypage 전환을 덮어썼다(같은 패턴이
    // compatibility/yearly/taekil/pet/ohang의 SavedReportClient에도 있어
    // 동일 수정을 적용했다). mypage는 auth()를 쓰는 동적 라우트라 push만으로
    // 이미 최신 상태를 받으므로 refresh는 불필요했다.
    router.push("/mypage");
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
