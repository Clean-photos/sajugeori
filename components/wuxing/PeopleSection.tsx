// §④ 사람 축 — B층 §3, 5블록. "찾아야 할 조건을 미리 준다"는 이 상품의 차별점.
// 인성·관성·비겁 관계면 emphasized=true — 원문에서 사람이 1순위 실행 축이라 더 크게 배치한다.
import type { PeopleSectionData } from "@/lib/wuxing/report";

export function PeopleSection({ people }: { people: PeopleSectionData }) {
  return (
    <section className={`flex flex-col gap-3 ${people.emphasized ? "" : ""}`}>
      <h2 className="font-serif text-lg font-bold text-[#1F3D34]">어떤 사람을 가까이할지</h2>
      <p className="text-[12.5px] text-[#6B6661] leading-relaxed">{people.intro}</p>

      {/* ① 1순위 — 일간 조건 */}
      {people.partner && (
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
          <p className="text-[12px] font-bold text-[#1F3D34] mb-1">① 상대의 일간 조건</p>
          <p className="text-[11.5px] text-[#6B6661] mb-2">{people.byDayStemNote}</p>
          <p className="text-[13px] text-[#1A1A18] leading-relaxed">
            상대가 <b>{people.partner.targetKr}({people.partner.target})</b> 일간이면{" "}
            {people.partner.effect}. <span className="text-[#41614B]">{people.partner.fitFor}</span>
          </p>
        </div>
      )}

      {/* ② 2순위 — 전체 분포 */}
      <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
        <p className="text-[12px] font-bold text-[#1F3D34] mb-1">② 상대 사주의 전체 분포</p>
        <p className="text-[11.5px] text-[#6B6661] mb-2">{people.distribution.note}</p>
        <ul className="flex flex-col gap-1">
          {people.distribution.rules.map((r, i) => (
            <li key={i} className="text-[12.5px] text-[#1A1A18] flex gap-1.5">
              <span className="text-[#6B6661]">·</span>
              {r.condition} — <b>{r.verdict}</b>
            </li>
          ))}
        </ul>
      </div>

      {/* ③ 피해야 할 조건 — mustInclude(절연 아님 고지)가 항상 함께 나간다 */}
      <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
        <p className="text-[12px] font-bold text-[#1F3D34] mb-1">③ 피해야 할 조건</p>
        <ul className="flex flex-col gap-1 mb-2">
          {people.avoid.conditions.map((c, i) => (
            <li key={i} className="text-[12.5px] text-[#1A1A18] flex gap-1.5">
              <span className="text-[#6B6661]">·</span>
              {c}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-[#8A5228] leading-relaxed bg-[#FDF0E3] border border-[#E9D9C4] rounded-xl px-3 py-2">
          {people.avoid.mustInclude}
        </p>
      </div>

      {/* ④ 관계 유형별 적용 */}
      <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
        <p className="text-[12px] font-bold text-[#1F3D34] mb-2">④ 관계 유형별 적용</p>
        <div className="flex flex-col divide-y divide-[#E5DFD4]">
          {people.byRelationType.map((r) => (
            <div key={r.type} className="py-2 first:pt-0 last:pb-0">
              <p className="text-[12px] font-semibold text-[#1A1A18]">{r.type}</p>
              <p className="text-[11.5px] text-[#6B6661] leading-relaxed">{r.criterion}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ⑤ 생년월일 없이 알아보는 법 — 실사용성이 가장 높은 블록(원문 강조) */}
      <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
        <p className="text-[12px] font-bold text-[#1F3D34] mb-1">⑤ 생년월일 없이 알아보는 법 ★</p>
        <p className="text-[11px] text-[#6B6661] mb-2">{people.observation.note}</p>
        <ul className="flex flex-col gap-1.5">
          {people.observation.rows.map((row) => (
            <li
              key={row.element}
              className={`text-[12px] leading-relaxed rounded-lg px-2.5 py-1.5 ${
                row.emphasized ? "bg-[#EDF1EC] font-semibold text-[#1A1A18]" : "text-[#6B6661]"
              }`}
            >
              <span className="font-serif font-bold mr-1">{row.element}</span>
              {row.elementKr} — {row.traits}
              {row.emphasized && <span className="ml-1 text-[10px] text-[#41614B]">(찾는 기운)</span>}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10.5px] text-[#6B6661] leading-relaxed">{people.observation.mustInclude}</p>
      </div>
    </section>
  );
}
