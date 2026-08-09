"use client";

import { useEffect, useRef, useState } from "react";
import type { BlueprintReport, BlueprintPartial } from "@/lib/blueprint-engine/generate";
import { BlueprintReportView } from "@/components/blueprint/BlueprintReportView";

const POLL_MS = 4000;

type ApiState =
  | { status: "loading" }
  | { status: "done"; report: BlueprintReport; regenerateCount: number }
  | { status: "generating"; partial: BlueprintPartial }
  | { status: "failed"; partial: BlueprintPartial; error: string }
  | { status: "error"; message: string };

export function DestinyReport() {
  const [state, setState] = useState<ApiState>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function fetchOnce(params?: string) {
    try {
      const res = await fetch(`/api/premium/destiny${params ? `?${params}` : ""}`);
      const data = await res.json();
      if (!res.ok) {
        stopPolling();
        setState({ status: "error", message: data?.error === "profile_required" ? "먼저 사주를 등록해 주세요." : (data?.message ?? data?.error ?? "불러오지 못했습니다.") });
        return;
      }
      if (data.status === "done") {
        stopPolling();
        setState({ status: "done", report: data.report as BlueprintReport, regenerateCount: data.regenerateCount ?? 0 });
      } else if (data.status === "generating") {
        setState({ status: "generating", partial: (data.partial ?? {}) as BlueprintPartial });
        if (!pollRef.current) pollRef.current = setInterval(() => fetchOnce(), POLL_MS);
      } else if (data.status === "failed") {
        stopPolling();
        setState({ status: "failed", partial: (data.partial ?? {}) as BlueprintPartial, error: data.error ?? "생성에 실패했습니다." });
      }
    } catch {
      stopPolling();
      setState({ status: "error", message: "풀이를 불러오지 못했습니다." });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { fetchOnce(); return () => stopPolling(); }, []);

  async function retryFailedParts() {
    setBusy(true);
    await fetchOnce("retry=1");
  }

  async function regenerate() {
    if (!window.confirm("전체를 다시 생성할까요? 재생성은 1회만 가능합니다.")) return;
    setBusy(true);
    await fetchOnce("regenerate=1");
  }

  if (state.status === "loading") {
    return (
      <div className="px-4 py-10 flex flex-col items-center gap-3">
        <div className="text-3xl animate-pulse">🔮</div>
        <p className="text-sm text-[#6B6661]">운명 설계도를 그리고 있어요...</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="px-4 py-8 flex flex-col items-center gap-3">
        <p className="text-sm text-[#C0392B]">{state.message}</p>
        <button onClick={() => { setState({ status: "loading" }); fetchOnce(); }} className="text-sm text-[#1F3D34] underline underline-offset-2">
          다시 시도
        </button>
      </div>
    );
  }

  if (state.status === "generating") {
    return (
      <div className="flex flex-col gap-3">
        <div className="px-4 pt-6 pb-2 flex flex-col items-center gap-2 text-center">
          <div className="text-2xl animate-pulse">🔮</div>
          <p className="text-sm text-[#6B6661]">24개 질문에 답을 만들고 있어요. 순서대로 화면에 나타납니다</p>
          <p className="text-xs text-[#9B968F]">처음 생성은 3~4분 정도 걸릴 수 있어요. 이 창을 닫아도 서버에서 계속 생성되니, 나중에 다시 들어오면 이어서 볼 수 있어요</p>
        </div>
        <BlueprintReportView report={state.partial} />
      </div>
    );
  }

  if (state.status === "failed") {
    return (
      <div className="flex flex-col gap-3">
        <div className="px-4 pt-4 flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-[#C0392B]">일부 생성에 실패했습니다: {state.error}</p>
          <button onClick={retryFailedParts} disabled={busy} className="text-sm text-white bg-[#1F3D34] rounded-full px-4 py-2 disabled:opacity-50">
            {busy ? "재시도 중..." : "실패한 부분만 다시 생성"}
          </button>
        </div>
        <BlueprintReportView report={state.partial} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <BlueprintReportView report={state.report} />
      <button
        onClick={regenerate}
        disabled={busy || state.regenerateCount >= 1}
        className="no-print mt-1 text-center text-xs text-[#6B6661] py-2 disabled:opacity-50"
      >
        {state.regenerateCount >= 1 ? "재생성 1회 사용 완료" : busy ? "다시 생성 중... (3~4분)" : "풀이 다시 생성하기 (1회 한정)"}
      </button>
      <p className="no-print text-center text-[11px] text-[#9B968F]">생성된 결과는 1년간 다시 볼 수 있습니다</p>
    </div>
  );
}
