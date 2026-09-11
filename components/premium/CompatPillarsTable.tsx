// §7-3(CoS 실물 재검증, 2026-09-10): 궁합만 두 사람의 명식이 화면에 없어
// 사용자가 판정 근거를 검증할 방법이 없었다. 다른 상품(프리미엄 사주·운명
// 설계도 등)과 같은 4주 표를 두 사람분 나란히 보여준다.
import type { CompatPillarSummary } from "@/lib/premium/compat-pillars";

function Column({ p }: { p: CompatPillarSummary }) {
  const rows: { label: string; cell: { stem: string; branch: string } | null }[] = [
    { label: "시", cell: p.hour },
    { label: "일", cell: p.day },
    { label: "월", cell: p.month },
    { label: "년", cell: p.year },
  ];
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[12.5px] font-semibold text-[#1F3D34] mb-1.5 truncate">{p.label}</p>
      <div className="flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-1.5 bg-white border border-[#E5DFD4] rounded-lg px-2 py-1.5">
            <span className="text-[10px] text-[#9B968F] w-3 flex-shrink-0">{r.label}</span>
            {r.cell ? (
              <span className="text-[11px] text-[#1A1A18] truncate">{r.cell.stem} {r.cell.branch}</span>
            ) : (
              <span className="text-[11px] text-[#9B968F]">시각 모름</span>
            )}
          </div>
        ))}
      </div>
      <p className="text-[10.5px] text-[#6B6661] mt-1.5">일간 {p.dayMaster}</p>
    </div>
  );
}

export function CompatPillarsTable({ a, b }: { a: CompatPillarSummary; b: CompatPillarSummary }) {
  return (
    <div className="print-card bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
      <p className="font-serif text-[15px] font-bold text-[#1F3D34] mb-3">두 사람의 명식</p>
      <div className="flex gap-3">
        <Column p={a} />
        <div className="w-px bg-[#E5DFD4]" aria-hidden />
        <Column p={b} />
      </div>
      {(!a.hasHour || !b.hasHour) && (
        <p className="text-[10.5px] text-[#9B968F] mt-3 leading-relaxed">
          태어난 시각을 모르는 쪽은 시주를 뺀 3주로 계산됩니다 — 궁합 판정도 그 범위 안에서 이뤄집니다.
        </p>
      )}
    </div>
  );
}
