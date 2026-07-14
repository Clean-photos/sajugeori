"use client";

import { useState } from "react";
import { cleanReportText } from "@/lib/report-format";

type Step = "form" | "loading" | "result";

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

export function TaekilForm() {
  const range = defaultRange();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ purpose: "wedding", range_from: range.from, range_to: range.to });
  const [report, setReport] = useState("");
  const [best, setBest] = useState<{ date: string; weekday: string; ganji: string }[]>([]);
  const [error, setError] = useState("");

  async function submit() {
    setStep("loading");
    setError("");
    try {
      const res = await fetch("/api/premium/taekil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "profile_required" ? "먼저 사주를 등록해주세요." : "분석에 실패했습니다. 다시 시도해주세요.");
        setStep("form");
        return;
      }
      setReport(cleanReportText(data.report));
      setBest(data.best ?? []);
      setStep("result");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setStep("form");
    }
  }

  const canSubmit = form.range_from.length === 10 && form.range_to.length === 10;

  if (step === "result") {
    return (
      <div className="px-5 py-6 flex flex-col gap-4">
        {best.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {best.map((d) => (
              <div key={d.date} className="bg-[#1F3D34] text-white rounded-xl px-3 py-2 text-center">
                <p className="text-sm font-bold">{d.date.slice(5)}</p>
                <p className="text-[10px] text-white/60">{d.weekday} · {d.ganji}</p>
              </div>
            ))}
          </div>
        )}
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5DFD4]">
            <span className="text-base">📅</span>
            <span className="text-xs font-medium text-[#6B6661] tracking-wide">프리미엄 택일 분석</span>
          </div>
          <div className="text-sm text-[#1A1A18] leading-relaxed whitespace-pre-wrap">{report}</div>
        </div>
        <button onClick={() => { setStep("form"); setReport(""); setBest([]); }}
          className="text-sm text-[#6B6661] text-center py-2 active:opacity-60">
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
      </div>
    );
  }

  return (
    <div className="flex-1 px-5 py-6 flex flex-col gap-5">
      <div>
        <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">목적</label>
        <div className="grid grid-cols-3 gap-2">
          {PURPOSE_OPTIONS.map((o) => (
            <button key={o.value} onClick={() => setForm({ ...form, purpose: o.value })}
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
            onChange={(e) => setForm({ ...form, range_from: formatDateInput(e.target.value) })}
            className="flex-1 border border-[#E5DFD4] rounded-xl px-3 py-2.5 text-xs bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] tracking-wider" />
          <span className="text-[#6B6661] text-xs">~</span>
          <input type="text" inputMode="numeric" placeholder="YYYY-MM-DD" value={form.range_to} maxLength={10}
            onChange={(e) => setForm({ ...form, range_to: formatDateInput(e.target.value) })}
            className="flex-1 border border-[#E5DFD4] rounded-xl px-3 py-2.5 text-xs bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] tracking-wider" />
        </div>
        <p className="text-[11px] text-[#6B6661]/70 mt-2">최대 120일까지 조회할 수 있어요</p>
      </div>

      {error && <p className="text-xs text-[#C0392B] px-1">{error}</p>}

      <div className="mt-auto pt-2">
        <button onClick={submit} disabled={!canSubmit}
          className="w-full bg-[#C8743A] text-white rounded-xl py-4 font-semibold text-base disabled:opacity-40 active:scale-[0.97] transition-all shadow-lg shadow-[#C8743A]/25">
          내 사주로 길일 찾기
        </button>
        <p className="text-center text-xs text-[#6B6661] mt-3">등록된 내 사주를 기준으로 분석합니다</p>
      </div>
    </div>
  );
}
