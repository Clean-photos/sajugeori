"use client";

import { useState } from "react";
import { cleanReportText } from "@/lib/report-format";
import { PrintReportFooter } from "@/components/premium/PrintReport";
import { SaveReportButtons } from "@/components/premium/SaveReportButtons";
import { DeleteReportButton } from "@/components/premium/DeleteReportButton";
import { WaitingCards } from "@/components/premium/WaitingCards";
import { ReportBody } from "@/components/premium/ReportBody";
import { SajuInputForm, type SavedSaju } from "@/components/premium/SajuInputForm";

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
  const [best, setBest] = useState<{ date: string; weekday: string; ganji: string }[]>([]);
  const [error, setError] = useState("");
  // 실패한 시도의 id. 있으면 "같은 정보로 재생성" — 서버에 저장된 입력값을 그대로 재사용한다.
  const [attemptId, setAttemptId] = useState<string | null>(null);
  // 어떤 대상 사주로 만든 리포트인지. 재생성 때도 같은 대상을 다시 보내야 한다.
  const [target, setTarget] = useState<Target | null>(null);

  async function submit(regenerate = false, v?: Target) {
    const t = v ?? target;
    if (!t) return;
    setTarget(t);
    setStep("loading");
    setError("");
    try {
      const res = await fetch("/api/premium/taekil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regenerate && attemptId ? { attemptId, ...t } : { ...form, ...t }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAttemptId(typeof data.attemptId === "string" ? data.attemptId : null);
        setError(data.error === "profile_required" ? "먼저 사주를 등록해주세요." : "분석에 실패했습니다. 입력하신 정보는 그대로 남아 있어요.");
        setStep("form");
        return;
      }
      setAttemptId(null);
      setReport(cleanReportText(data.report));
      setBest(data.best ?? []);
      setStep("result");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setStep("form");
    }
  }

  const canSubmit = form.range_from.length === 10 && form.range_to.length === 10;

  // 입력을 바꾸면 이전 실패 시도(attemptId)는 더 이상 유효하지 않다 — 새 시도로 취급.
  function updateForm(patch: Partial<typeof form>) {
    setForm({ ...form, ...patch });
    setAttemptId(null);
    setError("");
  }

  async function handleDelete() {
    const res = await fetch("/api/premium/taekil", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: form.purpose, range_from: form.range_from, range_to: form.range_to }),
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
      <div className="px-5 py-6 flex flex-col gap-4">
        <div className="print-area flex flex-col gap-4">
          {best.length > 0 && (
            <div className="print-card flex flex-wrap gap-2">
              {best.map((d) => (
                <div key={d.date} className="bg-[#1F3D34] text-white rounded-xl px-3 py-2 text-center">
                  <p className="text-sm font-bold">{d.date.slice(5)}</p>
                  <p className="text-[10px] text-white/60">{d.weekday} · {d.ganji}</p>
                </div>
              ))}
            </div>
          )}
          <div className="print-card bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5DFD4]">
              <span className="text-base">📅</span>
              <span className="text-xs font-medium text-[#6B6661] tracking-wide">프리미엄 택일 분석</span>
            </div>
            <ReportBody text={report} />
          </div>
          <PrintReportFooter />
        </div>
        <SaveReportButtons text={report} title="프리미엄 택일" />
        <button onClick={() => { setStep("form"); setReport(""); setBest([]); }}
          className="no-print text-sm text-[#6B6661] text-center py-2 active:opacity-60">
          다시 조회하기
        </button>
        <p className="text-center text-[11px] text-[#9B968F] -mt-2">생성된 결과는 1년간 다시 볼 수 있습니다</p>
        <DeleteReportButton onConfirm={handleDelete} />
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

      {error && <p className="text-xs text-[#C0392B] px-1">{error}</p>}

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
