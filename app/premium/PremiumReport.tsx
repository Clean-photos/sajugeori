"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cleanReportText } from "@/lib/report-format";
import { PrintButton, PrintReportFooter } from "@/components/premium/PrintReport";
import { DeleteReportButton } from "@/components/premium/DeleteReportButton";
import { WaitingCards } from "@/components/premium/WaitingCards";
import { ReportBody } from "@/components/premium/ReportBody";
import { Spinner } from "@/components/ui/Spinner";
import { DESTINY_UPGRADE } from "@/lib/billing/plans";

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
  const [deleted, setDeleted] = useState(false);

  async function handleDelete() {
    const res = await fetch("/api/premium/report", { method: "DELETE" });
    if (!res.ok) throw new Error("delete failed");
    setDeleted(true);
  }

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
        <WaitingCards />
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

  if (deleted) {
    return (
      <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-[#1A1A18]">결과를 삭제했습니다.</p>
        <p className="text-xs text-[#6B6661]">다시 보려면 프리미엄 사주를 새로 결제해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      <div className="print-area flex flex-col gap-3">
        {SECTIONS.map((sec) => (
          <div key={sec.id} className="print-card bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span>{sec.icon}</span>
              <span className="text-sm font-semibold text-[#1B3A4B]">{sec.label}</span>
            </div>
            <ReportBody text={report?.[sec.id] ?? "준비 중입니다."} />
          </div>
        ))}
        <PrintReportFooter />
      </div>

      {/* 이 컴포넌트는 리포트 생성에 성공했을 때만 렌더되므로, 렌더되는 시점에는
          이미 premium_reports에 행이 있다 — 곧 업그레이드 자격이 있다는 뜻이라
          별도 자격 조회 없이 배너를 보여준다(lib/billing/access.ts hasSajuReport
          와 같은 조건). */}
      <Link
        href="/premium/buy?product=destiny_upgrade"
        className="no-print relative overflow-hidden rounded-2xl bg-[#1F3D34] p-5 text-white shadow-lg active:scale-[0.98] transition-all"
      >
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(circle at 85% 20%, #C8743A 0%, transparent 60%)" }} />
        <p className="relative text-[10px] font-medium tracking-[0.15em] text-[#C8743A] uppercase mb-1">Upgrade</p>
        <p className="relative font-bold text-base leading-snug">
          {DESTINY_UPGRADE.amount.toLocaleString()}원 추가로 운명 설계도 업그레이드
        </p>
        <p className="relative text-xs text-white/65 mt-1.5 leading-relaxed">
          지금 보신 여덟 영역에 평생 대운 로드맵·인생 전환점·실행 전략까지 더합니다.
          이미 본 사주 리포트에 이어서 보는 거라 지금이 가장 저렴하게 보는 방법이에요.
        </p>
      </Link>

      <PrintButton />
      <button
        onClick={() => load(true)}
        disabled={regenerating}
        className="no-print mt-1 flex items-center justify-center gap-1.5 text-center text-xs text-[#6B6661] py-2 disabled:opacity-50"
      >
        {regenerating && <Spinner size={13} />}
        {regenerating ? "다시 생성 중..." : "풀이 다시 생성하기"}
      </button>
      <p className="no-print text-center text-[11px] text-[#9B968F]">생성된 결과는 1년간 다시 볼 수 있습니다</p>
      <DeleteReportButton onConfirm={handleDelete} />
    </div>
  );
}
