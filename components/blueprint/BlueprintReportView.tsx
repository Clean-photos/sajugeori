import type { BlueprintReport, BlueprintPartial } from "@/lib/blueprint-engine/generate";
import { AXES } from "@/lib/blueprint-engine/questions";
import { buildDaewoonRoadmap, type DaewoonPhase } from "@/lib/blueprint-engine/daewoon-roadmap";
import { PrintButton, PrintReportFooter } from "@/components/premium/PrintReport";
import * as C from "@/lib/saju-engine/constants";

const GRADE_LABEL: Record<string, string> = { A: "근거 강도 A", B: "근거 강도 B", C: "근거 강도 C" };
const GRADE_COLOR: Record<string, string> = { A: "#1F3D34", B: "#8A5228", C: "#6B6661" };
// §2-4: 겁을 주지 않는 톤(브랜드 규칙)을 지키려 소진기도 경고색(빨강)이 아니라
// 브랜드 코퍼(#C8743A)로 — "나쁘다"가 아니라 "쉬어가는 시기"로 읽히게 한다.
const DAEWOON_PHASE_COLOR: Record<DaewoonPhase, string> = {
  boost: "#1F3D34",
  drain: "#C8743A",
  mixed: "#9B968F",
  neutral: "#9B968F",
};

// R3(CoS+CEO 실물 확인, 2026-09-08): 지표를 논거로 쓰면서 정작 범위·산출
// 기준을 밝히지 않았다 — 궁합의 "74점/100점" 방식으로 맞춘다.
function Gauge({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-[#6B6661] mb-0.5">
        <span>{label}</span>
        <span className="font-semibold text-[#1A1A18]">{value}<span className="text-[#9B968F] font-normal">/100</span></span>
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
      <p className="text-base text-[#1A1A18] leading-relaxed mb-2">{block.why}</p>
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

function SkeletonCard({ label }: { label: string }) {
  return (
    <div className="border border-[#E5DFD4] rounded-2xl p-4 bg-[#FBF8F2] animate-pulse">
      <p className="text-xs text-[#9B968F]">{label} 작성 중...</p>
      <div className="h-3 bg-[#E5DFD4] rounded mt-3 w-3/4" />
      <div className="h-3 bg-[#E5DFD4] rounded mt-2 w-1/2" />
    </div>
  );
}

/**
 * report가 완성본이 아니라 부분 생성 중인 조각(BlueprintPartial)일 수 있다 —
 * 축 단위 병렬 생성이라 총론·각 축이 도착하는 대로 순차 노출하고, 아직
 * 안 온 부분은 스켈레톤으로 대체한다.
 */
export function BlueprintReportView({ report, showPrintButton = true }: { report: BlueprintReport | BlueprintPartial; showPrintButton?: boolean }) {
  const { chart, facts, narrative, overview, axes, closing } = report;
  const p = chart?.pillars;

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      <div className="print-area flex flex-col gap-4">
        {/* 운명총론 — §3-1(CEO 지시, 2026-09-08): 예전엔 줄바꿈 없는 한 덩어리(약
            700자)였다. 프롬프트가 이제 "1. 요약문장 …" 4문단(\n\n 구분)으로
            내지만, 렌더가 여전히 한 <p>에 몰아넣으면 브라우저가 줄바꿈을 접어
            버려 그대로 한 덩어리로 보인다 — 문단마다 나눠 그린다. */}
        {overview ? (
          <div className="print-card rounded-2xl bg-[#1F3D34] text-white p-5">
            <p className="text-[10px] tracking-[0.2em] text-[#C8743A] uppercase mb-2">운명총론</p>
            <p className="font-serif text-xl font-bold leading-snug mb-3">{overview.headline}</p>
            <div className="flex flex-col gap-2.5">
              {overview.body.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean).map((para, i) => (
                <p key={i} className="text-base text-white/80 leading-relaxed">{para}</p>
              ))}
            </div>
          </div>
        ) : <SkeletonCard label="운명총론" />}

        {/* 명식 표 */}
        {chart && facts && p && (
        <div className="print-card border border-[#E5DFD4] rounded-2xl p-4 bg-[#FBF8F2]">
          <p className="font-serif text-[17px] font-bold text-[#1F3D34] mb-3">명식</p>
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
        )}

        {/* 6대 지표 */}
        {facts && (
        <div className="print-card border border-[#E5DFD4] rounded-2xl p-4 bg-[#FBF8F2] flex flex-col gap-3">
          <div>
            <p className="font-serif text-[17px] font-bold text-[#1F3D34]">6대 지표</p>
            <p className="text-[11px] text-[#6B6661] mt-1 leading-relaxed">
              0~100 범위. 명식의 십성 구성·오행 분포·합충형해파를 가중합해 산출합니다.
            </p>
          </div>
          <Gauge label="축적력" value={facts.indicators.accumulation} />
          <Gauge label="확장력" value={facts.indicators.expansion} />
          <Gauge label="지구력" value={facts.indicators.endurance} />
          <Gauge label="연결력" value={facts.indicators.connection} />
          <Gauge label="회복력" value={facts.indicators.recovery} />
          <Gauge label="변동성" value={facts.indicators.volatility} />
        </div>
        )}

        {/* 구조적 제약 / 지렛대 */}
        {narrative ? (
        <div className="print-card grid grid-cols-1 gap-3">
          <div className="border border-[#E5DFD4] rounded-2xl p-4 bg-[#FBF8F2]">
            <p className="font-serif text-[17px] font-bold text-[#1F3D34] mb-2">구조적 제약</p>
            {narrative.constraints.map((c, i) => <p key={i} className="text-base text-[#1A1A18] leading-relaxed mb-1.5">{c}</p>)}
          </div>
          <div className="border border-[#E5DFD4] rounded-2xl p-4 bg-[#FBF8F2]">
            <p className="font-serif text-[17px] font-bold text-[#1F3D34] mb-2">지렛대</p>
            {narrative.leverages.map((c, i) => <p key={i} className="text-base text-[#1A1A18] leading-relaxed mb-1.5">{c}</p>)}
          </div>
        </div>
        ) : chart && <SkeletonCard label="구조적 제약 · 지렛대" />}

        {/* 대운 로드맵 — §2-4(CoS+CEO 실물 확인, 2026-09-08): 예전엔 간지·나이만
            나열해 "평생 대운은 어떻게 흘러가는가"(Q6) 본문이 참고할 시기 정보가
            실질적으로 없었다. 이제 구간마다 용신·기신 판정(daewoon-roadmap.ts —
            Q6 프롬프트에 넣는 것과 같은 함수)을 색으로 보여준다. 서술과 그림의
            근거가 같아야 "32~41세만 유일한 창" 같은 자기모순이 재발하지 않는다. */}
        {chart && facts && (
        <div className="print-card border border-[#E5DFD4] rounded-2xl p-4 bg-[#FBF8F2]">
          <p className="font-serif text-[17px] font-bold text-[#1F3D34] mb-1">대운 로드맵</p>
          <div className="flex items-center gap-3 text-[10px] text-[#6B6661] mb-2.5">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#1F3D34]" />보강기</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#C8743A]" />소진기</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#9B968F]" />혼재·완만</span>
          </div>
          <div className="flex flex-col gap-1">
            {buildDaewoonRoadmap(chart.precise_daewoon.list, facts.yongsin, facts.gisin, facts.daewoonNow?.ganji ?? null).map((d) => (
              <div
                key={d.index}
                className="flex items-center gap-2.5 text-xs rounded-lg px-2 py-1.5"
                style={{
                  backgroundColor: d.isCurrent ? "#1F3D3414" : "transparent",
                  borderLeft: `3px solid ${DAEWOON_PHASE_COLOR[d.phase]}`,
                }}
              >
                <span className="text-[#6B6661] w-16 flex-shrink-0">{d.start_age}~{d.end_age}세</span>
                <span className="font-medium text-[#1A1A18] w-14 flex-shrink-0">{d.ganji}</span>
                <span className="text-[10px] font-medium flex-shrink-0" style={{ color: DAEWOON_PHASE_COLOR[d.phase] }}>
                  {d.phaseLabel}
                </span>
                {d.isCurrent && <span className="text-[10px] text-[#C8743A] font-semibold">← 현재</span>}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#6B6661] mt-2">
            {chart.precise_daewoon.direction} · 대운수 {chart.precise_daewoon.start_age}
            (정밀 절기 기준 {chart.precise_daewoon.start_age_days.toFixed(1)}일)
          </p>
        </div>
        )}

        {/* 4개 축 × 6문항 — 아직 안 온 축은 스켈레톤 */}
        {narrative && AXES.map((axisDef) => {
          const axis = axes?.find((a) => a.id === axisDef.id);
          if (!axis) return <SkeletonCard key={axisDef.id} label={`운명의 축 — ${axisDef.title}`} />;
          return (
            <div key={axis.id} className="flex flex-col gap-3">
              <div className="print-card rounded-xl bg-[#1F3D34] text-white px-4 py-3">
                <p className="font-serif text-base font-bold">운명의 축 — {axis.title}</p>
                <p className="text-xs text-white/60 mt-0.5">{axis.subtitle}</p>
              </div>
              {axis.questions.map((q, i) => (
                <QABlockCard key={q.id} index={i + 1} question={q.question || ""} block={q} />
              ))}
            </div>
          );
        })}

        {/* 실행 설계 */}
        {closing ? (
        <div className="print-card border border-[#E5DFD4] rounded-2xl p-4 bg-[#FBF8F2] flex flex-col gap-3">
          <p className="font-serif text-[17px] font-bold text-[#1F3D34]">운명 실행 설계</p>
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
        ) : axes && axes.length === AXES.length && <SkeletonCard label="운명 실행 설계" />}

        {/* 조언 5 */}
        {closing && (
        <div className="print-card rounded-2xl bg-[#1F3D34] text-white p-5">
          <p className="font-serif text-lg font-bold mb-3">운명 설계 위에 인생을 쌓을 때 잊지 말아야 할 조언 5</p>
          {closing.advice.map((a, i) => (
            <p key={i} className="text-base text-white/85 leading-relaxed mb-3">{a}</p>
          ))}
        </div>
        )}

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

      {showPrintButton && closing && <PrintButton label="인쇄 · PDF로 저장하기" />}
    </div>
  );
}
