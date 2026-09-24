"use client";

import { parseStreamError } from "@/lib/report-stream-error";

/**
 * 무료 4종이 공유하는 리포트 요청 래퍼.
 *
 * 예전에는 res.ok를 아예 확인하지 않고 응답 본문을 그대로 결과 카드에 렌더했다.
 * 광고 토큰이 만료됐거나(403) 사주 계산이 실패하면(500) 서버는 JSON 에러를
 * 돌려주는데, 그 JSON 문자열이 "사주 풀이"인 것처럼 화면에 그대로 나갔다 —
 * 광고까지 본 사용자가 에러 응답을 자기 사주로 믿게 되는 상태였다.
 *
 * 여기서 res.ok와 스트림 안에 실린 실패 표시(STREAM_ERROR_PREFIX)를 모두 걸러내고,
 * 실패 원인에 맞는 한국어 메시지를 반환한다. 스택트레이스·DB 오류 같은 내부
 * 사유는 그대로 노출하지 않되, 사용자가 다르게 행동해야 하는 사유(광고 토큰
 * 문제 vs 입력값 문제)는 구분해서 전달한다.
 */
export type FreeReportResult = { ok: true; text: string; card?: unknown } | { ok: false; message: string };

function messageFor(status: number, code: string | undefined): string {
  if (code && /ad token/i.test(code)) {
    return status === 403
      ? "광고 시청 확인에 실패했어요 — 이미 사용했거나 시간이 지난 것 같아요. 광고를 다시 시청한 뒤 시도해 주세요."
      : "광고 시청 정보를 확인하지 못했어요. 처음부터 다시 진행해 주세요.";
  }
  if (code === "사주 계산 오류") {
    return "입력하신 생년월일을 계산하지 못했어요. 날짜를 다시 확인해 주세요.";
  }
  // 그 외(LLM 호출 실패 등)는 사용자가 달리 할 수 있는 게 없으므로 재시도를 안내한다.
  return "일시적인 오류로 결과를 만들지 못했어요. 잠시 후 다시 시도해 주세요.";
}

export async function fetchFreeReport(url: string, body: unknown): Promise<FreeReportResult> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, message: "네트워크 연결을 확인한 뒤 다시 시도해 주세요." };
  }

  if (!res.ok) {
    let code: string | undefined;
    try {
      const data = await res.json();
      code = typeof data?.error === "string" ? data.error : undefined;
    } catch {
      // 본문이 JSON이 아니면 코드 없이 일반 메시지로 처리한다.
    }
    return { ok: false, message: messageFor(res.status, code) };
  }

  const text = await res.text();
  const streamError = parseStreamError(text);
  if (streamError) return { ok: false, message: streamError };

  // §B-6(CoS 실물 확인, 2026-09-23): 무료 사주만 명식·오행·신살 카드 데이터를
  // X-Saju-Card 헤더(base64 JSON)로 함께 보낸다 — 본문 스트림 프로토콜은 그대로 둔다.
  // 다른 무료 상품(궁합·택일·연운세)은 이 헤더가 없으니 card는 그냥 undefined다.
  let card: unknown;
  const raw = res.headers.get("X-Saju-Card");
  if (raw) {
    try {
      // atob는 바이트 하나당 문자 하나로만 풀어 준다 — 서버가 UTF-8로 인코딩한
      // 한글 JSON을 그대로 파싱하려면 바이트 배열로 바꾼 뒤 TextDecoder를 거쳐야 한다.
      const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
      card = JSON.parse(new TextDecoder("utf-8").decode(bytes));
    } catch { /* 카드 없이 본문만 보여줘도 무방 */ }
  }

  return { ok: true, text, card };
}
