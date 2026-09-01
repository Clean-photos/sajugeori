/**
 * banner.ts — `/guide/fill-*` 하단 배너 문구 (§10-5, docs/wuxing_seun_diagnosis_banner_v1.md §3).
 *
 * §3-1 확정안 그대로다. 오행명만 치환되고 나머지는 5편 공통이다. "이 글은 부실합니다"가
 * 아니라 "이 글은 일반론이고, 당신 이야기는 따로 있습니다"로 간격을 짚는 것이 설계
 * 의도(§3-2)라, 문구를 오행별로 새로 짓지 않고 템플릿 하나를 고정해 치환한다 —
 * 문구가 오행마다 달라지면 그 간격이 "같은 구조인데 왜 표현이 다른가"로 흐려진다.
 */
import * as C from "@/lib/saju-engine/constants";
import type { Element } from "@/lib/saju-engine/constants";
import { josaIga, josaEulReul } from "./josa";

export interface WuxingBannerCopy {
  /** "이 글은 수(水)를 채우는 일반적인 방법입니다" */
  title: string;
  /** "당신에게 정말 수(水)가 부족한지, ... 생년월일이 있어야 알 수 있습니다." */
  body: string;
  cta: string;
  /** 버튼 아래 작은 글씨 — §3-3, 5편 공통 고정 */
  subCta: string;
  /** 리포트 라우트. §10-9(결제 연결)로 /premium/ohang이 실제 페이지로 존재한다 */
  href: string;
}

const CTA_LABEL = "내 사주로 확인하기 · 990원";
const SUB_CTA = "부족 여부 판정 · 3년 세운 처방 · 어떤 사람이 맞는지까지";
const WUXING_ROUTE = "/premium/ohang";

export function wuxingBannerCopy(el: Element): WuxingBannerCopy {
  const label = `${C.ELEMENT_KR[el]}(${el})`;
  return {
    title: `이 글은 ${label}${josaEulReul(el)} 채우는 일반적인 방법입니다`,
    body: `당신에게 정말 ${label}${josaIga(el)} 부족한지, 부족하다면 올해 무엇부터 해야 하는지는 생년월일이 있어야 알 수 있습니다.`,
    cta: CTA_LABEL,
    subCta: SUB_CTA,
    href: WUXING_ROUTE,
  };
}

/** `/guide/fill-*` slug → 그 글이 다루는 오행. 배너 삽입 시 이 매핑으로 오행을 정한다 */
export const FILL_ARTICLE_ELEMENT: Record<string, Element> = {
  "fill-water": "水",
  "fill-fire": "火",
  "fill-wood": "木",
  "fill-metal": "金",
  "fill-earth": "土",
};
