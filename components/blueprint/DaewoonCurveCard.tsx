// 운명 설계도 최상단 카드 — 대운 이중 곡선 (CoS §D, 2026-09-23).
// 인라인 SVG(html2canvas 캡처 안전) · 숫자 비노출(4단계 라벨만) · 390px 가로 스크롤 없음.
// 계산은 lib/blueprint-engine/daewoon-curve.ts(결정적)가 전부 한다 — 여기는 그리기만.
import type { BlueprintChart } from "@/lib/blueprint-engine/engine";
import type { AnchorFacts } from "@/lib/blueprint-engine/anchor";
import { buildDaewoonCurve, type CurveLabel } from "@/lib/blueprint-engine/daewoon-curve";

const W = 340;
const H = 176;
const X0 = 40;
const X1 = 330;
const Y_TOP = 10;
const Y_BOTTOM = 150;
const V_LO = 25;
const V_HI = 95;

const E_COLOR = "#C8743A";
const S_COLOR = "#1F3D34";

// 세로축 라벨 위치(각 구간의 중앙값)
const AXIS_LEVELS: { label: CurveLabel; value: number }[] = [
  { label: "높음", value: 84 },
  { label: "양호", value: 70 },
  { label: "보통", value: 53 },
  { label: "낮음", value: 36 },
];

function yOf(v: number): number {
  return Y_BOTTOM - ((v - V_LO) / (V_HI - V_LO)) * (Y_BOTTOM - Y_TOP);
}

export function DaewoonCurveCard({ chart, facts }: { chart: BlueprintChart; facts: AnchorFacts }) {
  let curve;
  try {
    curve = buildDaewoonCurve(chart, facts);
  } catch (e) {
    console.error("대운 곡선 계산 실패:", e);
    return null;
  }
  if (!curve) return null;

  const { points, annotations, crossAt, summary } = curve;
  const n = points.length;
  const xOf = (i: number) => X0 + (i / (n - 1)) * (X1 - X0);
  const line = (key: "e" | "s") => points.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(p[key]).toFixed(1)}`).join(" ");
  const eLine = line("e");
  const eArea = `${eLine} L${xOf(n - 1).toFixed(1)},${Y_BOTTOM} L${xOf(0).toFixed(1)},${Y_BOTTOM} Z`;
  const curIdx = points.findIndex((p) => p.isCurrent);

  const firstAge = points[0].startAge;
  const lastAge = points[n - 1].startAge;

  return (
    <div className="print-card rounded-2xl border border-[#E5DFD4] bg-[#FBF8F2] p-4">
      <p className="text-[10.5px] font-semibold tracking-[0.14em] text-[#6B6661]">대운 이중 곡선</p>
      <p className="mt-1 font-serif text-[17px] font-bold leading-tight text-[#1F3D34]">
        {firstAge}세 → {lastAge}세 <span className="text-[#6B6661] font-normal text-[12px]">· 사회적 확장력 / 정서·관계 안정도</span>
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full h-auto" role="img" aria-label="대운별 사회적 확장력과 정서·관계 안정도 흐름">
        {crossAt !== null && (
          <rect x={X0 + (crossAt / (n - 1)) * (X1 - X0)} y={Y_TOP} width={X1 - (X0 + (crossAt / (n - 1)) * (X1 - X0))} height={Y_BOTTOM - Y_TOP} fill="#1F3D34" opacity={0.05} />
        )}
        {AXIS_LEVELS.map((lv) => (
          <g key={lv.label}>
            <line x1={X0} x2={X1} y1={yOf(lv.value)} y2={yOf(lv.value)} stroke="#E5DFD4" strokeWidth={0.7} />
            <text x={X0 - 6} y={yOf(lv.value) + 3} textAnchor="end" fontSize={9} fill="#6B6661">{lv.label}</text>
          </g>
        ))}

        <path d={eArea} fill={E_COLOR} opacity={0.12} />
        <path d={eLine} fill="none" stroke={E_COLOR} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={line("s")} fill="none" stroke={S_COLOR} strokeWidth={2} strokeDasharray="5 3.5" strokeLinejoin="round" strokeLinecap="round" />

        {curIdx >= 0 && (
          <g>
            <line x1={xOf(curIdx)} x2={xOf(curIdx)} y1={Y_TOP} y2={Y_BOTTOM} stroke="#6B6661" strokeWidth={0.9} strokeDasharray="2 2.5" />
            <text x={xOf(curIdx)} y={Y_TOP - 1} textAnchor="middle" fontSize={9} fontWeight={700} fill="#6B6661">지금</text>
          </g>
        )}

        {annotations.map((a) => {
          const p = points[a.index];
          const x = xOf(a.index);
          const yHigh = Math.min(yOf(p.e), yOf(p.s));
          const above = yHigh > Y_TOP + 22;
          const ty = above ? yHigh - 9 : Math.max(yOf(p.e), yOf(p.s)) + 15;
          const anchor = x < X0 + 70 ? "start" : x > X1 - 70 ? "end" : "middle";
          return (
            <g key={a.index}>
              <circle cx={x} cy={yHigh} r={3.2} fill="#FBF8F2" stroke="#8A5228" strokeWidth={1.4} />
              <text x={x} y={ty} textAnchor={anchor} fontSize={9.5} fontWeight={600} fill="#8A5228" stroke="#FBF8F2" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round">{a.text}</text>
            </g>
          );
        })}

        {/* 가로축 — 나이 구간을 두 줄로(10개가 390px에서 겹치지 않게) */}
        {points.map((p, i) => (
          <g key={p.startAge}>
            <text x={xOf(i)} y={Y_BOTTOM + 13} textAnchor="middle" fontSize={9} fill="#1A1A18">{p.startAge}</text>
            <text x={xOf(i)} y={Y_BOTTOM + 24} textAnchor="middle" fontSize={8} fill="#9B968F">~{p.endAge}</text>
          </g>
        ))}
      </svg>

      <div className="mt-1 flex items-center gap-4 text-[11px] text-[#6B6661]">
        <span className="flex items-center gap-1.5">
          <svg width="20" height="6" aria-hidden><line x1="0" y1="3" x2="20" y2="3" stroke={E_COLOR} strokeWidth={2.4} /></svg>확장력
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="20" height="6" aria-hidden><line x1="0" y1="3" x2="20" y2="3" stroke={S_COLOR} strokeWidth={2} strokeDasharray="4 3" /></svg>안정도
        </span>
      </div>

      <div className="mt-3 rounded-xl px-3 py-2.5 text-[12.5px] font-semibold leading-relaxed" style={{ backgroundColor: "#FDF0E3", border: "1px solid #E9D9C4", color: "#8A5228" }}>
        {summary}
      </div>
      <p className="mt-2 text-[10.5px] text-[#6B6661]">본인 생애 안에서의 상대적 흐름입니다 · 낮은 구간은 다지는 시기, 변화가 큰 시기입니다</p>
    </div>
  );
}
