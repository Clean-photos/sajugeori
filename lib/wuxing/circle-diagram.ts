/**
 * circle-diagram.ts — 오행 상생상극 원형도 순수 로직 (§2 오행 지도, "상품의 얼굴").
 *
 * 기존 사이트에 이미 이 개념의 정적 버전이 있다(`components/diagrams/OhaengCycle.tsx`,
 * `/guide/ohaeng-mechanism`). 이 모듈은 그 위에 **개인화**를 얹은 버전의 순수 로직이다 —
 * "내 사주에서 강한 축은 굵게, 끊긴 흐름은 점선"(기획서 §2-②)을 실제 표면 계수로
 * 구현한다. 기하(좌표)와 스타일 결정을 여기 pure function으로 두고, JSX는
 * components/wuxing/OhaengCircleDiagram.tsx가 담당한다 — DOM 없이 테스트하기 위함.
 *
 * ⚠️ 색상 팔레트는 기존 OhaengCycle.tsx와 다르다. 그쪽 팔레트(목#4F7A5C·화#C0392B·
 * 토#C8743A·금#8A8A88·수#1F3D34)를 dataviz 스킬 검증기로 돌려보면 하드 FAIL이 여럿
 * 나온다 — 목과 수가 둘 다 초록 계열이라 구분이 안 되고(normal-vision floor 미달),
 * 금(#8A8A88)은 채도가 0에 가까워 categorical 색으로 기능하지 못하며(chroma floor
 * 미달), 수(#1F3D34)는 명도가 밴드 밖이다. 이 신규 컴포넌트는 스킬의 검증된 기본
 * 팔레트(references/palette.md)에서 5개 슬롯(초록·빨강·노랑·보라·파랑)을 그대로 가져와
 * 전부 통과시켰다(all-pairs 검증 — 원 위의 어느 두 노드든 인접할 수 있는 배치라
 * 일반 adjacent 검사가 아니라 all-pairs로 확인). 기존 컴포넌트에 역이식할지는 별건.
 */
import * as C from "@/lib/saju-engine/constants";
import type { Element } from "@/lib/saju-engine/constants";
import { THRESHOLD } from "./classify";

/** 상생 순서 고정 (목→화→토→금→수→목). 원 배치·기존 OhaengCycle.tsx와 동일 순서 */
export const CIRCLE_ORDER: Element[] = ["木", "火", "土", "金", "水"];

/**
 * dataviz 스킬 검증기 통과 팔레트(references/palette.md 카테고리컬 슬롯 6·8·4·7·1,
 * light 모드, all-pairs). 문자 그대로의 오방색(목=청·화=적·토=황·금=백·수=흑)을 쓰지
 * 않는다 — 그 5색은 "흰색·회색 계열은 채도가 0에 가까워 categorical 식별색으로
 * 못 쓴다"는 이 스킬의 근본 제약과 정면으로 부딪힌다. 이 원형도는 라벨(한자+한글)이
 * 이미 1차 식별 수단이라, 색은 보조 강조일 뿐이다.
 */
export const ELEMENT_COLOR: Record<Element, string> = {
  木: "#008300",
  火: "#e34948",
  土: "#eda100",
  金: "#4a3aa7",
  水: "#2a78d6",
};

export interface Point {
  x: number;
  y: number;
}

export interface CircleLayout {
  cx: number;
  cy: number;
  radius: number;
  nodeRadius: number;
  positions: Record<Element, Point>;
}

/** 5개 노드를 정오각형으로 배치. 12시 방향에서 시작해 시계 방향 */
export function buildCircleLayout(cx = 160, cy = 152, radius = 108, nodeRadius = 27): CircleLayout {
  const positions = {} as Record<Element, Point>;
  CIRCLE_ORDER.forEach((el, i) => {
    const angle = (-90 + i * 72) * (Math.PI / 180);
    positions[el] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
  return { cx, cy, radius, nodeRadius, positions };
}

/** 두 노드를 잇는 선분을 원 바깥으로 물려 시작·끝점을 계산 (화살촉·라벨 겹침 방지) */
export function edgeEndpoints(layout: CircleLayout, from: Element, to: Element, startGap = 4, endGap = 12) {
  const a = layout.positions[from];
  const b = layout.positions[to];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: a.x + ux * (layout.nodeRadius + startGap),
    y1: a.y + uy * (layout.nodeRadius + startGap),
    x2: b.x - ux * (layout.nodeRadius + endGap),
    y2: b.y - uy * (layout.nodeRadius + endGap),
  };
}

export type EdgeTier = "absent" | "scarce" | "normal" | "excessive";

export interface EdgeStyle {
  tier: EdgeTier;
  /** true면 점선(끊긴 흐름) */
  dashed: boolean;
  strokeWidth: number;
  opacity: number;
}

/**
 * 상생·상극 화살표는 항상 "생하는 쪽/극하는 쪽"(source)의 표면 계수로 스타일을
 * 정한다 — 흐름은 원천에서 나오므로, 원천이 비어 있으면 그 흐름 자체가 끊긴 것이다.
 *   0개(부재)   → 점선, 가장 얇고 옅음 (흐름이 아예 없다)
 *   1개(부족)   → 점선, 중간 굵기 (흐름이 약하다)
 *   2~3개(적정) → 실선, 표준 굵기 ("강한 축" 이전의 정상 상태)
 *   4개+(과다)  → 실선, 가장 굵음 (기획서 "강한 축은 굵게"에 해당하는 지점)
 */
export function edgeStyleFor(sourceCount: number): EdgeStyle {
  if (sourceCount <= THRESHOLD.absent) return { tier: "absent", dashed: true, strokeWidth: 1, opacity: 0.35 };
  if (sourceCount <= THRESHOLD.scarce) return { tier: "scarce", dashed: true, strokeWidth: 1.4, opacity: 0.55 };
  if (sourceCount < THRESHOLD.excessive) return { tier: "normal", dashed: false, strokeWidth: 2.2, opacity: 1 };
  return { tier: "excessive", dashed: false, strokeWidth: 3.2, opacity: 1 };
}

export interface NodeStyle {
  tier: EdgeTier;
  dashed: boolean;
  strokeWidth: number;
}

/** 노드 자체의 링 스타일도 같은 4단계 어휘를 재사용해 흐름 스타일과 시각적으로 통일한다 */
export function nodeStyleFor(count: number): NodeStyle {
  if (count <= THRESHOLD.absent) return { tier: "absent", dashed: true, strokeWidth: 2 };
  if (count <= THRESHOLD.scarce) return { tier: "scarce", dashed: true, strokeWidth: 2.2 };
  if (count < THRESHOLD.excessive) return { tier: "normal", dashed: false, strokeWidth: 2.5 };
  return { tier: "excessive", dashed: false, strokeWidth: 4 };
}

export interface DiagramEdge {
  from: Element;
  to: Element;
  kind: "생" | "극";
  style: EdgeStyle;
}

/** 상생 5개(이웃) + 상극 5개(별 모양, 두 칸 건너뜀) 전부를 소스 계수 기반 스타일과 함께 낸다 */
export function buildEdges(surface: Record<Element, number>): DiagramEdge[] {
  const edges: DiagramEdge[] = [];
  CIRCLE_ORDER.forEach((el, i) => {
    const shengTarget = CIRCLE_ORDER[(i + 1) % 5];
    edges.push({ from: el, to: shengTarget, kind: "생", style: edgeStyleFor(surface[el]) });
    const keTarget = CIRCLE_ORDER[(i + 2) % 5];
    edges.push({ from: el, to: keTarget, kind: "극", style: edgeStyleFor(surface[el]) });
  });
  return edges;
}

/** 스크린리더용 대체 텍스트 — 이 사람 명식의 실제 부재/과다 오행을 요약한다(정적 캡션과 별개) */
export function buildAriaSummary(surface: Record<Element, number>): string {
  const absent = C.ELEMENTS.filter((el) => surface[el] <= THRESHOLD.absent).map((el) => C.ELEMENT_KR[el]);
  const excessive = C.ELEMENTS.filter((el) => surface[el] >= THRESHOLD.excessive).map((el) => C.ELEMENT_KR[el]);
  const parts = ["오행 상생상극 원형도. 목생화·화생토·토생금·금생수·수생목이 상생, 목극토·토극수·수극화·화극금·금극목이 상극입니다."];
  if (excessive.length > 0) parts.push(`${excessive.join("·")} 기운에서 나가는 화살표는 굵은 실선으로 강조돼 있습니다.`);
  if (absent.length > 0) parts.push(`${absent.join("·")} 기운에서 나가는 화살표는 점선으로 표시돼 흐름이 비어 있음을 나타냅니다.`);
  if (absent.length === 0 && excessive.length === 0) parts.push("모든 오행이 고르게 있어 화살표가 전부 실선입니다.");
  return parts.join(" ");
}
