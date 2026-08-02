/**
 * 오행 상생·상극 순환도.
 *
 * 이미지 파일이 아니라 인라인 SVG로 그린다. 텍스트가 HTML에 그대로 남아
 * 크롤러가 읽을 수 있고, 별도 요청 없이 즉시 렌더되며, 다크·라이트 어디서도 깨지지 않는다.
 */

const R = 108;        // 오각형 반지름
const NODE = 27;      // 노드 원 반지름
const CX = 160;
const CY = 152;

type El = { key: string; kr: string; color: string };

// 위에서 시작해 시계 방향(상생 순서): 목 → 화 → 토 → 금 → 수
const ELS: El[] = [
  { key: "木", kr: "목", color: "#4F7A5C" },
  { key: "火", kr: "화", color: "#C0392B" },
  { key: "土", kr: "토", color: "#C8743A" },
  { key: "金", kr: "금", color: "#8A8A88" },
  { key: "水", kr: "수", color: "#1F3D34" },
];

const pos = ELS.map((_, i) => {
  const a = (-90 + i * 72) * (Math.PI / 180);
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
});

/** 두 노드를 잇는 선분의 시작·끝점을 원 바깥으로 물려 계산 */
function edge(i: number, j: number, gapEnd = 12) {
  const a = pos[i], b = pos[j];
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  return {
    x1: a.x + ux * (NODE + 4),
    y1: a.y + uy * (NODE + 4),
    x2: b.x - ux * (NODE + gapEnd),
    y2: b.y - uy * (NODE + gapEnd),
  };
}

export function OhaengCycle() {
  // 상생: 이웃끼리 (목→화→토→금→수→목)
  const sheng = ELS.map((_, i) => edge(i, (i + 1) % 5));
  // 상극: 한 칸 건너뛰어 별 모양 (목→토, 화→금, 토→수, 금→목, 수→화)
  const ke = ELS.map((_, i) => edge(i, (i + 2) % 5));

  return (
    <figure className="my-2">
      <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
        <svg
          viewBox="0 0 320 304"
          className="w-full h-auto"
          role="img"
          aria-label="오행 상생상극 순환도. 상생은 목생화, 화생토, 토생금, 금생수, 수생목 순으로 이어지고, 상극은 목극토, 토극수, 수극화, 화극금, 금극목으로 이어집니다."
        >
          <defs>
            <marker id="ar-sheng" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,1 L9,5 L0,9 z" fill="#4F7A5C" />
            </marker>
            <marker id="ar-ke" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,1 L9,5 L0,9 z" fill="#C8743A" />
            </marker>
          </defs>

          {/* 상극 — 별 모양, 안쪽에 점선으로 */}
          {ke.map((e, i) => (
            <line
              key={`ke-${i}`}
              x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke="#C8743A" strokeWidth="1.4" strokeDasharray="5 4"
              markerEnd="url(#ar-ke)" opacity="0.75"
            />
          ))}

          {/* 상생 — 바깥 오각형 둘레 */}
          {sheng.map((e, i) => (
            <line
              key={`sheng-${i}`}
              x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke="#4F7A5C" strokeWidth="2.2" markerEnd="url(#ar-sheng)"
            />
          ))}

          {/* 노드 */}
          {ELS.map((el, i) => (
            <g key={el.key}>
              <circle cx={pos[i].x} cy={pos[i].y} r={NODE} fill="#FFFFFF" stroke={el.color} strokeWidth="2.5" />
              <text
                x={pos[i].x} y={pos[i].y - 2}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="19" fontWeight="700" fill={el.color}
                fontFamily="ui-serif, serif"
              >
                {el.key}
              </text>
              <text
                x={pos[i].x} y={pos[i].y + 14}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="10.5" fill="#6B6661"
              >
                {el.kr}
              </text>
            </g>
          ))}

          {/* 범례 */}
          <g transform="translate(16, 282)">
            <line x1="0" y1="0" x2="24" y2="0" stroke="#4F7A5C" strokeWidth="2.2" markerEnd="url(#ar-sheng)" />
            <text x="31" y="4" fontSize="11.5" fill="#1A1A18">상생 — 낳고 살린다</text>
            <line x1="150" y1="0" x2="174" y2="0" stroke="#C8743A" strokeWidth="1.4" strokeDasharray="5 4" markerEnd="url(#ar-ke)" />
            <text x="181" y="4" fontSize="11.5" fill="#1A1A18">상극 — 누르고 다스린다</text>
          </g>
        </svg>
      </div>
      <figcaption className="text-xs text-[#6B6661] leading-relaxed mt-2 px-1">
        바깥 둘레를 도는 초록 화살표가 상생(相生)입니다. 목생화·화생토·토생금·금생수·수생목으로
        이어지며 서로를 낳고 살립니다. 안쪽 별 모양의 구릿빛 점선은 상극(相克)으로,
        목극토·토극수·수극화·화극금·금극목의 관계입니다.
      </figcaption>
    </figure>
  );
}
