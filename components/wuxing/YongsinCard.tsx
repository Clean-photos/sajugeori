// 용신·희신·기신 카드 (§2-③ 오행 지도) — "채워야 할 것과 피해야 할 것".
//
// ⚠️ 단일 용신으로 단정하지 않는다(결정 ①). 억부·조후 두 트랙을 항상 병기하고,
// 둘이 갈릴 때는 그 사실 자체를 노출한다 — 엔진도 "최종 용신은 격국까지 종합해
// 판단해야 한다"고 명시하므로, 엔진이 주지 않는 정밀도를 만들어내지 않는다.
//
// 극단형이면 프레임이 "채우기"에서 "순응하기"로 뒤집힌다(§3-④ 왕신충발).
import type { YongsinCardData } from "@/lib/wuxing/map-section";
import { ELEMENT_COLOR } from "@/lib/wuxing/circle-diagram";
import { josaIga } from "@/lib/wuxing/josa";
import type { Element } from "@/lib/saju-engine/constants";

function Chip({ el, kr }: { el: Element; kr: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-lg px-2 py-[3px] bg-[#F6F1E7] border border-[#E5DFD4]">
      <span className="w-[7px] h-[7px] rounded-full self-center" style={{ backgroundColor: ELEMENT_COLOR[el] }} aria-hidden />
      <span className="font-serif text-[13px] font-bold text-[#1A1A18]">{el}</span>
      <span className="text-[11px] text-[#6B6661]">{kr}</span>
    </span>
  );
}

function Slot({
  title,
  hint,
  elements,
  elementsKr,
  empty,
}: {
  title: string;
  hint: string;
  elements: Element[];
  elementsKr: string[];
  empty: string;
}) {
  return (
    <div className="py-2.5">
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="text-[12px] font-bold text-[#1F3D34]">{title}</span>
        <span className="text-[11px] text-[#6B6661]">{hint}</span>
      </div>
      {elements.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {elements.map((el, i) => (
            <Chip key={el} el={el} kr={elementsKr[i]} />
          ))}
        </div>
      ) : (
        <p className="text-[11.5px] text-[#6B6661]">{empty}</p>
      )}
    </div>
  );
}

export function YongsinCard({ data }: { data: YongsinCardData }) {
  const isFollow = data.frame === "follow";

  return (
    <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-sm font-bold text-[#1F3D34]">채워야 할 것과 피해야 할 것</h3>
        <span className="text-[10.5px] text-[#6B6661]">근거 강도 B</span>
      </div>
      <p className="text-[11px] text-[#6B6661] mb-1">한난조습: {data.climate}</p>

      {/* 극단형 요약 라벨 — 상세 처방(§3-1·§3-2 승인 문구)은 §③ FillSection이 담당한다.
          여기서는 카드 맥락에 맞는 짧은 라벨만 둔다. */}
      {isFollow && (
        <p className="text-[11.5px] leading-relaxed text-[#8A5228] bg-[#FDF0E3] border border-[#E9D9C4] rounded-xl px-3 py-2 mb-1">
          한 기운으로 강하게 모인 구조라, 부족한 것을 채우기보다 <b>강한 흐름을 따라가는 방향</b>으로 제시합니다.
        </p>
      )}

      <div className="flex flex-col divide-y divide-[#E5DFD4]">
        {/* ⚠️ 이 슬롯은 "용신"이 아니라 **표면 계수가 가장 부족한 오행**이다.
            명리 용신(억부·조후 종합)은 아래 트랙 블록에 따로 표기한다 — 실측상 24.1%의
            사주에서 둘이 갈리므로, 여기에 "용신"이라고 쓰면 근거와 어긋난 라벨이 된다. */}
        <Slot
          title={isFollow ? "따라야 할 기운" : "먼저 채울 기운"}
          hint={isFollow ? "이 사주의 중심" : "표면에 가장 부족한 오행"}
          elements={data.main ? [data.main] : []}
          elementsKr={data.mainKr ? [data.mainKr] : []}
          empty="따로 채울 오행이 없습니다."
        />
        <Slot
          title="도움이 되는 기운"
          hint={isFollow ? "흘려보낼 통로" : "위를 생해 주는 오행"}
          elements={data.helper ? [data.helper] : []}
          elementsKr={data.helperKr ? [data.helperKr] : []}
          empty="해당 없음"
        />
        <Slot
          title="피해야 할 기운"
          hint="더 키우지 않을 오행"
          elements={data.avoid}
          elementsKr={data.avoidKr}
          empty="특별히 피할 오행은 없습니다."
        />
      </div>

      {/* 억부·조후 병기 — 단일 용신 단정 금지(결정 ①) */}
      <div className="mt-3 pt-3 border-t border-[#E5DFD4]">
        <p className="text-[11.5px] font-semibold text-[#1F3D34] mb-1.5">명리 용신 판정</p>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[11.5px]">
          <span className="text-[#6B6661]">
            억부: <b className="text-[#1A1A18]">{data.eokbuKr.length > 0 ? data.eokbuKr.join("·") : "해당 없음"}</b>
          </span>
          <span className="text-[#6B6661]">
            조후: <b className="text-[#1A1A18]">{data.johuKr.length > 0 ? data.johuKr.join("·") : "해당 없음"}</b>
          </span>
          <span className="text-[#6B6661]">
            종합: <b className="text-[#1A1A18]">{data.yongsinByTrackKr.length > 0 ? data.yongsinByTrackKr.join("·") : "해당 없음"}</b>
          </span>
        </div>

        {/* 두 판정이 갈리는 사주(실측 24.1%)에서는 그 사실을 감추지 않는다.
            어느 쪽을 최종 처방 축으로 삼을지는 미확정이라, 지금은 둘 다 보여 준다. */}
        {data.divergesFromPrimary && data.main && data.mainKr && (
          <p className="mt-2 text-[11.5px] leading-relaxed text-[#6B6661]">
            표면 계수로는 <b className="text-[#1A1A18]">{data.mainKr}</b>
            {josaIga(data.main)} 가장 비어 있고, 억부·조후로는{" "}
            <b className="text-[#1A1A18]">{data.yongsinByTrackKr.join("·")}</b>
            {josaIga(data.yongsinByTrack[data.yongsinByTrack.length - 1])} 필요한 기운으로 나옵니다. 두 관점이 서로 다른 곳을 가리키는 사주입니다.
          </p>
        )}

        {/* 결정 ①: 교집합이 없으면 조후를 주 처방, 억부를 보조로 병기한다(승인 문구,
            docs/wuxing_pending_copy_v1.md §2). §2-2 표 형태 병기도 함께 붙인다. */}
        {data.trackRelation === "conflict" && data.conflictNote && (
          <div className="mt-2">
            <p className="text-[11.5px] leading-relaxed text-[#6B6661]">{data.conflictNote}</p>
            {data.johuKr.length > 0 && (
              <div className="mt-1.5 flex flex-col gap-0.5 text-[11px]">
                <span className="text-[#41614B]">
                  주 처방 · 조후 — <b>{data.johuKr.join("·")}</b>
                </span>
                <span className="text-[#6B6661]">
                  보조 참고 · 억부 — <b>{data.eokbuKr.join("·")}</b>
                </span>
              </div>
            )}
          </div>
        )}

        <p className="mt-2 text-[10.5px] leading-relaxed text-[#6B6661]">{data.disclaimer}</p>
      </div>
    </div>
  );
}
