/**
 * 사주 네 기둥 구조도 — 연·월·일·시 각 기둥의 천간/지지와 담당 영역.
 * 이미지 파일이 아니라 인라인 SVG라 텍스트가 HTML에 남고 크롤러가 읽는다.
 */

const COLS = [
  { pillar: "연주", hanja: "年柱", stem: "천간", branch: "지지", area: "조상·초년" },
  { pillar: "월주", hanja: "月柱", stem: "천간", branch: "지지", area: "부모·사회" },
  { pillar: "일주", hanja: "日柱", stem: "일간", branch: "지지", area: "나·배우자" },
  { pillar: "시주", hanja: "時柱", stem: "천간", branch: "지지", area: "자식·말년" },
];

const W = 72;   // 셀 너비
const GAP = 10;
const X0 = 14;

export function FourPillars() {
  return (
    <figure className="my-2">
      <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
        <svg
          viewBox="0 0 342 214"
          className="w-full h-auto"
          role="img"
          aria-label="사주 네 기둥 구조도. 연주는 조상과 초년, 월주는 부모와 사회, 일주는 나와 배우자, 시주는 자식과 말년을 나타내며 각 기둥은 천간과 지지 두 글자로 이루어집니다. 일주의 천간이 사주의 주인공인 일간입니다."
        >
          {COLS.map((c, i) => {
            const x = X0 + i * (W + GAP);
            const isDay = c.pillar === "일주";
            return (
              <g key={c.pillar}>
                {/* 기둥 이름 */}
                <text x={x + W / 2} y="16" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#1F3D34">
                  {c.pillar}
                </text>
                <text x={x + W / 2} y="30" textAnchor="middle" fontSize="9.5" fill="#6B6661">
                  {c.hanja}
                </text>

                {/* 천간 칸 */}
                <rect
                  x={x} y="40" width={W} height="52" rx="9"
                  fill={isDay ? "#1F3D34" : "#FFFFFF"}
                  stroke={isDay ? "#1F3D34" : "#E5DFD4"} strokeWidth="1.5"
                />
                <text
                  x={x + W / 2} y="66" textAnchor="middle" dominantBaseline="middle"
                  fontSize="13" fontWeight={isDay ? "700" : "500"}
                  fill={isDay ? "#FFFFFF" : "#1A1A18"}
                >
                  {c.stem}
                </text>
                <text
                  x={x + W / 2} y="81" textAnchor="middle" dominantBaseline="middle"
                  fontSize="9" fill={isDay ? "#C8743A" : "#6B6661"}
                >
                  {isDay ? "사주의 주인공" : "天干"}
                </text>

                {/* 지지 칸 */}
                <rect
                  x={x} y="98" width={W} height="46" rx="9"
                  fill="#FFFFFF" stroke="#E5DFD4" strokeWidth="1.5"
                />
                <text x={x + W / 2} y="116" textAnchor="middle" dominantBaseline="middle" fontSize="13" fill="#1A1A18">
                  {c.branch}
                </text>
                <text x={x + W / 2} y="131" textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#6B6661">
                  地支
                </text>

                {/* 담당 영역 */}
                <rect x={x} y="154" width={W} height="26" rx="7" fill="#C8743A" opacity="0.1" />
                <text x={x + W / 2} y="167" textAnchor="middle" dominantBaseline="middle" fontSize="10.5" fill="#8A5228">
                  {c.area}
                </text>
              </g>
            );
          })}

          <text x="171" y="200" textAnchor="middle" fontSize="11" fill="#6B6661">
            네 기둥 × 두 글자 = 여덟 글자, 곧 사주팔자(四柱八字)
          </text>
        </svg>
      </div>
      <figcaption className="text-xs text-[#6B6661] leading-relaxed mt-2 px-1">
        태어난 연·월·일·시가 각각 하나의 기둥이 되고, 기둥마다 하늘의 기운인 천간과 땅의 기운인
        지지가 한 글자씩 놓여 모두 여덟 글자가 됩니다. 이 중 일주의 천간인 일간(日干)이
        &lsquo;나 자신&rsquo;을 뜻하는 사주의 주인공이며, 나머지 일곱 글자는 모두 이 일간과의 관계로 읽습니다.
      </figcaption>
    </figure>
  );
}
