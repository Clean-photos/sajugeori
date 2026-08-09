import type { BlueprintReport } from "@/lib/blueprint-engine/generate";
import { PrintButton, PrintReportFooter } from "@/components/premium/PrintReport";
import * as C from "@/lib/saju-engine/constants";

const GRADE_LABEL: Record<string, string> = { A: "근거 강도 A", B: "근거 강도 B", C: "근거 강도 C" };
const GRADE_COLOR: Record<string, string> = { A: "#1F3D34", B: "#8A5228", C: "#6B6661" };

function Gauge({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-[#6B6661] mb-0.5">
        <span>{label}</span><span className="font-semibold text-[#1A1A18]">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-[#E5DFD4] overflow-hidden">
        <div className="h-full bg-[#C8743A]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function PillarCell({ label, stem, branch, tgStem, tgBranch }: {
  label: string; stem?: string; branch?: string; tgStem?: string; tgBranch?: string;
}) {
  return (
    <div className="text-center border border-[#E5DFD4] rounded-lg py-2">
      <p className="text-[10px] text-[#6B6661] mb-1">{label}</p>
      <p className="text-[10px] text-[#8A5228] mb-0.5">{tgStem ?? "—"}</p>
      <p className="font-serif text-lg font-bold text-[#1F3D34]">{stem ?? "미상"}</p>
      <p className="font-serif text-lg font-bold text-[#1F3D34]">{branch ?? "미상"}</p>
      <p className="text-[10px] text-[#8A5228] mt-0.5">{tgBranch ?? "—"}</p>
    </div>
  );
}

/** 스펙의 "판정→수치→왜→장면→반증→처방" 6블록 고정 카드. */
function QABlockCard({ index, question, block }: { index: number; question: string; block: BlueprintReport["axes"][number]["questions"][number] }) {
  return (
    <div className="print-card border border-[#E5DFD4] rounded-2xl p-4 bg-[#FBF8F2]">
      <p className="text-xs text-[#6B6661] mb-1">Q{index}</p>
      <p className="font-serif text-base font-bold text-[#1F3D34] mb-2">{question}</p>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-[#1A1A18]">{block.verdict}</p>
        <span
          className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ color: "#fff", backgroundColor: GRADE_COLOR[block.evidenceGrade] }}
        >
          {GRADE_LABEL[block.evidenceGrade]}
        </span>
      </div>
      <p className="text-xs text-[#6B6661] mb-2">수치 — {block.metrics}</p>
      <p className="text-sm text-[#1A1A18] leading-relaxed mb-2">{block.why}</p>
      <ul className="text-xs text-[#6B6661] list-disc list-inside mb-2 flex flex-col gap-0.5">
        {block.scenes.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
      <div className="bg-[#C8743A]/8 border border-[#C8743A]/25 rounded-xl p-2.5 text-xs text-[#6B6661] mb-2">
        <span className="font-semibold text-[#8A5228]">반증 — </span>{block.counterEvidence}
      </div>
      <div className="flex flex-col gap-1">
        {block.actions.map((a, i) => (
          <p key={i} className="text-xs text-[#1A1A18]">✓ {a}</p>
        ))}
      </div>
    </div>
  );
}

export function BlueprintReportView({ report }: { report: BlueprintReport }) {
  const { chart, facts, narrative, overview, axes, closing } = report;
  const p = chart.pillars;

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      <div className="print-area flex flex-col gap-4">
        {/* 운명총론 */}
        <div className="print-card rounded-2xl bg-[#1F3D34] text-white p-5">
          <p className="text-[10px] tracking-[0.2em] text-[#C8743A] uppercase mb-2">운명총론</p>
          <p className="font-serif text-xl font-bold leading-snug mb-3">{overview.headline}</p>
          <p className="text-sm text-white/80 leading-relaxed">{overview.body}</p>
        </div>

        {/* 명식 표 */}
        <div className="print-card border border-[#E5DFD4] rounded-2xl p-4 bg-[#FBF8F2]">
          <p className="text-sm font-semibold text-[#1F3D34] mb-3">명식</p>
          <div className="grid grid-cols-4 gap-2">
            <PillarCell label="시" stem={p.hour ? `${p.hour.stem}(${C.STEM_KR[p.hour.stem]})` : undefined} branch={p.hour ? `${p.hour.branch}(${C.BRANCH_KR[p.hour.branch]})` : undefined} tgStem={chart.ten_gods.hour_stem} tgBranch={chart.ten_gods.hour_branch} />
            <PillarCell label="일" stem={`${p.day.stem}(${C.STEM_KR[p.day.stem]})`} branch={`${p.day.branch}(${C.BRANCH_KR[p.day.branch]})`} tgStem="일간(본원)" tgBranch={chart.ten_gods.day_branch} />
            <PillarCell label="월" stem={`${p.month.stem}(${C.STEM_KR[p.month.stem]})`} branch={`${p.month.branch}(${C.BRANCH_KR[p.month.branch]})`} tgStem={chart.ten_gods.month_stem} tgBranch={chart.ten_gods.month_branch} />
            <PillarCell label="년" stem={`${p.year.stem}(${C.STEM_KR[p.year.stem]})`} branch={`${p.year.branch}(${C.BRANCH_KR[p.year.branch]})`} tgStem={chart.ten_gods.year_stem} tgBranch={chart.ten_gods.year_branch} />
          </div>
          <p className="text-xs text-[#6B6661] mt-3">
            일간 {facts.dayMaster} — 신강도: {facts.strengthVerdict}
          </p>
          <p className="text-xs text-[#6B6661] mt-1">
            오행: {(Object.entries(chart.elements) as [string, number][]).map(([e, v]) => `${C.ELEMENT_KR[e as keyof typeof C.ELEMENT_KR]}${v}`).join(" · ")}
          </p>
        </div>

        {/* 6대 지표 */}
        <div className="print-card border border-[#E5DFD4] rounded-2xl p-4 bg-[#FBF8F2] flex flex-col gap-3">
          <p className="text-sm font-semibold text-[#1F3D34]">6대 지표</p>
          <Gauge label="축적력" value={facts.indicators.accumulation} />
          <Gauge label="확장력" value={facts.indicators.expansion} />
          <Gauge label="지구력" value={facts.indicators.endurance} />
          <Gauge label="연결력" value={facts.indicators.connection} />
          <Gauge label="회복력" value={facts.indicators.recovery} />
          <Gauge label="변동성" value={facts.indicators.volatility} />
        </div>

        {/* 구조적 제약 / 지렛대 */}
        <div className="print-card grid grid-cols-1 gap-3">
          <div className="border border-[#E5DFD4] rounded-2xl p-4 bg-[#FBF8F2]">
            <p className="text-sm font-semibold text-[#1F3D34] mb-2">구조적 제약</p>
            {narrative.constraints.map((c, i) => <p key={i} className="text-sm text-[#1A1A18] leading-relaxed mb-1.5">{c}</p>)}
          </div>
          <div className="border border-[#E5DFD4] rounded-2xl p-4 bg-[#FBF8F2]">
            <p className="text-sm font-semibold text-[#1F3D34] mb-2">지렛대</p>
            {narrative.leverages.map((c, i) => <p key={i} className="text-sm text-[#1A1A18] leading-relaxed mb-1.5">{c}</p>)}
          </div>
        </div>

        {/* 대운 로드맵 */}
        <div className="print-card border border-[#E5DFD4] rounded-2xl p-4 bg-[#FBF8F2]">
          <p className="text-sm font-semibold text-[#1F3D34] mb-3">대운 로드맵</p>
          <div className="flex flex-col gap-1.5">
            {chart.precise_daewoon.list.map((d) => (
              <div key={d.index} className="flex items-center justify-between text-xs">
                <span className="text-[#6B6661]">{d.start_age}~{d.end_age}세</span>
                <span className="font-medium text-[#1A1A18]">{d.ganji}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#6B6661] mt-2">
            {chart.precise_daewoon.direction} · 대운수 {chart.precise_daewoon.start_age}
            (정밀 절기 기준 {chart.precise_daewoon.start_age_days.toFixed(1)}일)
          </p>
        </div>

        {/* 4개 축 × 6문항 */}
        {axes.map((axis) => (
          <div key={axis.id} className="flex flex-col gap-3">
            <div className="print-card rounded-xl bg-[#1F3D34] text-white px-4 py-3">
              <p className="font-serif text-base font-bold">운명의 축 — {axis.title}</p>
              <p className="text-xs text-white/60 mt-0.5">{axis.subtitle}</p>
            </div>
            {axis.questions.map((q, i) => (
              <QABlockCard key={q.id} index={i + 1} question={q.question || ""} block={q} />
            ))}
          </div>
        ))}

        {/* 실행 설계 */}
        <div className="print-card border border-[#E5DFD4] rounded-2xl p-4 bg-[#FBF8F2] flex flex-col gap-3">
          <p className="text-sm font-semibold text-[#1F3D34]">운명 실행 설계</p>
          <div>
            <p className="text-xs font-semibold text-[#8A5228] mb-1">유지</p>
            {closing.keep.map((k, i) => <p key={i} className="text-xs text-[#1A1A18] mb-1">· {k}</p>)}
          </div>
          <div>
            <p className="text-xs font-semibold text-[#C0392B] mb-1">중단</p>
            {closing.stop.map((k, i) => <p key={i} className="text-xs text-[#1A1A18] mb-1">· {k}</p>)}
          </div>
          <div>
            <p className="text-xs font-semibold text-[#1F3D34] mb-1">신설</p>
            {closing.start.map((k, i) => <p key={i} className="text-xs text-[#1A1A18] mb-1">· {k}</p>)}
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6661] mb-1">재점검 시점</p>
            {closing.recheckPoints.map((k, i) => <p key={i} className="text-xs text-[#1A1A18] mb-1">· {k}</p>)}
          </div>
        </div>

        {/* 조언 5 */}
        <div className="print-card rounded-2xl bg-[#1F3D34] text-white p-5">
          <p className="font-serif text-lg font-bold mb-3">운명 설계 위에 인생을 쌓을 때 잊지 말아야 할 조언 5</p>
          {closing.advice.map((a, i) => (
            <p key={i} className="text-sm text-white/85 leading-relaxed mb-3">{a}</p>
          ))}
        </div>

        {/* 판독 한계 · 고지 */}
        <div className="text-[11px] text-[#6B6661] leading-relaxed border-t border-[#E5DFD4] pt-3">
          <p className="mb-1">
            진태양시 보정(전국 평균 경도 기준)을 적용했습니다. 출생지가 서울에서 크게 떨어진
            지역이라면 시주 판정이 몇 분 차이로 달라질 수 있습니다.
          </p>
          <p>
            본 리포트는 명리학에 기반한 해석이며, 의학·법률·투자 자문이 아닙니다.
            중요한 결정은 해당 분야 전문가와 상의하십시오.
          </p>
        </div>

        <PrintReportFooter />
      </div>

      <PrintButton label="인쇄 · PDF로 저장하기" />
    </div>
  );
}
