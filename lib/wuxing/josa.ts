/**
 * josa.ts — 오행 5개 전용 조사 헬퍼.
 *
 * 목(木)·금(金)은 받침이 있어 "목가", "금와" 같은 비문이 나기 쉽다(diagnosis.ts에서
 * 실측으로 발견). 오행이 5개로 고정돼 있으니 범용 한글 받침 판별기 대신 표로 처리한다.
 * diagnosis.ts·relation.ts 양쪽에서 같은 표를 쓰도록 여기 하나로 모았다.
 */
import type { Element } from "@/lib/saju-engine/constants";

const HAS_BATCHIM: Record<Element, boolean> = { 木: true, 火: false, 土: false, 金: true, 水: false };

export const josaIga = (el: Element) => (HAS_BATCHIM[el] ? "이" : "가");
export const josaWaGwa = (el: Element) => (HAS_BATCHIM[el] ? "과" : "와");
export const josaEunNeun = (el: Element) => (HAS_BATCHIM[el] ? "은" : "는");
export const josaEulReul = (el: Element) => (HAS_BATCHIM[el] ? "을" : "를");
export const josaRoEuro = (el: Element) => (HAS_BATCHIM[el] ? "으로" : "로");
