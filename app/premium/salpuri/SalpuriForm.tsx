"use client";

import { useState } from "react";
import Link from "next/link";
import { cleanReportText } from "@/lib/report-format";
import { TERMS } from "@/app/dictionary/terms";
import { PrintReportFooter } from "@/components/premium/PrintReport";
import { SaveReportButtons } from "@/components/premium/SaveReportButtons";
import { DeleteReportButton } from "@/components/premium/DeleteReportButton";
import { WaitingCards } from "@/components/premium/WaitingCards";
import { ReportBody } from "@/components/premium/ReportBody";
import { SajuInputForm, type SavedSaju } from "@/components/premium/SajuInputForm";
import { premiumErrorInfo, type PremiumErrorInfo } from "@/components/premium/premiumError";
import { PremiumErrorBanner } from "@/components/premium/PremiumErrorBanner";

type Step = "form" | "loading" | "result" | "deleted";
type DetectedSal = { name: string; where: string[] };

/** 엔진이 돌려준 신살 이름 → 백과 slug. 이름이 백과 표제어와 일치하면 링크를 건다. */
function slugForSal(name: string): string | undefined {
  return TERMS.find((t) => t.term === name)?.slug;
}

type Target = { birth_date: string; birth_time: string | null; gender: string };

export function SalpuriForm({ saved }: { saved: SavedSaju }) {
  const [step, setStep] = useState<Step>("form");
  const [report, setReport] = useState("");
  const [sal, setSal] = useState<DetectedSal[]>([]);
  const [error, setError] = useState<PremiumErrorInfo | null>(null);
  // 어떤 대상으로 만든 리포트인지 — 삭제할 때 같은 대상을 지워야 한다.
  const [target, setTarget] = useState<Target | null>(null);

  async function submit(v: Target) {
    setStep("loading");
    setError(null);
    setTarget(v);
    try {
      const res = await fetch("/api/premium/salpuri", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(premiumErrorInfo(data, "분석에 실패했습니다. 잠시 후 다시 시도해주세요."));
        setStep("form");
        return;
      }
      setReport(cleanReportText(data.report));
      setSal(data.sal ?? []);
      setStep("result");
    } catch {
      setError({ message: "네트워크 연결을 확인한 뒤 다시 시도해주세요." });
      setStep("form");
    }
  }

  async function handleDelete() {
    // 대상 정보를 함께 보낸다 — 가족 사주로 만든 리포트를 지울 때 본인 리포트가
    // 지워지면 안 된다.
    const q = new URLSearchParams();
    if (target) {
      q.set("birth_date", target.birth_date);
      if (target.birth_time) q.set("birth_time", target.birth_time);
      q.set("gender", target.gender);
    }
    const res = await fetch(`/api/premium/salpuri?${q.toString()}`, { method: "DELETE" });
    if (!res.ok) throw new Error("delete failed");
    setStep("deleted");
  }

  if (step === "deleted") {
    return (
      <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-[#1A1A18]">결과를 삭제했습니다.</p>
        <p className="text-xs text-[#6B6661]">다시 보려면 살풀이를 새로 결제해 주세요.</p>
      </div>
    );
  }

  if (step === "result") {
    return (
      <div className="px-5 py-6 flex flex-col gap-4">
        <div className="print-area flex flex-col gap-4">
          {sal.length > 0 && (
            <div className="print-card bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
              <p className="text-xs font-medium text-[#6B6661] tracking-wide mb-2.5">검출된 살 {sal.length}종</p>
              <div className="flex flex-wrap gap-2">
                {sal.map((s) => {
                  const slug = slugForSal(s.name);
                  const label = `${s.name} · ${s.where.join(", ")}`;
                  return slug ? (
                    <Link key={s.name} href={`/dictionary/${slug}`}
                      className="text-xs text-[#1F3D34] bg-white border border-[#E5DFD4] rounded-full px-3 py-1.5 active:opacity-60">
                      {label}
                    </Link>
                  ) : (
                    <span key={s.name}
                      className="text-xs text-[#6B6661] bg-white border border-[#E5DFD4] rounded-full px-3 py-1.5">
                      {label}
                    </span>
                  );
                })}
              </div>
              <p className="text-[11px] text-[#6B6661]/70 mt-2.5 no-print">살 이름을 누르면 용어 백과에서 자세한 뜻을 볼 수 있어요</p>
            </div>
          )}

          <div className="print-card bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5DFD4]">
              <span className="text-base">殺</span>
              <span className="text-xs font-medium text-[#6B6661] tracking-wide">프리미엄 살풀이</span>
            </div>
            <ReportBody text={report} highlight={sal.map((s) => s.name)} />
          </div>

          <div className="print-card bg-[#C8743A]/8 border border-[#C8743A]/25 rounded-2xl p-4 text-xs text-[#6B6661] leading-relaxed">
            신살은 사주 해석의 보조 요소이며, 하나의 살로 운명이 정해지지 않습니다.
            본 풀이는 오락 및 참고 목적으로 제공됩니다.
          </div>
          <PrintReportFooter />
        </div>

        <SaveReportButtons text={report} title="프리미엄 살풀이" />
        <button onClick={() => { setStep("form"); setReport(""); setSal([]); }}
          className="no-print text-sm text-[#6B6661] text-center py-2 active:opacity-60">
          다시 보기
        </button>
        <p className="no-print text-center text-[11px] text-[#9B968F] -mt-2">생성된 결과는 1년간 다시 볼 수 있습니다</p>
        <DeleteReportButton onConfirm={handleDelete} />
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
        <div className="w-10 h-10 border-2 border-[#C8743A]/30 border-t-[#C8743A] rounded-full animate-spin" />
        <p className="text-sm text-[#6B6661]">사주에 들어 있는 살을 찾고 있어요…</p>
        <p className="text-xs text-[#6B6661]/60">최대 1분 정도 걸릴 수 있어요</p>
        <WaitingCards />
      </div>
    );
  }

  return (
    <>
    <div className="flex-1 px-5 pt-6 flex flex-col gap-5">
      <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-5">
        <p className="text-[16px] text-[#1A1A18] leading-[1.85]">
          살(殺)은 사주의 여덟 글자가 특정한 조합을 이룰 때 붙는 이름입니다.
          도화살·역마살처럼 널리 알려진 것부터 천을귀인·금여 같은 길신까지,
          사주 엔진이 아래에서 확정한 사주로 실제 검출한 살을 하나씩 짚어 풀이해 드립니다.
        </p>
        <p className="text-[13px] text-[#6B6661] leading-relaxed mt-3">
          살이 어느 자리에 있는지에 따라 작용하는 영역이 달라집니다.
          연지는 초년과 조상, 월지는 부모와 사회활동, 일지는 배우자와 본인, 시지는 자식과 말년에 대응합니다.
        </p>
      </div>

      {error && <PremiumErrorBanner error={error} />}
    </div>

      {/* 생성 직전 대상 확정 — 등록된 사주가 있으면 채워진 채로 뜨고, 체크를 풀면
          가족·친구 사주를 직접 넣을 수 있다. */}
      <SajuInputForm
        saved={saved}
        busy={false}
        confirmMode
        onSubmit={submit}
        submitLabel="이 사주로 살풀이 보기"
      />
    </>
  );
}
