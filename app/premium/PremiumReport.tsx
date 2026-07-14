"use client";

import { useEffect, useState } from "react";
import { cleanReportText } from "@/lib/report-format";

const SECTIONS: { id: string; label: string; icon: string }[] = [
  { id: "personality", label: "타고난 성격·기질", icon: "🧠" },
  { id: "career", label: "직업운", icon: "💼" },
  { id: "money", label: "재물운", icon: "💰" },
  { id: "love", label: "연애·결혼운", icon: "❤️" },
  { id: "health", label: "건강", icon: "🌿" },
  { id: "life_pattern", label: "인생 패턴", icon: "🔄" },
  { id: "current_phase", label: "현재 대운", icon: "🌊" },
  { id: "yearly", label: "연도별 운세", icon: "📆" },
];

type Report = Record<string, string>;

export function PremiumReport() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  async function load(regenerate = false) {
    setError("");
    if (regenerate) setRegenerating(true); else setLoading(true);
    try {
      const res = await fetch(`/api/premium/report${regenerate ? "?regenerate=1" : ""}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error === "profile_required" ? "먼저 사주를 등록해 주세요." : (data?.error ?? "불러오지 못했습니다."));
        return;
      }
      const cleaned: Report = {};
      for (const k of Object.keys(data.report ?? {})) cleaned[k] = cleanReportText(data.report[k]);
      setReport(cleaned);
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
        <p className="text-sm text-[#6B6661]">사주를 깊이 있게 풀이하고 있어요...</p>
        <p className="text-xs text-[#9B968F]">처음 생성은 1분 정도 걸릴 수 있어요</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8 flex flex-col items-center gap-3">
        <p className="text-sm text-[#C0392B]">{error}</p>
        <button onClick={() => load(false)} className="text-sm text-[#1B3A4B] underline underline-offset-2">
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      {SECTIONS.map((sec) => (
        <div key={sec.id} className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span>{sec.icon}</span>
            <span className="text-sm font-semibold text-[#1B3A4B]">{sec.label}</span>
          </div>
          <p className="text-sm text-[#1A1A18] leading-relaxed whitespace-pre-wrap">
            {report?.[sec.id] ?? "준비 중입니다."}
          </p>
        </div>
      ))}

      <button
        onClick={() => load(true)}
        disabled={regenerating}
        className="mt-1 text-center text-xs text-[#6B6661] py-2 disabled:opacity-50"
      >
        {regenerating ? "다시 생성 중..." : "풀이 다시 생성하기"}
      </button>
    </div>
  );
}
