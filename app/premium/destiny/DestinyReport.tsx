"use client";

import { useEffect, useRef, useState } from "react";
import type { BlueprintReport, BlueprintPartial } from "@/lib/blueprint-engine/generate";
import { BlueprintReportView } from "@/components/blueprint/BlueprintReportView";
import { DeleteReportButton } from "@/components/premium/DeleteReportButton";

type ApiState =
  | { status: "loading" }
  | { status: "done"; report: BlueprintReport; regenerateCount: number }
  | { status: "generating"; partial: BlueprintPartial }
  | { status: "failed"; partial: BlueprintPartial; error: string }
  | { status: "error"; message: string }
  | { status: "deleted" };

export function DestinyReport() {
  const [state, setState] = useState<ApiState>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  // 폴링 한 번 = 스텝 하나(LLM 호출 하나)가 서버에서 끝날 때까지 기다리는
  // 요청이라 응답 자체가 수십 초 걸릴 수 있다. setInterval을 쓰면 이전
  // 요청이 안 끝났는데 다음 요청이 겹쳐 나갈 수 있어, 응답을 받은 뒤에만
  // 다음 요청을 보내는 자기재귀 방식을 쓴다.
  const runningRef = useRef(false);

  async function fetchOnce(params?: string): Promise<ApiState> {
    try {
      const res = await fetch(`/api/premium/destiny${params ? `?${params}` : ""}`);
      const data = await res.json();
      if (!res.ok) {
        return { status: "error", message: data?.error === "profile_required" ? "먼저 사주를 등록해 주세요." : (data?.message ?? data?.error ?? "불러오지 못했습니다.") };
      }
      if (data.status === "done") return { status: "done", report: data.report as BlueprintReport, regenerateCount: data.regenerateCount ?? 0 };
      if (data.status === "generating") return { status: "generating", partial: (data.partial ?? {}) as BlueprintPartial };
      if (data.status === "failed") return { status: "failed", partial: (data.partial ?? {}) as BlueprintPartial, error: data.error ?? "생성에 실패했습니다." };
      return { status: "error", message: "알 수 없는 응답입니다." };
    } catch {
      return { status: "error", message: "풀이를 불러오지 못했습니다." };
    }
  }

  async function driveSteps(params?: string) {
    if (runningRef.current) return;
    runningRef.current = true;
    setBusy(true);
    try {
      let next = await fetchOnce(params);
      setState(next);
      while (next.status === "generating") {
        next = await fetchOnce();
        setState(next);
      }
    } finally {
      runningRef.current = false;
      setBusy(false);
    }
  }

  useEffect(() => { driveSteps(); }, []);

  function regenerate() {
    if (!window.confirm("전체를 다시 생성할까요? 재생성은 1회만 가능합니다.")) return;
    driveSteps("regenerate=1");
  }

  async function handleDelete() {
    const res = await fetch("/api/premium/destiny", { method: "DELETE" });
    if (!res.ok) throw new Error("delete failed");
    setState({ status: "deleted" });
  }

  if (state.status === "deleted") {
    return (
      <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-[#1A1A18]">결과를 삭제했습니다.</p>
        <p className="text-xs text-[#6B6661]">다시 보려면 운명 설계도를 새로 결제해 주세요.</p>
      </div>
    );
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
        <button onClick={() => driveSteps()} className="text-sm text-[#1F3D34] underline underline-offset-2">
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
          <p className="text-xs text-[#9B968F]">처음 생성은 3~5분 정도 걸릴 수 있어요. 창을 닫았다 다시 열어도 진행된 부분은 그대로 남아있어요</p>
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
          <button onClick={() => driveSteps()} disabled={busy} className="text-sm text-white bg-[#1F3D34] rounded-full px-4 py-2 disabled:opacity-50">
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
        {state.regenerateCount >= 1 ? "재생성 1회 사용 완료" : busy ? "다시 생성 중... (3~5분)" : "풀이 다시 생성하기 (1회 한정)"}
      </button>
      <p className="no-print text-center text-[11px] text-[#9B968F]">생성된 결과는 1년간 다시 볼 수 있습니다</p>
      <DeleteReportButton onConfirm={handleDelete} />
    </div>
  );
}
