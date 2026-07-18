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

const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR, THIS_YEAR + 1, THIS_YEAR + 2];

export default function FreeYearlyPage() {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ birth_date: "", gender: "", year: String(THIS_YEAR) });
  const [result, setResult] = useState("");

  function watchAd() {
    setStep("ad");
  }

  async function fetchReport(adToken: string) {
    const res = await fetch("/api/free/yearly", {
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
          <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">연운세</h1>
          <p className="relative text-sm text-white/60 mt-1">올해와 내년의 기운 흐름을 확인하세요</p>
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
            <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">조회 연도</label>
            <div className="flex gap-2">
              {YEARS.map((y) => (
                <button key={y} onClick={() => setForm({ ...form, year: String(y) })}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${form.year === String(y) ? "bg-[#1F3D34] text-white border-[#1F3D34]" : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"}`}>
                  {y}년
                </button>
              ))}
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
          lead="연운세(年運勢)는 한 해 동안 나에게 어떤 기운이 흐르는지를 살피는 풀이로, 흔히 말하는 ‘신년운세’, ‘올해의 운세’가 여기에 해당합니다. 그해에 정해진 간지(干支)의 기운이 내 사주, 그리고 10년 단위로 흐르는 대운(大運)과 어떻게 어울리는지를 종합해 한 해의 흐름을 읽습니다."
          sections={[
            {
              heading: "연운세는 어떻게 보나요?",
              paragraphs: [
                "한 해의 운은 그해의 간지가 내 사주에 필요한 기운(용신)을 돕는가로 판단합니다. 예를 들어 2026년은 병오(丙午)년인데, 이 병오의 기운이 내 사주와 대운에 더해져 그해의 색을 만듭니다. 그해 기운이 사주의 어떤 십성(十星)을 자극하는지에 따라 재물·직업·인간관계·건강 중 어느 영역이 두드러지는지도 함께 살핍니다.",
                "생년월일과 태어난 시각을 입력하면, 올해 당신에게 흐르는 기운의 큰 방향과 눈여겨볼 지점을 간추려 알려 드립니다.",
              ],
            },
            {
              heading: "대운과 세운은 무엇이 다른가요?",
              paragraphs: [
                "대운(大運)이 약 10년을 다스리는 큰 계절이라면, 그해 한 해의 운인 세운(歲運)은 그 계절 안에서 매년 바뀌는 날씨에 비유할 수 있습니다. 연운세를 볼 때는 이 두 가지를 함께 보아야 합니다. 같은 해라도 지금 지나는 대운이 다르면 그해의 의미가 달라지기 때문입니다.",
              ],
            },
            {
              heading: "연운세 결과를 대하는 태도",
              paragraphs: [
                "연운세는 한 해의 큰 흐름과 리듬을 미리 헤아리는 지도입니다. 순풍이 부는 해에는 한 걸음 더 나아가고, 조심스러운 해에는 무리하지 않고 내실을 다지는 식으로 활용할 때 뜻이 있습니다. 매일의 길흉을 정하는 것이 아니라, 한 해를 어떻게 보낼지 방향을 잡는 참고로 삼으시기를 권합니다.",
              ],
            },
          ]}
          related={[
            { slug: "seun", label: "세운" },
            { slug: "daeun", label: "대운" },
            { slug: "yongsin", label: "용신" },
            { slug: "ilgan", label: "일간" },
            { slug: "wood-strong", label: "오행" },
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
        <h1 className="relative font-serif text-[28px] font-bold text-white leading-tight">{form.year}년 연운세</h1>
      </div>
      <div className="flex-1 px-5 py-6 flex flex-col gap-4">
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5DFD4]">
            <span className="text-base">運</span>
            <span className="text-xs font-medium text-[#6B6661] tracking-wide">AI 연운세 분석</span>
          </div>
          <div className="text-sm text-[#1A1A18] leading-relaxed whitespace-pre-wrap">{result || "분석 중..."}</div>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-[#1F3D34] p-5 text-white shadow-lg">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 90% 10%, #C8743A 0%, transparent 60%)" }} />
          <p className="relative font-bold text-base mb-1">월별 운세까지 보고 싶다면?</p>
          <p className="relative text-xs text-white/60 mb-4 leading-relaxed">AI 역술가와 대화하며 월별 흐름과 주의 시기를 상세히 확인하세요</p>
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
