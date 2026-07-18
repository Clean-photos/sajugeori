"use client";

import { useState } from "react";
import Link from "next/link";
import { AdGate } from "../AdGate";
import { ReadingIntro } from "../ReadingIntro";
import { cleanReportText } from "@/lib/report-format";

type Step = "form" | "ad" | "result";

function maxBirthDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 14);
  return d.toISOString().split("T")[0];
}

const CONTEXT_OPTIONS = [
  { value: "romance", label: "연애 · 결혼" },
  { value: "work", label: "직장 · 비즈니스" },
  { value: "friend", label: "친구 · 지인" },
];

export default function FreeCompatibilityPage() {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({
    my_birth: "", my_gender: "",
    other_birth: "", other_gender: "",
    context: "romance",
  });
  const [result, setResult] = useState("");

  function watchAd() {
    setStep("ad");
  }

  async function fetchReport(adToken: string) {
    const res = await fetch("/api/free/compatibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ad_token: adToken }),
    });
    setResult(cleanReportText(await res.text()));
    setStep("result");
  }

  const canSubmit = form.my_birth && form.my_gender && form.other_birth && form.other_gender;

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
          <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">무료 궁합</h1>
          <p className="relative text-sm text-white/60 mt-1">두 사람의 사주로 인연의 깊이를 확인하세요</p>
        </div>

        <div className="flex-1 px-5 py-6 flex flex-col gap-6">
          {/* 관계 유형 */}
          <div>
            <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">관계 유형</label>
            <div className="flex gap-2">
              {CONTEXT_OPTIONS.map((o) => (
                <button key={o.value} onClick={() => setForm({ ...form, context: o.value })}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${form.context === o.value ? "bg-[#1F3D34] text-white border-[#1F3D34]" : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* 나 */}
          <div>
            <p className="text-sm font-semibold text-[#1A1A18] mb-3">나</p>
            <div className="flex flex-col gap-2">
              <input type="text" inputMode="numeric" placeholder="YYYY-MM-DD"
                value={form.my_birth} maxLength={10}
                onChange={(e) => {
                  let v = e.target.value.replace(/[^0-9]/g, "");
                  if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4);
                  if (v.length > 7) v = v.slice(0, 7) + "-" + v.slice(7);
                  setForm({ ...form, my_birth: v.slice(0, 10) });
                }}
                className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3 text-sm bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] tracking-widest" />
              <div className="flex gap-2">
                {[["M", "남성 ♂"], ["F", "여성 ♀"]].map(([v, l]) => (
                  <button key={v} onClick={() => setForm({ ...form, my_gender: v })}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${form.my_gender === v ? "bg-[#1F3D34] text-white border-[#1F3D34]" : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 상대 */}
          <div>
            <p className="text-sm font-semibold text-[#1A1A18] mb-3">상대방</p>
            <div className="flex flex-col gap-2">
              <input type="text" inputMode="numeric" placeholder="YYYY-MM-DD"
                value={form.other_birth} maxLength={10}
                onChange={(e) => {
                  let v = e.target.value.replace(/[^0-9]/g, "");
                  if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4);
                  if (v.length > 7) v = v.slice(0, 7) + "-" + v.slice(7);
                  setForm({ ...form, other_birth: v.slice(0, 10) });
                }}
                className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3 text-sm bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] tracking-widest" />
              <div className="flex gap-2">
                {[["M", "남성 ♂"], ["F", "여성 ♀"]].map(([v, l]) => (
                  <button key={v} onClick={() => setForm({ ...form, other_gender: v })}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${form.other_gender === v ? "bg-[#1F3D34] text-white border-[#1F3D34]" : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"}`}>
                    {l}
                  </button>
                ))}
              </div>
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

        <ReadingIntro
          lead="사주 궁합은 두 사람의 사주팔자를 나란히 놓고, 서로의 오행과 십성이 어떻게 어울리는지를 살피는 풀이입니다. 두 사람의 생년월일과 태어난 시각을 입력하면 각자의 일간(日干)과 오행 구성을 세우고, 두 기운이 서로를 돕는지(상생) 부딪치는지(상극)를 종합해 관계의 결을 읽습니다."
          sections={[
            {
              heading: "궁합은 어떻게 보나요?",
              paragraphs: [
                "궁합의 핵심은 두 사람의 오행이 서로 부족한 부분을 채워 주는가에 있습니다. 한쪽에 강한 기운이 다른 쪽의 약한 기운을 보완하면 서로에게 힘이 되는 관계로 봅니다. 반대로 같은 기운이 지나치게 겹치거나 서로를 강하게 극하면, 긴장과 마찰이 생기기 쉬운 조합으로 해석합니다.",
                "다만 오행이 부딪친다고 해서 반드시 나쁜 궁합은 아닙니다. 적당한 극(剋)은 서로를 자극하고 성장시키는 힘이 되기도 합니다. 그래서 궁합은 단순한 점수보다, 두 사람이 어떤 지점에서 잘 맞고 어떤 지점을 조율해야 하는지를 이해하는 데 뜻이 있습니다.",
              ],
            },
            {
              heading: "연인·부부만 보는 건가요?",
              paragraphs: [
                "궁합은 연애와 결혼뿐 아니라 친구, 가족, 동료, 동업자 등 모든 관계에 적용할 수 있습니다. 두 사람의 기운이 어떻게 상호작용하는지를 보는 것이므로, 함께 일하는 사람이나 오래 어울릴 상대와의 결을 이해하는 데에도 활용됩니다.",
              ],
            },
            {
              heading: "궁합 결과를 대하는 태도",
              paragraphs: [
                "궁합은 관계의 가능성과 주의점을 비추는 참고 자료일 뿐, 두 사람의 인연을 확정하는 판정이 아닙니다. 좋은 궁합도 노력이 없으면 흔들리고, 까다로운 궁합도 서로를 이해하면 깊어집니다. 결과는 서로를 조금 더 헤아리는 실마리로 활용하시기를 권합니다.",
              ],
            },
          ]}
          related={[
            { slug: "ilgan", label: "일간" },
            { slug: "wood-strong", label: "오행" },
            { slug: "jeongjae", label: "정재" },
            { slug: "jeonggwan", label: "정관" },
            { slug: "dohwasal", label: "도화살" },
          ]}
        />
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
        <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">궁합 결과</h1>
      </div>
      <div className="flex-1 px-5 py-6 flex flex-col gap-4">
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5DFD4]">
            <span className="text-base">∞</span>
            <span className="text-xs font-medium text-[#6B6661] tracking-wide">AI 궁합 분석</span>
          </div>
          <div className="text-sm text-[#1A1A18] leading-relaxed whitespace-pre-wrap">{result || "분석 중..."}</div>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-[#1F3D34] p-5 text-white shadow-lg">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 90% 10%, #C8743A 0%, transparent 60%)" }} />
          <p className="relative font-bold text-base mb-1">더 깊은 궁합 분석이 필요하다면?</p>
          <p className="relative text-xs text-white/60 mb-4 leading-relaxed">AI 역술가와 직접 대화하며 궁합의 세부 흐름을 확인하세요</p>
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
