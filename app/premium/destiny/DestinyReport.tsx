"use client";

import { useEffect, useRef, useState } from "react";
import type { BlueprintReport, BlueprintPartial } from "@/lib/blueprint-engine/generate";
import { BlueprintReportView } from "@/components/blueprint/BlueprintReportView";
import { DeleteReportButton } from "@/components/premium/DeleteReportButton";
import { WaitingCards } from "@/components/premium/WaitingCards";
import { SajuInputForm, type SavedSaju } from "@/components/premium/SajuInputForm";
import { Spinner } from "@/components/ui/Spinner";
import { trackEvent } from "@/lib/analytics";

type ApiState =
  | { status: "loading" }
  | { status: "done"; report: BlueprintReport; regenerateCount: number }
  | { status: "generating"; partial: BlueprintPartial }
  | { status: "failed"; partial: BlueprintPartial; error: string }
  // 2026-09-22(CoS 실물 재검증): 마지막 스텝(실행설계·조언5)이 60초 제한에 걸려
  // 서버 함수가 killed되면, 서버는 정상 흐름대로라면 찍었을 status:"failed" JSON
  // 응답조차 못 보내고 그냥 연결이 끊긴다 — 클라이언트는 res.json() 파싱 실패로
  // catch에 떨어져 이 "error" 상태가 된다. 그런데 실측 확인 결과 서버 쪽 DB에는
  // 이미 24/24 답이 전부 저장돼 있고, 그 직후(또는 다음 폴링에) 실제로 완성돼
  // "done"으로 남아 있었다 — 화면만 통째로 하얗게 지워진 것이지 진행 상황은
  // 전혀 안 날아간 상태였다. partial을 들고 다녀 이 상태에서도 24개 답을 계속
  // 보여주고, "다시 시도"가 이어서 폴링하는 같은 경로(driveSteps)를 타게 한다.
  | { status: "error"; message: string; partial: BlueprintPartial | null }
  | { status: "deleted" };

type Target = { birth_date: string; birth_time: string | null; gender: string };

/** 대상 사주를 쿼리 문자열로 만든다. 폴링마다 같은 값이 가야 이어서 생성된다. */
function targetQuery(t: Target): string {
  const q = new URLSearchParams({ birth_date: t.birth_date, gender: t.gender });
  if (t.birth_time) q.set("birth_time", t.birth_time);
  return q.toString();
}

export function DestinyReport({
  saved, hasOwnReport = false, hasUnusedPass = false,
}: { saved: SavedSaju; hasOwnReport?: boolean; hasUnusedPass?: boolean }) {
  // 대상을 확정하기 전에는 생성을 시작하지 않는다(생성 직전 컨펌).
  // §0-2⑥(CoS 실물 재검증, 2026-09-10): 단, 본인 프로필로 이미 만들어 둔
  // 설계도가 있으면(hasOwnReport) 매번 이 확정 폼부터 다시 보여주지 않는다 —
  // "/premium/destiny가 빈 폼"으로 보고된 실제 원인. 곧장 저장본을 불러온다.
  const [target, setTarget] = useState<Target | null>(hasOwnReport && saved ? saved : null);
  const [state, setState] = useState<ApiState>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  // §1-2순위(CoS 실물 재검증, 2026-09-11): 재생성 확인을 window.confirm()으로
  // 띄웠는데, 이 네이티브 다이얼로그는 응답이 올 때까지 메인 스레드를 통째로
  // 막는다 — 자동화 도구는 이를 처리하지 못해 "메인 스레드 점유·document_idle
  // 미도달"로 관측됐고(사람에게도 좋은 UX가 아니다), confirm이 응답 대기로
  // 남으면 실제로는 아무 요청도 안 나가 "실패 안내 없이 원래 저장본으로 복귀"·
  // "기회는 소진 안 됨"과 정확히 들어맞는다. 이 앱의 다른 곳(DeleteReportButton)
  // 과 같은 인페이지 확인 패널로 교체 — 네이티브 다이얼로그를 쓰지 않는다.
  const [confirmingRegen, setConfirmingRegen] = useState(false);
  // 2026-09-22(CoS 실물 확인 §2-1): 이 프로필로 이미 완성본이 있으면, 미사용 이용권이
  // 있어도 그걸 쓸 버튼이 화면에 없었다 — 캐시(완성본)가 항상 먼저 보여 이용권 소진
  // 코드에 닿지 못하는 990원 상품군과 같은 문제였는데, 운명 설계도는 blueprint_reports가
  // 프로필당 한 행뿐이라(다단계 상태를 담아야 해서 990원 상품처럼 캐시만 건너뛸 수 없다)
  // 유일한 해법이 "결과 삭제 후 재생성"이다 — 그 두 단계를 버튼 하나로 묶는다.
  const [confirmingUsePass, setConfirmingUsePass] = useState(false);
  const [usingPass, setUsingPass] = useState(false);
  // 폴링 한 번 = 스텝 하나(LLM 호출 하나)가 서버에서 끝날 때까지 기다리는
  // 요청이라 응답 자체가 수십 초 걸릴 수 있다. setInterval을 쓰면 이전
  // 요청이 안 끝났는데 다음 요청이 겹쳐 나갈 수 있어, 응답을 받은 뒤에만
  // 다음 요청을 보내는 자기재귀 방식을 쓴다.
  const runningRef = useRef(false);
  // 2026-09-22(CoS 실물 재검증): fetch 자체가 실패하면(60초 제한으로 서버 함수가
  // 죽어 JSON 응답을 아예 못 받는 경우) 화면이 "풀이를 불러오지 못했습니다"로
  // 완전히 비었었다 — 그런데 그 시점 서버 DB에는 24/24 답이 이미 저장돼 있고
  // 곧 done으로 남는 경우가 실측 확인됐다. 마지막으로 본 partial을 들고 있다가
  // fetch 실패 시에도 함께 보여준다("사라진 게 아니다"를 화면으로 증명).
  const lastPartialRef = useRef<BlueprintPartial | null>(null);

  async function fetchOnce(params?: string): Promise<ApiState> {
    try {
      const res = await fetch(`/api/premium/destiny?${params}`);
      const data = await res.json();
      if (!res.ok) {
        return {
          status: "error",
          message: data?.error === "profile_required" ? "먼저 사주를 등록해 주세요." : (data?.message ?? data?.error ?? "불러오지 못했습니다."),
          partial: lastPartialRef.current,
        };
      }
      if (data.status === "done") return { status: "done", report: data.report as BlueprintReport, regenerateCount: data.regenerateCount ?? 0 };
      if (data.status === "generating") return { status: "generating", partial: (data.partial ?? {}) as BlueprintPartial };
      if (data.status === "failed") return { status: "failed", partial: (data.partial ?? {}) as BlueprintPartial, error: data.error ?? "생성에 실패했습니다." };
      return { status: "error", message: "알 수 없는 응답입니다.", partial: lastPartialRef.current };
    } catch {
      return { status: "error", message: "풀이를 불러오지 못했습니다.", partial: lastPartialRef.current };
    }
  }

  async function driveSteps(t: Target, extra?: string) {
    if (runningRef.current) return;
    runningRef.current = true;
    setBusy(true);
    const base = targetQuery(t);
    // §1(CoS 실물 확인, 2026-09-16): report_generated/generation_failed가
    // 하나도 안 나가 "결제됐는데 생성만 실패하는" 비율을 알 방법이 없었다.
    // 폴링(스텝 여러 번)이 최종 상태(done/failed/error)에 도달할 때 1회만
    // 보낸다 — 중간 "generating" 스텝마다 보내면 이벤트가 부풀려진다.
    const start = Date.now();
    try {
      let next = await fetchOnce(extra ? `${base}&${extra}` : base);
      if (next.status === "generating" || next.status === "failed") lastPartialRef.current = next.partial;
      setState(next);
      while (next.status === "generating") {
        next = await fetchOnce(base);
        if (next.status === "generating" || next.status === "failed") lastPartialRef.current = next.partial;
        setState(next);
      }
      if (next.status === "done") {
        trackEvent("report_generated", { item_id: "destiny", duration_ms: Date.now() - start });
      } else if (next.status === "failed" || next.status === "error") {
        trackEvent("generation_failed", {
          item_id: "destiny",
          reason: next.status === "failed" ? next.error : next.message,
        });
      }
    } finally {
      runningRef.current = false;
      setBusy(false);
    }
  }

  // 확정 전에는 자동 시작하지 않는다. 확정되면 그때부터 폴링을 돌린다.
  useEffect(() => { if (target) driveSteps(target); }, [target]);

  function regenerate() {
    if (!target) return;
    setConfirmingRegen(false);
    driveSteps(target, "regenerate=1");
  }

  async function handleDelete() {
    // 대상을 함께 보낸다 — 안 보내면 다른 대상의 설계도가 지워진다.
    const res = await fetch(`/api/premium/destiny?${target ? targetQuery(target) : ""}`, { method: "DELETE" });
    if (!res.ok) throw new Error("delete failed");
    setState({ status: "deleted" });
  }

  /** 미사용 이용권으로 처음부터 다시 만든다 — 기존 완성본을 지우고 바로 새로 생성한다. */
  async function useNewPass() {
    if (!target) return;
    setConfirmingUsePass(false);
    setUsingPass(true);
    try {
      const res = await fetch(`/api/premium/destiny?${targetQuery(target)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setState({ status: "loading" });
      await driveSteps(target);
    } finally {
      setUsingPass(false);
    }
  }

  // 대상 확정 화면 — 등록된 사주가 있으면 채워진 채로 뜨고, 체크를 풀면
  // 가족·친구 사주로도 설계도를 만들 수 있다.
  if (!target) {
    return (
      <SajuInputForm
        saved={saved}
        busy={false}
        confirmMode
        onSubmit={(v) => setTarget(v)}
        submitLabel="이 사주로 운명 설계도 만들기"
      />
    );
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
        <WaitingCards />
      </div>
    );
  }

  if (state.status === "error") {
    // 2026-09-22(CoS 실물 재검증): partial이 있으면(=이미 몇 문항이든 만들어져 있었다는
    // 뜻) "처음부터 다시"처럼 보이지 않게 그 내용을 그대로 보여준다. "다시 시도"는
    // driveSteps(target)로 이어서 폴링하는 것과 완전히 같은 경로다 — 서버 쪽 진행
    // 상태(status가 generating/failed/done 무엇이든)를 그대로 이어받는다.
    const hasPartial = state.partial && (state.partial.axes?.length || state.partial.overview || state.partial.narrative);
    return (
      <div className="flex flex-col gap-3">
        <div className="px-4 py-6 flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-[#C0392B]">{state.message}</p>
          {hasPartial && (
            <p className="text-xs text-[#6B6661]">지금까지 만든 내용은 저장돼 있어요. 다시 시도하면 이어서 진행됩니다.</p>
          )}
          <button
            onClick={() => driveSteps(target)}
            disabled={busy}
            className="flex items-center justify-center gap-1.5 text-sm text-white bg-[#1F3D34] rounded-full px-4 py-2 disabled:opacity-50"
          >
            {busy && <Spinner size={14} />}
            {busy ? "이어서 확인하는 중..." : "다시 시도"}
          </button>
        </div>
        {hasPartial && <BlueprintReportView report={state.partial!} />}
      </div>
    );
  }

  if (state.status === "generating") {
    // §3(CoS 실물 재검증, 2026-09-13): 클릭 후 53초간 화면 변화가 전혀 없는
    // 구간이 있고, 그 뒤로도 문항 단위 계단식 렌더 사이 20~30초씩 정지된
    // 것처럼 보인다는 지적 — "n/24 문항 완료" 카운터를 붙이면 체감이 크게
    // 달라진다고 CoS가 직접 제안했다. state.partial.axes는 이미 완료된 축의
    // questions 배열을 그대로 들고 있어(서버가 축 하나를 통으로 채워 넘김),
    // 서버 변경 없이 그 길이 합만 세면 된다.
    const answeredCount = state.partial.axes?.reduce((sum, a) => sum + a.questions.length, 0) ?? 0;
    // 2026-09-22(CoS 실물 재검증): 질문 카운터가 붙은 뒤에도 앵커·총론 두 단계(축이
    // 시작되기 전) 동안은 여전히 "0/24"만 3분 넘게 그대로 떠서 멈춘 것처럼 보였다.
    // 그 두 단계도 서버가 이미 순서대로 채워 보내는 narrative/overview 유무로 구분되니
    // 축 시작 전에는 단계 이름을 따로 보여준다 — 서버 변경 없이 클라이언트만 갈아 끼운다.
    const stageLabel = answeredCount > 0
      ? `${answeredCount}/24개 질문에 답을 만들고 있어요. 순서대로 화면에 나타납니다`
      : state.partial.overview
        ? "24개 질문에 답할 준비를 하고 있어요"
        : state.partial.narrative
          ? "총론을 쓰고 있어요"
          : "명식과 대운을 분석하고 있어요";
    return (
      <div className="flex flex-col gap-3">
        <div className="px-4 pt-6 pb-2 flex flex-col items-center gap-2 text-center">
          <div className="text-2xl animate-pulse">🔮</div>
          <p className="text-sm text-[#6B6661]">{stageLabel}</p>
          <p className="text-xs text-[#9B968F]">3~5분 정도 걸릴 수 있어요. 창을 닫았다 다시 열어도 진행된 부분은 그대로 남아있어요</p>
          <WaitingCards />
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
          <button onClick={() => driveSteps(target)} disabled={busy} className="flex items-center justify-center gap-1.5 text-sm text-white bg-[#1F3D34] rounded-full px-4 py-2 disabled:opacity-50">
            {busy && <Spinner size={14} />}
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
      {confirmingRegen ? (
        <div className="no-print rounded-2xl border border-[#E5DFD4] bg-[#FBF8F2] p-4 flex flex-col gap-3">
          <p className="text-xs text-[#1A1A18] leading-relaxed">
            전체를 다시 생성할까요? 재생성은 1회만 가능하며, 완료되면 지금 이 결과로 되돌릴 수 없습니다.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmingRegen(false)}
              disabled={busy}
              className="flex-1 border border-[#E5DFD4] text-[#6B6661] rounded-xl py-2.5 text-xs font-medium disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={regenerate}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#1F3D34] text-white rounded-xl py-2.5 text-xs font-semibold disabled:opacity-50"
            >
              {busy && <Spinner size={13} />}
              {busy ? "다시 생성 중..." : "다시 생성하기"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirmingRegen(true)}
          disabled={busy || state.regenerateCount >= 1}
          className="no-print mt-1 flex items-center justify-center gap-1.5 text-center text-xs text-[#6B6661] py-2 disabled:opacity-50"
        >
          {busy && <Spinner size={13} />}
          {state.regenerateCount >= 1 ? "재생성 1회 사용 완료" : busy ? "다시 생성 중... (3~5분)" : "풀이 다시 생성하기 (1회 한정)"}
        </button>
      )}

      {/* §2-1(CoS 실물 확인, 2026-09-22): 미사용 이용권이 있어도 이 화면엔 쓸 방법이
          없었다 — 이 프로필은 완성본을 하나만 담을 수 있어(다단계 상태 저장 구조),
          쓰려면 결과부터 지워야 하는데 그 안내조차 없었다. 새 이용권이 있을 때만 보인다. */}
      {hasUnusedPass && !confirmingRegen && (
        confirmingUsePass ? (
          <div className="no-print rounded-2xl border border-[#E5DFD4] bg-[#FBF8F2] p-4 flex flex-col gap-3">
            <p className="text-xs text-[#1A1A18] leading-relaxed">
              미사용 이용권으로 새로 만들까요? 지금 이 결과는 지워지고 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingUsePass(false)}
                disabled={usingPass}
                className="flex-1 border border-[#E5DFD4] text-[#6B6661] rounded-xl py-2.5 text-xs font-medium disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={useNewPass}
                disabled={usingPass}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#C8743A] text-white rounded-xl py-2.5 text-xs font-semibold disabled:opacity-50"
              >
                {usingPass && <Spinner size={13} />}
                {usingPass ? "새로 만드는 중..." : "이용권으로 새로 만들기"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingUsePass(true)}
            disabled={busy || usingPass}
            className="no-print flex items-center justify-center gap-1.5 text-center text-xs font-medium text-[#C8743A] py-2 disabled:opacity-50"
          >
            미사용 이용권으로 새로 만들기
          </button>
        )
      )}

      <p className="no-print text-center text-[11px] text-[#9B968F]">생성된 결과는 1년간 다시 볼 수 있습니다</p>
      <DeleteReportButton onConfirm={handleDelete} />
    </div>
  );
}
