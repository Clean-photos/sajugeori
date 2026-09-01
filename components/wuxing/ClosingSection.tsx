// §⑦ 마무리 — 읽는 법, 강도 표기 기준, 개운법 위상 고지(D44 원칙 승계), 용어 백과 링크.
import Link from "next/link";
import type { ClosingSectionData } from "@/lib/wuxing/report";

export function ClosingSection({ closing }: { closing: ClosingSectionData }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
        <p className="text-[12px] font-bold text-[#1F3D34] mb-2">이 리포트를 읽는 법</p>
        <div className="flex flex-col gap-1">
          {(Object.keys(closing.strengthLegend) as Array<keyof typeof closing.strengthLegend>).map((k) => (
            <p key={k} className="text-[11.5px] text-[#6B6661] leading-relaxed">
              <b className="text-[#1A1A18]">{k}</b> — {closing.strengthLegend[k]}
            </p>
          ))}
        </div>
      </div>

      <div className="bg-[#C8743A]/8 border border-[#C8743A]/25 rounded-2xl p-4 text-[11.5px] text-[#6B6661] leading-relaxed">
        {closing.disclaimer}
      </div>

      <div className="flex gap-3 justify-center text-[11px]">
        <Link href={closing.dictionaryHref} className="text-[#1F3D34] underline">
          용어 백과
        </Link>
        <Link href={closing.guideHref} className="text-[#1F3D34] underline">
          읽을거리
        </Link>
      </div>
    </section>
  );
}
