// §⑤ 넘치는 기운 다루기 — 과다 오행이 있을 때만 렌더된다(없으면 부모가 아예 안 그린다).
// 설기(洩氣) 원리: 과다한 기운은 억누르지 말고 흘려보낼 통로를 만든다.
import type { DrainSectionData } from "@/lib/wuxing/report";
import { josaIga } from "@/lib/wuxing/josa";

export function DrainSection({ drain }: { drain: DrainSectionData }) {
  if (drain.groups.length === 0 && !drain.companion) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-serif text-lg font-bold text-[#1F3D34]">넘치는 기운 다루기</h2>

      {drain.groups.map((g) => (
        <div key={g.element} className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
          <p className="text-[12.5px] font-bold text-[#1F3D34] mb-1">
            {g.elementKr}({g.element}){josaIga(g.element)} 과다합니다 — {g.targetKr}({g.target}) 방향으로 흘려보냅니다
          </p>
          <p className="text-[11.5px] text-[#6B6661] leading-relaxed mb-2">{g.principle}</p>
          <ul className="flex flex-col gap-1.5">
            {g.items.map((it, i) => (
              <li key={i} className="text-[12px] text-[#1A1A18] leading-relaxed">
                <span className="font-semibold">{it.item}</span>
                <span className="text-[#6B6661]"> — {it.basis}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {drain.companion && (
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
          <p className="text-[12.5px] font-bold text-[#1F3D34] mb-1">
            수(水) 부족에 화(火) 과다가 함께 있습니다
          </p>
          <p className="text-[11.5px] text-[#6B6661] leading-relaxed mb-2">
            채우는 것만으로는 부족한 경우입니다. 화를 함께 식혀야 합니다.
          </p>
          <ul className="flex flex-col gap-1.5">
            {drain.companion.items.map((it, i) => (
              <li key={i} className="text-[12px] text-[#1A1A18] leading-relaxed">
                <span className="font-semibold">{it.item}</span>
                <span className="text-[#6B6661]"> — {it.basis}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
