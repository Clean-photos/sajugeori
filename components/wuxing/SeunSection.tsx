// §⑥ 3년 세운 처방 — 기획서 "이 상품의 핵심 차별점". 연도별 표는 전부 고정 풀에서
// 나온 사실이고, 3년을 관통하는 흐름 한 문단(narratives.seunFlow)만 LLM이 쓴다.
import type { SeunPrescriptionPlan, YearPrescription } from "@/lib/wuxing/seun-prescription";
import type { WuxingNarratives } from "@/lib/wuxing/report";

const CASE_ACCENT: Record<string, string> = {
  A: "#41614B",
  B: "#8A5228",
  C: "#41614B",
  D: "#B3261E",
  E: "#6B6661",
};

function YearCard({ y }: { y: YearPrescription }) {
  return (
    <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
      <div className="flex items-baseline justify-between mb-1">
        <p className="font-serif text-[15px] font-bold text-[#1A1A18]">
          {y.year}년 {y.ganji}
        </p>
        <span
          className="text-[10.5px] font-semibold rounded-full px-2 py-[2px]"
          style={{ color: CASE_ACCENT[y.seunCase], backgroundColor: "#F6F1E7" }}
        >
          {y.caseLabel}
        </span>
      </div>
      <p className="text-[11.5px] text-[#6B6661] mb-2">{y.incomingLine}</p>
      <p className="text-[13px] text-[#1A1A18] leading-relaxed mb-2.5">{y.statusLine}</p>

      {y.priorityItems.length > 0 && (
        <div className="mb-2">
          <p className="text-[11px] font-semibold text-[#41614B] mb-1">우선 항목</p>
          <ul className="flex flex-col gap-0.5">
            {y.priorityItems.map((it, i) => (
              <li key={i} className="text-[12px] text-[#1A1A18]">
                · {it.item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {y.avoidItems.length > 0 && (
        <div className="mb-2">
          <p className="text-[11px] font-semibold text-[#B3261E] mb-1">피할 것</p>
          <ul className="flex flex-col gap-0.5">
            {y.avoidItems.map((it, i) => (
              <li key={i} className="text-[12px] text-[#1A1A18]">
                · {it.item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[12px] font-semibold text-[#1F3D34] pt-2 border-t border-[#E5DFD4]">{y.guidelineLine}</p>
    </div>
  );
}

export function SeunSection({ seun, narrative }: { seun: SeunPrescriptionPlan; narrative?: WuxingNarratives["seunFlow"] }) {
  const daewoonLine = seun.daewoonNote.transition ?? seun.daewoonNote.background;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-serif text-lg font-bold text-[#1F3D34]">3년 처방 ★</h2>
      {daewoonLine && <p className="text-[11.5px] text-[#6B6661]">{daewoonLine}</p>}

      <div className="flex flex-col gap-2.5">
        {seun.years.map((y) => (
          <YearCard key={y.year} y={y} />
        ))}
      </div>

      {narrative ? (
        <p className="text-sm text-[#1A1A18] leading-relaxed bg-[#EDF1EC] rounded-2xl px-4 py-3">{narrative}</p>
      ) : (
        <p className="text-xs text-[#6B6661]">3년을 관통하는 흐름을 준비하고 있습니다.</p>
      )}
    </section>
  );
}
