// 오행 보완 리포트 전체 조립 — §① 한 줄 진단 → §② 오행 지도 → §③ 채우는 법 →
// §④ 사람 축 → §⑤ 넘치는 기운(있을 때만) → §⑥ 3년 처방 → §⑦ 마무리.
//
// LLM이 쓰는 두 조각(§① 보충 문장·§⑥ 흐름 문단)이 아직 없어도 렌더된다 — 각 하위
// 컴포넌트가 "준비하고 있습니다" 폴백을 자체적으로 처리한다(지어낸 문구 금지 원칙).
import type { WuxingReportData } from "@/lib/wuxing/report";
import { DiagnosisHeader } from "./DiagnosisHeader";
import { WuxingMapSection } from "./WuxingMapSection";
import { FillSection } from "./FillSection";
import { PeopleSection } from "./PeopleSection";
import { DrainSection } from "./DrainSection";
import { SeunSection } from "./SeunSection";
import { ClosingSection } from "./ClosingSection";

export function WuxingReport({ data }: { data: WuxingReportData }) {
  return (
    <article className="flex flex-col gap-8 px-5 py-6">
      <DiagnosisHeader diagnosis={data.diagnosis} narrative={data.narratives.diagnosis} />

      {/* 결정 ④ — §② 도입 서술("부족하다고 다 채우는 것이 아니라…"). 승인 전이라 null이면
          렌더되지 않는다. WuxingMapSection 내부에서 data.map.intro를 이미 이 방식으로 처리한다 */}
      <WuxingMapSection data={data.map} />

      <FillSection fill={data.fill} />
      <PeopleSection people={data.people} />
      <DrainSection drain={data.drain} />
      <SeunSection seun={data.seun} narrative={data.narratives.seunFlow} />
      <ClosingSection closing={data.closing} />
    </article>
  );
}
