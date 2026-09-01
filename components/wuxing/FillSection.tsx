// §③ 채우는 법 — 본체. 기획서 "이 섹션이 상품의 90%다"의 압축판(§5, CEO 확정).
// A층은 1장 이내로 압축(축 3~4개 × 상위 3항목)하고, B층 관계 서술을 그대로 얹는다(A안).
//
// 극단형(frame==="follow")이면 §3(docs/wuxing_pending_copy_v1.md)이 본체 전체를
// 대체한다 — B층 5블록·A층 축 항목 대신 순응 방향 문구 + A층 §7 설기 항목만 보여준다.
import Link from "next/link";
import type { FillSectionData } from "@/lib/wuxing/report";
import { ELEMENT_COLOR } from "@/lib/wuxing/circle-diagram";
import { josaEulReul } from "@/lib/wuxing/josa";

const STRENGTH_STARS: Record<string, string> = { A: "★★★", B: "★★☆", C: "★☆☆" };

export function FillSection({ fill }: { fill: FillSectionData }) {
  if (!fill.target) {
    return (
      <section className="flex flex-col gap-2">
        <h2 className="font-serif text-lg font-bold text-[#1F3D34]">채우는 법</h2>
        <p className="text-sm text-[#1A1A18]">오행이 고르게 갖춰져 있어 특별히 채울 오행이 없습니다.</p>
      </section>
    );
  }

  const isFollow = fill.frame === "follow";
  const color = ELEMENT_COLOR[fill.target];

  if (isFollow) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-lg font-bold text-[#1F3D34]">따라가는 법</h2>

        {/* §3-1 도입(승인 완료) */}
        {fill.intro && <p className="text-sm text-[#1A1A18] leading-relaxed">{fill.intro}</p>}

        {/* §3-2 순응 방향 문구(오행별 5종, 승인 완료) */}
        {fill.extremeDirection && (
          <p className="text-[12.5px] leading-relaxed text-[#8A5228] bg-[#FDF0E3] border border-[#E9D9C4] rounded-xl px-3 py-2">
            {fill.extremeDirection}
          </p>
        )}

        {/* 우선 항목 — 신규 제작 없이 A층 사전 §7(과다 시 설기) 항목 그대로 */}
        {fill.drainItems.length > 0 && (
          <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
              <h3 className="text-[12.5px] font-bold text-[#1F3D34]">흘려보내는 법</h3>
            </div>
            <ul className="flex flex-col gap-2">
              {fill.drainItems.map((item, i) => (
                <li key={i} className="flex flex-col gap-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12.5px] font-semibold text-[#1A1A18]">{item.item}</span>
                    <span className="text-[10px] text-[#C8743A] flex-shrink-0">{STRENGTH_STARS[item.strength]}</span>
                  </div>
                  <p className="text-[11px] text-[#6B6661] leading-relaxed">{item.basis}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 극하는 오행(채우기 방향) 관련 항목은 명시적으로 제외한다(§3-B-④ 원칙) */}
        {fill.excluded.length > 0 && (
          <p className="text-[11.5px] text-[#8A5228] leading-relaxed">
            {fill.excludedKr.join("·")} 관련 항목은 이 사주에서는 권하지 않습니다.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-serif text-lg font-bold text-[#1F3D34]">채우는 법</h2>

      {/* B층 인트로 1문장 — 결정 A안: relation.json 그대로, 존댓말 전환 완료 */}
      {fill.intro && <p className="text-sm text-[#1A1A18] leading-relaxed">{fill.intro}</p>}

      {/* §4 primary↔용신 갈림 안내(승인 완료) — "채우는 법" 타이틀 직후 */}
      {fill.divergenceNote && (
        <p className="text-[12px] leading-relaxed text-[#6B6661] bg-[#EDF1EC] rounded-xl px-3 py-2">
          {fill.divergenceNote}
        </p>
      )}

      {/* B층 5블록 그대로 노출 */}
      {fill.relationBlock && (
        <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4 flex flex-col gap-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-bold text-[#1F3D34]">{fill.relationBlock.label}</span>
            <span className="text-[11px] text-[#6B6661]">{fill.relationBlock.keyword}</span>
          </div>
          <p className="text-[13px] text-[#1A1A18] leading-relaxed">{fill.relationBlock.deficiency}</p>
          <ul className="flex flex-col gap-1 pl-1">
            {fill.relationBlock.symptoms.map((s, i) => (
              <li key={i} className="text-[12.5px] text-[#1A1A18] leading-relaxed flex gap-1.5">
                <span className="text-[#6B6661]">·</span>
                {s}
              </li>
            ))}
          </ul>
          <div className="pt-1.5 border-t border-[#E5DFD4]">
            <p className="text-[12px] text-[#41614B] leading-relaxed">
              <b>채워졌을 때</b> — {fill.relationBlock.whenFilled}
            </p>
          </div>
          <p className="text-[11.5px] text-[#8A5228] leading-relaxed">
            <b>주의</b> — {fill.relationBlock.caution}
          </p>
        </div>
      )}

      {/* §9 일간 강약 연동 — 재성 부족 + 신약이면 재성보다 비겁·인성을 먼저 */}
      {fill.strengthAdjustment.needed && (
        <p className="text-[11.5px] leading-relaxed text-[#8A5228] bg-[#FDF0E3] border border-[#E9D9C4] rounded-xl px-3 py-2">
          {fill.strengthAdjustment.reason}
        </p>
      )}

      {/* A층 압축 — 관계별 우선 축 3~4개 × 상위 3항목 */}
      <div className="flex flex-col gap-2.5">
        {fill.axes.map((group) => (
          <div key={group.axis} className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
              <h3 className="text-[12.5px] font-bold text-[#1F3D34]">{group.axisLabel}</h3>
            </div>
            <ul className="flex flex-col gap-2">
              {group.items.map((item, i) => (
                <li key={i} className="flex flex-col gap-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12.5px] font-semibold text-[#1A1A18]">{item.item}</span>
                    <span className="text-[10px] text-[#C8743A] flex-shrink-0">{STRENGTH_STARS[item.strength]}</span>
                  </div>
                  <p className="text-[11px] text-[#6B6661] leading-relaxed">{item.basis}</p>
                  <p className="text-[11.5px] text-[#41614B]">→ {item.action}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {fill.supportElement && (
        <p className="text-[11.5px] text-[#6B6661] leading-relaxed">
          직접 채우기 어렵다면 {fill.supportElementKr}({fill.supportElement}){josaEulReul(fill.supportElement)} 함께 쓰면 효과가 안정적입니다 — {fill.supportNote}.
        </p>
      )}

      <div className="text-right">
        <Link href="/dictionary" className="text-[11px] text-[#6B6661] underline">
          용어가 낯설다면 용어 백과에서 확인하실 수 있습니다
        </Link>
      </div>
    </section>
  );
}
