// §2 오행 지도 — 네 조각(원형도·분포 막대·불균형 진단표·용신 카드)을 한 섹션으로 묶는다.
// 기획서가 "도표 중심, 0.7장"으로 규정한 섹션이다.
import type { WuxingMapData } from "@/lib/wuxing/map-section";
import { OhaengCircleDiagram } from "./OhaengCircleDiagram";
import { ElementBars } from "./ElementBars";
import { ImbalanceTable } from "./ImbalanceTable";
import { YongsinCard } from "./YongsinCard";

export function WuxingMapSection({ data }: { data: WuxingMapData }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-serif text-lg font-bold text-[#1F3D34]">오행 지도</h2>

      {/* 결정 ④ — "부족하다고 다 채우는 것이 아니라…" 도입 서술. 문구 승인 전이라
          슬롯만 잡아두고 렌더하지 않는다. PENDING_COPY.mapIntro가 채워지면 노출된다. */}
      {data.intro && <p className="text-sm text-[#1A1A18] leading-relaxed">{data.intro}</p>}

      <ElementBars bars={data.bars} charCount={data.count.charCount} />
      <ImbalanceTable rows={data.imbalance} hourUnknown={data.hourUnknown} />
      <OhaengCircleDiagram surface={data.count.surface} />
      <YongsinCard data={data.yongsin} />
    </section>
  );
}
