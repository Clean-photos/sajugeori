"use client";

import { useState } from "react";
import Link from "next/link";
import { AdGate } from "../AdGate";
import { cleanReportText } from "@/lib/report-format";

type Step = "form" | "ad" | "result";

const PURPOSE_OPTIONS = [
  { value: "wedding", label: "결혼식" },
  { value: "move", label: "이사" },
  { value: "business", label: "개업·계약" },
  { value: "travel", label: "여행·출발" },
  { value: "surgery", label: "수술·시술" },
  { value: "other", label: "기타" },
];

function maxBirthDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 14);
  return d.toISOString().split("T")[0];
}

function nextMonthRange() {
  const now = new Date();
  const from = now.toISOString().split("T")[0];
  const to = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString().split("T")[0];
  return { from, to };
}

export default function FreeTaekilPage() {
  const range = nextMonthRange();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({
    birth_date: "", gender: "",
    purpose: "wedding",
    range_from: range.from,
    range_to: range.to,
  });
  const [result, setResult] = useState("");

  function watchAd() {
    setStep("ad");
  }

  async function fetchReport(adToken: string) {
    const res = await fetch("/api/free/taekil", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ad_token: adToken }),
    });
    setResult(cleanReportText(await res.text()));
    setStep("result");
  }

  const canSubmit = form.birth_date && form.gender;

  if (step === "form") {
    return (
      <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
        <div className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #C8743A 0%, transparent 50%)" }} />
          <Link href="/" className="relative flex items-center gap-2 text-white/70 text-sm mb-6 w-fit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            홈
          </Link>
          <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">Free Reading</p>
          <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">택일</h1>
          <p className="relative text-sm text-white/60 mt-1">사주에 맞는 좋은 날을 골라드립니다</p>
        </div>

        <div className="flex-1 px-5 py-6 flex flex-col gap-5">
          <div>
            <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">생년월일</label>
            <input type="text" inputMode="numeric" placeholder="YYYY-MM-DD"
              value={form.birth_date} maxLength={10}
              onChange={(e) => {
                let v = e.target.value.replace(/[^0-9]/g, "");
                if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4);
                if (v.length > 7) v = v.slice(0, 7) + "-" + v.slice(7);
                setForm({ ...form, birth_date: v.slice(0, 10) });
              }}
              className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-sm bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] tracking-widest" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">성별</label>
            <div className="flex gap-2">
              {[["M", "남성 ♂"], ["F", "여성 ♀"]].map(([v, l]) => (
                <button key={v} onClick={() => setForm({ ...form, gender: v })}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${form.gender === v ? "bg-[#1F3D34] text-white border-[#1F3D34]" : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

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
                onChange={(e) => {
                  let v = e.target.value.replace(/[^0-9]/g, "");
                  if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4);
                  if (v.length > 7) v = v.slice(0, 7) + "-" + v.slice(7);
                  setForm({ ...form, range_from: v.slice(0, 10) });
                }}
                className="flex-1 border border-[#E5DFD4] rounded-xl px-3 py-2.5 text-xs bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] tracking-wider" />
              <span className="text-[#6B6661] text-xs">~</span>
              <input type="text" inputMode="numeric" placeholder="YYYY-MM-DD" value={form.range_to} maxLength={10}
                onChange={(e) => {
                  let v = e.target.value.replace(/[^0-9]/g, "");
                  if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4);
                  if (v.length > 7) v = v.slice(0, 7) + "-" + v.slice(7);
                  setForm({ ...form, range_to: v.slice(0, 10) });
                }}
                className="flex-1 border border-[#E5DFD4] rounded-xl px-3 py-2.5 text-xs bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] tracking-wider" />
            </div>
          </div>

          <div className="mt-auto pt-2">
            <button onClick={watchAd} disabled={!canSubmit}
              className="w-full bg-[#C8743A] text-white rounded-xl py-4 font-semibold text-base disabled:opacity-40 active:scale-[0.97] transition-all shadow-lg shadow-[#C8743A]/25">
              광고 보고 무료로 확인하기
            </button>
            <p className="text-center text-xs text-[#6B6661] mt-3">짧은 광고 시청 후 결과를 확인할 수 있어요</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "ad") {
    return <AdGate onComplete={fetchReport} />;
  }

  return (
    <div className="min-h-screen bg-[#F6F1E7] flex flex-col">
      <div className="relative overflow-hidden px-6 pt-14 pb-8 bg-[#1F3D34]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #C8743A 0%, transparent 50%)" }} />
        <p className="relative text-xs font-medium tracking-[0.2em] text-[#C8743A] uppercase mb-2">Analysis Result</p>
        <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">택일 결과</h1>
      </div>
      <div className="flex-1 px-5 py-6 flex flex-col gap-4">
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5DFD4]">
            <span className="text-base">📅</span>
            <span className="text-xs font-medium text-[#6B6661] tracking-wide">AI 택일 분석</span>
          </div>
          <div className="text-sm text-[#1A1A18] leading-relaxed whitespace-pre-wrap">{result || "분석 중..."}</div>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-[#1F3D34] p-5 text-white shadow-lg">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 90% 10%, #C8743A 0%, transparent 60%)" }} />
          <p className="relative font-bold text-base mb-1">더 정확한 택일이 필요하다면?</p>
          <p className="relative text-xs text-white/60 mb-4 leading-relaxed">AI 역술가와 대화하며 시간까지 맞춘 정밀 택일을 받아보세요</p>
          <Link href="/street" className="relative block bg-[#C8743A] rounded-xl py-3 text-center text-sm font-semibold text-white active:scale-[0.97] transition-all">
            AI 역술가와 대화하기 →
          </Link>
        </div>
        <button onClick={() => { setStep("form"); setResult(""); }} className="text-sm text-[#6B6661] text-center py-2 active:opacity-60">
          다시 조회하기
        </button>
      </div>
    </div>
  );
}
