/**
 * report-stream-error.ts — 스트리밍 응답 안에서 실패를 표시하는 공통 규약.
 *
 * 무료 4종 리포트는 LLM 호출을 text/plain 스트림으로 그대로 클라이언트에 흘려보낸다.
 * 스트림을 시작한 뒤에는(응답 헤더를 이미 200으로 보낸 뒤에는) HTTP 상태를 바꿀 수
 * 없으므로, LLM 호출이 중간에 실패하면 몸통에 평범한 한국어 문장만 흘려보내는
 * 수밖에 없었다. 그러면 클라이언트는 그 문장을 "사주 풀이"로 착각해 결과 카드에
 * 그대로 렌더한다 — 에러가 정상 결과로 위장되는 것이다.
 *
 * 이 접두어를 붙여 보내면, 클라이언트는 본문을 그대로 보여주는 대신 접두어를 뗀
 * 나머지를 에러 메시지로 다뤄 입력 화면으로 되돌릴 수 있다. 정상 리포트는 프롬프트
 * 규칙상 항상 【 섹션 제목 】으로 시작하므로 이 접두어와 충돌할 일이 없다.
 */
export const STREAM_ERROR_PREFIX = " FREE_REPORT_ERROR ";

export function wrapStreamError(message: string): string {
  return STREAM_ERROR_PREFIX + message;
}

/** 스트림 본문이 실패 표시인지 확인하고, 맞으면 사용자에게 보여줄 메시지를 뗀다. */
export function parseStreamError(text: string): string | null {
  if (!text.startsWith(STREAM_ERROR_PREFIX)) return null;
  return text.slice(STREAM_ERROR_PREFIX.length) || "일시적인 오류로 결과를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
