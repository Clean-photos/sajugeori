"use client";

import { useEffect, useState } from "react";
import type { BlueprintReport } from "@/lib/blueprint-engine/generate";
import { BlueprintReportView } from "@/components/blueprint/BlueprintReportView";

export function DestinyReport() {
  const [report, setReport] = useState<BlueprintReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  async function load(regenerate = false) {
    setError("");
    if (regenerate) setRegenerating(true); else setLoading(true);
    try {
      const res = await fetch(`/api/premium/destiny${regenerate ? "?regenerate=1" : ""}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error === "profile_required" ? "먼저 사주를 등록해 주세요." : (data?.message ?? data?.error ?? "불러오지 못했습니다."));
        return;
      }
      setReport(data.report as BlueprintReport);
    } catch {
      setError("풀이를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }

  useEffect(() => { load(false); }, []);

  if (loading) {
    return (
      <div className="px-4 py-10 flex flex-col items-center gap-3">
        <div className="text-3xl animate-pulse">🔮</div>
        <p className="text-sm text-[#6B6661]">운명 설계도를 그리고 있어요...</p>
        <p className="text-xs text-[#9B968F]">24개 질문에 답을 만드는 중이라, 처음 생성은 3~4분 정도 걸릴 수 있어요</p>
        <p className="text-xs text-[#9B968F]">창을 닫지 말고 잠시만 기다려 주세요</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8 flex flex-col items-center gap-3">
        <p className="text-sm text-[#C0392B]">{error}</p>
        <button onClick={() => load(false)} className="text-sm text-[#1F3D34] underline underline-offset-2">
          다시 시도
        </button>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="flex flex-col gap-3">
      <BlueprintReportView report={report} />
      <button
        onClick={() => load(true)}
        disabled={regenerating}
        className="no-print mt-1 text-center text-xs text-[#6B6661] py-2 disabled:opacity-50"
      >
        {regenerating ? "다시 생성 중... (3~4분)" : "풀이 다시 생성하기"}
      </button>
      <p className="no-print text-center text-[11px] text-[#9B968F]">생성된 결과는 1년간 다시 볼 수 있습니다</p>
    </div>
  );
}
