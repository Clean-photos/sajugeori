"use client";

import { useState } from "react";
import { cleanReportText } from "@/lib/report-format";
import { WaitingCards } from "@/components/premium/WaitingCards";
import { SajuInputForm, type SavedSaju } from "@/components/premium/SajuInputForm";
import { premiumErrorInfo, type PremiumErrorInfo } from "@/components/premium/premiumError";
import { PremiumErrorBanner } from "@/components/premium/PremiumErrorBanner";
import { TaekilReportResultView, type TaekilBestDate } from "@/components/premium/TaekilReportResultView";

type Step = "form" | "loading" | "result" | "deleted";

const PURPOSE_OPTIONS = [
  { value: "wedding", label: "결혼식" },
  { value: "move", label: "이사" },
  { value: "business", label: "개업·계약" },
  { value: "travel", label: "여행·출발" },
  { value: "surgery", label: "수술·시술" },
  { value: "other", label: "기타" },
];

function defaultRange() {
  const now = new Date();
  const from = now.toISOString().split("T")[0];
  const to = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString().split("T")[0];
  return { from, to };
}

function formatDateInput(raw: string) {
  let v = raw.replace(/[^0-9]/g, "");
  if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4);
  if (v.length > 7) v = v.slice(0, 7) + "-" + v.slice(7);
  return v.slice(0, 10);
}

type Target = { birth_date: string; birth_time: string | null; gender: string };

export function TaekilForm({ saved }: { saved: SavedSaju }) {
  const range = defaultRange();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ purpose: "wedding", range_from: range.from, range_to: range.to });
  const [report, setReport] = useState("");
  const [best, setBest] = useState<TaekilBestDate[]>([]);
  const [error, setError] = useState<PremiumErrorInfo | null>(null);
  // 실패한 시도의 id. 있으면 "같은 정보로 재생성" — 서버에 저장된 입력값을 그대로 재사용한다.
  const [attemptId, setAttemptId] = useState<string | null>(null);
  // 어떤 대상 사주로 만든 리포트인지. 재생성 때도 같은 대상을 다시 보내야 한다.
  const [target, setTarget] = useState<Target | null>(null);
  // §1(CoS 결정 2026-09-08): 저장된 행의 PK — 삭제를 이 값으로 바로 한다(기존엔
  // DELETE 라우트 자체가 없어 삭제 버튼이 항상 실패하고 있었다).
  const [reportId, setReportId] = useState<string | null>(null);

  async function submit(regenerate = false, v?: Target) {
    const t = v ?? target;
    if (!t) return;
    setTarget(t);
    setStep("loading");
    setError(null);
    try {
      const res = await fetch("/api/premium/taekil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regenerate && attemptId ? { attemptId, ...t } : { ...form, ...t }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAttemptId(typeof data.attemptId === "string" ? data.attemptId : null);
        setError(premiumErrorInfo(data, "분석에 실패했습니다. 입력하신 정보는 그대로 남아 있어요."));
        setStep("form");
        return;
      }
      setAttemptId(null);
      setReport(cleanReportText(data.report));
      setBest(data.best ?? []);
      setReportId(typeof data.id === "string" ? data.id : null);
      setStep("result");
    } catch {
      setError({ message: "네트워크 연결을 확인한 뒤 다시 시도해주세요." });
      setStep("form");
    }
  }

  const canSubmit = form.range_from.length === 10 && form.range_to.length === 10;

  // 입력을 바꾸면 이전 실패 시도(attemptId)는 더 이상 유효하지 않다 — 새 시도로 취급.
  function updateForm(patch: Partial<typeof form>) {
    setForm({ ...form, ...patch });
    setAttemptId(null);
    setError(null);
  }

  async function handleDelete() {
    // §1(CoS 결정 2026-09-08): 예전엔 라우트 자체가 없어(DELETE 미구현) 이 버튼이
    // 항상 실패했다 — 이제 생성 시 돌려받은 행 PK로 바로 지운다. 가족·지인 대상
    // (adhoc) 결과는 018 테이블에 저장돼 id가 없다 — 그 경우는 여전히 지원하지
    // 않으므로(범위 밖) 조용히 성공한 척하지 않고 에러로 알린다.
    if (!reportId) throw new Error("delete unsupported: no reportId (adhoc target)");
    const res = await fetch("/api/premium/taekil", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reportId }),
    });
    if (!res.ok) throw new Error("delete failed");
    setStep("deleted");
  }

  if (step === "deleted") {
    return (
      <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-[#1A1A18]">결과를 삭제했습니다.</p>
        <p className="text-xs text-[#6B6661]">다시 보려면 택일을 새로 결제해 주세요.</p>
      </div>
    );
  }

  if (step === "result") {
    return (
      <div className="flex flex-col gap-2">
        <TaekilReportResultView report={report} best={best} onDelete={handleDelete} />
        <button onClick={() => { setStep("form"); setReport(""); setBest([]); setReportId(null); }}
          className="no-print text-sm text-[#6B6661] text-center py-2 -mt-4 active:opacity-60">
          다시 조회하기
        </button>
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
        <div className="w-10 h-10 border-2 border-[#C8743A]/30 border-t-[#C8743A] rounded-full animate-spin" />
        <p className="text-sm text-[#6B6661]">일진을 계산하고 있어요…</p>
        <p className="text-xs text-[#6B6661]/60">최대 1분 정도 걸릴 수 있어요</p>
        <WaitingCards />
      </div>
    );
  }

  return (
    <>
    <div className="flex-1 px-5 pt-6 flex flex-col gap-5">
      <div>
        <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">목적</label>
        <div className="grid grid-cols-3 gap-2">
          {PURPOSE_OPTIONS.map((o) => (
            <button key={o.value} onClick={() => updateForm({ purpose: o.value })}
              className={`py-2.5 rounded-xl border text-xs font-medium transition-all ${form.purpose === o.value ? "bg-[#1F3D34] text-white border-[#1F3D34]" : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">조회 기간</label>
        <div className="flex gap-2 items-center">
          <input type="text" inputMode="numeric" placeholder="YYYY-MM-DD" value={form.range_from} maxLength={10}
            onChange={(e) => updateForm({ range_from: formatDateInput(e.target.value) })}
            className="flex-1 border border-[#E5DFD4] rounded-xl px-3 py-2.5 text-xs bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] tracking-wider" />
          <span className="text-[#6B6661] text-xs">~</span>
          <input type="text" inputMode="numeric" placeholder="YYYY-MM-DD" value={form.range_to} maxLength={10}
            onChange={(e) => updateForm({ range_to: formatDateInput(e.target.value) })}
            className="flex-1 border border-[#E5DFD4] rounded-xl px-3 py-2.5 text-xs bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] tracking-wider" />
        </div>
        <p className="text-[11px] text-[#6B6661]/70 mt-2">최대 120일까지 조회할 수 있어요</p>
      </div>

      {error && <PremiumErrorBanner error={error} />}

      {attemptId && (
        <div className="pt-2">
          <button onClick={() => submit(true)}
            className="w-full bg-[#C8743A] text-white rounded-xl py-4 font-semibold text-base active:scale-[0.97] transition-all shadow-lg shadow-[#C8743A]/25">
            같은 정보로 재생성하기
          </button>
        </div>
      )}
    </div>

      {/* 생성 직전 대상 확정 — 등록된 사주가 있으면 채워진 채로 뜨고, 체크를 풀면
          가족·친구 사주를 직접 넣을 수 있다. */}
      {!attemptId && (
        <SajuInputForm
          saved={saved}
          busy={false}
          confirmMode
          onSubmit={(v) => { if (canSubmit) submit(false, v); }}
          submitLabel="이 사주로 길일 찾기"
        />
      )}
    </>
  );
}
