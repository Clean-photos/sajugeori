// 오행 상생상극 원형도 — 개인화 버전 (§2 오행 지도, 기획서가 "상품의 얼굴"이라 부른 도표).
// 정적 버전은 components/diagrams/OhaengCycle.tsx(/guide/ohaeng-mechanism). 이 컴포넌트는
// 그 위에 실제 명식의 표면 계수를 얹어 "강한 축은 굵게, 끊긴 흐름은 점선"을 구현한다.
// 기하·스타일 결정은 lib/wuxing/circle-diagram.ts의 순수 함수가 맡는다(DOM 없이 테스트 가능).
import type { Element } from "@/lib/saju-engine/constants";
import * as C from "@/lib/saju-engine/constants";
import {
  buildCircleLayout,
  buildEdges,
  edgeEndpoints,
  nodeStyleFor,
  buildAriaSummary,
  ELEMENT_COLOR,
  CIRCLE_ORDER,
} from "@/lib/wuxing/circle-diagram";

export function OhaengCircleDiagram({ surface }: { surface: Record<Element, number> }) {
  const layout = buildCircleLayout();
  const edges = buildEdges(surface);
  const sheng = edges.filter((e) => e.kind === "생");
  const ke = edges.filter((e) => e.kind === "극");
  const ariaLabel = buildAriaSummary(surface);

  return (
    <figure className="my-2">
      <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
        <svg viewBox="0 0 320 304" className="w-full h-auto" role="img" aria-label={ariaLabel}>
          <defs>
            {CIRCLE_ORDER.map((el) => (
              <marker
                key={`ar-${el}`}
                id={`ar-${el}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M0,1 L9,5 L0,9 z" fill={ELEMENT_COLOR[el]} />
              </marker>
            ))}
          </defs>

          {/* 상극 — 별 모양(두 칸 건너뜀), 안쪽 */}
          {ke.map((e, i) => {
            const p = edgeEndpoints(layout, e.from, e.to);
            return (
              <line
                key={`ke-${i}`}
                x1={p.x1}
                y1={p.y1}
                x2={p.x2}
                y2={p.y2}
                stroke={ELEMENT_COLOR[e.from]}
                strokeWidth={e.style.strokeWidth}
                strokeDasharray={e.style.dashed ? "5 4" : undefined}
                opacity={e.style.opacity * 0.8}
                markerEnd={`url(#ar-${e.from})`}
              />
            );
          })}

          {/* 상생 — 바깥 오각형 둘레 */}
          {sheng.map((e, i) => {
            const p = edgeEndpoints(layout, e.from, e.to);
            return (
              <line
                key={`sheng-${i}`}
                x1={p.x1}
                y1={p.y1}
                x2={p.x2}
                y2={p.y2}
                stroke={ELEMENT_COLOR[e.from]}
                strokeWidth={e.style.strokeWidth}
                strokeDasharray={e.style.dashed ? "5 4" : undefined}
                opacity={e.style.opacity}
                markerEnd={`url(#ar-${e.from})`}
              />
            );
          })}

          {/* 노드 — 색은 보조 강조일 뿐, 한자·한글 라벨이 1차 식별 수단 */}
          {CIRCLE_ORDER.map((el) => {
            const pos = layout.positions[el];
            const style = nodeStyleFor(surface[el]);
            const color = ELEMENT_COLOR[el];
            return (
              <g key={el}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={layout.nodeRadius}
                  fill="#FFFFFF"
                  stroke={color}
                  strokeWidth={style.strokeWidth}
                  strokeDasharray={style.dashed ? "4 3" : undefined}
                />
                <text
                  x={pos.x}
                  y={pos.y - 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="19"
                  fontWeight="700"
                  fill="#1A1A18"
                  fontFamily="ui-serif, serif"
                >
                  {el}
                </text>
                <text x={pos.x} y={pos.y + 14} textAnchor="middle" dominantBaseline="middle" fontSize="10.5" fill="#6B6661">
                  {C.ELEMENT_KR[el]}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + layout.nodeRadius + 13}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6B6661"
                  fontWeight="600"
                >
                  {surface[el]}개
                </text>
              </g>
            );
          })}

          {/* 범례 */}
          <g transform="translate(16, 288)">
            <line x1="0" y1="0" x2="20" y2="0" stroke="#1A1A18" strokeWidth="2.6" />
            <text x="26" y="4" fontSize="10.5" fill="#1A1A18">실선 = 흐름 있음</text>
            <line x1="132" y1="0" x2="152" y2="0" stroke="#1A1A18" strokeWidth="1.4" strokeDasharray="5 4" />
            <text x="158" y="4" fontSize="10.5" fill="#1A1A18">점선 = 흐름 약함·끊김</text>
          </g>
        </svg>
      </div>
      <figcaption className="text-xs text-[#6B6661] leading-relaxed mt-2 px-1">
        바깥 둘레는 상생(相生, 목생화·화생토·토생금·금생수·수생목), 안쪽 별 모양은 상극(相克, 목극토·토극수·수극화·화극금·금극목)입니다.
        화살표는 <b>나가는 쪽(생·극을 시키는 쪽) 오행의 개수</b>로 굵기를 정합니다 — 그 오행이 부족·부재하면 흐름 자체가 옅어지고 점선이 됩니다.
      </figcaption>
    </figure>
  );
}
