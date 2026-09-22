/**
 * kr-josa.ts — 임의의 완성형 한글 단어 뒤에 붙는 조사(을/를·이/가·은/는) 판별.
 *
 * lib/wuxing/josa.ts는 오행 5글자 전용 표(범용 아님)라 여기서는 별도로 유니코드
 * 조합형 계산(마지막 글자 종성 유무)을 쓴다. 카드류(살풀이·택일·연운세)가 살 이름·
 * 요약 문구 등 임의의 한글 단어에 조사를 붙여야 해서 공용으로 뺐다.
 */
function hasBatchim(text: string): boolean {
  const ch = text.charCodeAt(text.length - 1) - 0xac00;
  if (ch < 0 || ch > 11171) return false; // 완성형 한글 범위 밖(숫자·영문 등)이면 받침 없다고 취급
  return ch % 28 !== 0;
}

export const josaEulReul = (text: string) => (hasBatchim(text) ? "을" : "를");
export const josaIga = (text: string) => (hasBatchim(text) ? "이" : "가");
export const josaEunNeun = (text: string) => (hasBatchim(text) ? "은" : "는");
