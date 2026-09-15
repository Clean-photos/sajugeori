/**
 * lib/llm-json-sanitize.ts — LLM이 낸 JSON 텍스트를 JSON.parse에 넘기기 전에
 * 손보는 공용 유틸.
 *
 * §확인(2026-09-13 실물 확인): 프롬프트마다 "문단 사이는 JSON 문자열 안에
 * \\n\\n으로 넣으라"고 지시하는데도, 모델이 가끔 그 대신 진짜 개행 문자를
 * 문자열 값 안에 그대로 찍는다(JSON 표준 위반 — JSON 문자열 리터럴 안의 제어
 * 문자는 반드시 \n으로 이스케이프돼야 한다). 그 결과 JSON.parse가
 * "Bad control character in string literal"로 실패하고, 이 상품들의 재시도
 * 로직이 있는 곳은 재시도만 반복하고 없는 곳은 그대로 실패로 끝난다(실측:
 * 운명 설계도 축 질문 생성에서 재현). 문자열 리터럴 "안"에서만 개행·탭·캐리지
 * 리턴을 이스케이프해 되돌린다 — 문자열 "밖"(객체·배열 사이 공백)의 개행은
 * JSON 문법상 원래 무해하므로 건드리지 않는다.
 */
export function sanitizeJsonString(raw: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of raw) {
    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      out += ch;
      escaped = true;
    } else if (ch === '"') {
      out += ch;
      inString = false;
    } else if (ch === "\n") {
      out += "\\n";
    } else if (ch === "\r") {
      out += "\\r";
    } else if (ch === "\t") {
      out += "\\t";
    } else {
      out += ch;
    }
  }
  // §확인(2026-09-13 실물 확인, 운명 설계도 샘플 재생성 중 5회 연속 재현):
  // 문자열 값을 길게 쓸수록 모델이 가끔 닫는 따옴표 바로 뒤에 세미콜론을
  // 하나 더 찍는다(마치 JS 문장인 것처럼 — 예: `"...구조입니다.";,`). 항상
  // 같은 위치(닫는 따옴표 직후, 다음 구조 문자 , 또는 } 앞)에서만 나타나므로
  // 문자열 내부(위 루프가 이미 처리)와 겹치지 않게 여기서 안전하게 제거한다.
  return out.replace(/"(\s*);(\s*)(?=[,}])/g, '"$1$2');
}

/** 위 sanitizeJsonString을 거쳐 JSON.parse까지 한 번에 한다. */
export function parseJsonLoose<T>(raw: string): T {
  return JSON.parse(sanitizeJsonString(raw)) as T;
}
