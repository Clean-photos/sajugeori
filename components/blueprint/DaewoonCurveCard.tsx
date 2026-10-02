// 운명 설계도 최상단 카드 — 대운 이중 곡선 (CoS §D, 2026-09-23).
// 인라인 SVG(html2canvas 캡처 안전) · 숫자 비노출(4단계 라벨만) · 390px 가로 스크롤 없음.
// 계산은 lib/blueprint-engine/daewoon-curve.ts(결정적)가 전부 한다 — 여기는 그리기만.
import type { BlueprintChart } from "@/lib/blueprint-engine/engine";
import type { AnchorFacts } from "@/lib/blueprint-engine/anchor";
import { buildDaewoonCurve, type CurveLabel } from "@/lib/blueprint-engine/daewoon-curve";

const W = 340;
const H = 180;
const X0 = 40;
const X1 = 330;
// §2(CoS 실물 확인, 2026-09-30): Y_TOP=10일 때 "지금" 라벨(y=Y_TOP-1=9, 상단으로
// 글자 높이만큼 더 올라감)이 뷰박스 위로 살짝 잘렸다(bbox y=-2) — 위 여백을 늘린다.
const Y_TOP = 14;
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

  // §C(CoS 9차, 2026-10-01 실물 확인): 라벨이 `지금`·교차 주석·정점 주석 3개인데, 이전엔 주석 둘
  // 사이만 충돌을 봐서 교차 주석이 맨 위로 올라가 `지금`과 겹쳤다("ㅈ55세~"). 이제 고정
  // 라벨(`지금`)을 포함한 3개 전체의 사각형 충돌을 보고, 후보 위치를 하나씩 시험해 겹치지 않는
  // 첫 자리를 쓴다. 후보는 점에 가까운 순서(점 바로 위 → 바로 아래 → 이웃 구간 밖 위/아래)라
  // 정점 라벨이 정점 동그라미에서 멀리 떨어지지 않는다.
  type Rect = { l: number; r: number; t: number; b: number };
  const hit = (a: Rect, b: Rect) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  // 글자폭 근사: 한글·한자 9.4px, 그 외(숫자·기호·공백) 5.4px(9.5px 글꼴 + 흰 외곽선 여유).
  const textWidth = (t: string) => [...t].reduce((w, ch) => w + (/[ㄱ-힣一-鿿]/.test(ch) ? 9.4 : 5.4), 0);

  const fixed: Rect[] = [];
  if (curIdx >= 0) {
    const cx = xOf(curIdx);
    fixed.push({ l: cx - 10, r: cx + 10, t: Y_TOP - 10, b: Y_TOP + 2 }); // "지금"(굵은 9px)
  }
  const placed: Rect[] = [];
  const annPositions = annotations.map((a) => {
    const p = points[a.index];
    const x = xOf(a.index);
    const yHigh = Math.min(yOf(p.e), yOf(p.s));
    const nb = points.slice(Math.max(0, a.index - 2), Math.min(n, a.index + 3));
    const nbTop = Math.min(...nb.map((q) => Math.min(yOf(q.e), yOf(q.s))));
    const nbBottom = Math.max(...nb.map((q) => Math.max(yOf(q.e), yOf(q.s))));
    const w = textWidth(a.text);
    const naturalAnchor: "start" | "middle" | "end" = x < X0 + 70 ? "start" : x > X1 - 70 ? "end" : "middle";
    const rectOf = (anchor: "start" | "middle" | "end", ty: number): Rect => {
      const l = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
      return { l, r: l + w, t: ty - 10, b: ty + 3 };
    };
    // 후보: (세로 위치, 가로 정렬) — 점에 가까운 순서.
    const ys = [yHigh - 8, yHigh + 17, nbTop - 12, nbBottom + 17];
    const anchors: ("start" | "middle" | "end")[] = [naturalAnchor, "start", "end", "middle"];
    let chosen: { ty: number; anchor: "start" | "middle" | "end" } | null = null;
    outer: for (const ty of ys) {
      for (const anchor of anchors) {
        const r = rectOf(anchor, ty);
        if (r.l < 2 || r.r > W - 2 || r.t < 0 || r.b > H) continue; // 뷰박스 밖
        if ([...fixed, ...placed].some((o) => hit(r, o))) continue;
        chosen = { ty, anchor };
        break outer;
      }
    }
    // 어느 후보도 안 맞으면(극단적으로 붐비는 경우) 가장 점에 가까운 자리를 쓴다 — 라벨을 지우진 않는다.
    const final = chosen ?? { ty: ys[0], anchor: naturalAnchor };
    placed.push(rectOf(final.anchor, final.ty));
    return { a, x, yHigh, ty: final.ty, anchor: final.anchor };
  });

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

        {annPositions.map(({ a, x, yHigh, ty, anchor }) => (
          <g key={a.index}>
            <circle cx={x} cy={yHigh} r={3.2} fill="#FBF8F2" stroke="#8A5228" strokeWidth={1.4} />
            <text x={x} y={ty} textAnchor={anchor} fontSize={9.5} fontWeight={600} fill="#8A5228" stroke="#FBF8F2" strokeWidth={3.5} paintOrder="stroke" strokeLinejoin="round">{a.text}</text>
          </g>
        ))}

        {/* 가로축 — 나이 구간을 두 줄로(10개가 390px에서 겹치지 않게).
            §8(CoS 실물 확인, 2026-09-29): 마지막 칸은 "92~101"처럼 끝나이가 찍혀
            헤더의 "…→ 92세"와 다른 숫자로 보였다 — 마지막 칸만 열린 구간("92~")으로 표기. */}
        {points.map((p, i) => (
          <g key={p.startAge}>
            <text x={xOf(i)} y={Y_BOTTOM + 13} textAnchor="middle" fontSize={9} fill="#1A1A18">{p.startAge}</text>
            <text x={xOf(i)} y={Y_BOTTOM + 24} textAnchor="middle" fontSize={8} fill="#9B968F">{i === n - 1 ? "~" : `~${p.endAge}`}</text>
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
