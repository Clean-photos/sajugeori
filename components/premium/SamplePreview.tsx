import type { SampleReport } from "@/lib/sample-reports";

/**
 * 게이트(비로그인·미결제) 화면에 보여주는 샘플 리포트 발췌.
 * "샘플 결과입니다" 워터마크를 여러 번 넣어, 방문자가 이걸 자기 사주 결과로
 * 착각하지 않도록 한다. 실제 결제 시에는 본인 사주로 새로 계산됨을 끝에 명시.
 */
export function SamplePreview({ sample }: { sample: SampleReport }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-[#C8743A]/40 bg-[#FBF8F2] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C8743A]/15 text-[#8A5228] tracking-wide">
          샘플 결과입니다
        </span>
        <span className="text-[10px] text-[#6B6661]">{sample.input}</span>
      </div>
      <p className="text-sm text-[#1A1A18]/80 leading-relaxed">{sample.excerpt}</p>
      <p className="text-center text-[10px] font-medium text-[#C8743A]/70 tracking-wide mt-3 pt-2 border-t border-dashed border-[#C8743A]/30">
        — 샘플 결과입니다 · 실제 결과는 회원님의 사주로 다시 계산됩니다 —
      </p>
    </div>
  );
}
