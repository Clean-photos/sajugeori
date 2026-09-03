"use client";

/**
 * 유료 리포트 폼들이 공유하는 에러 표시 규약.
 *
 * 예전에는 profile_required만 골라 문구를 바꾸고 나머지는 전부
 * "분석에 실패했습니다"로 뭉갰다. 그 과정에서 실제로는 결제가 필요하다는
 * premium_required가 "분석 실패"로 보여 구매 의사가 있는 사용자를 쫓아냈고,
 * 가장 심한 경우(app/premium/PremiumReport.tsx)에는 서버가 보낸 원본 에러
 * 코드 문자열 "premium_required"가 사람이 읽는 문장인 줄 알고 화면에
 * 그대로 노출됐다.
 *
 * 이 코드베이스의 API는 실제 예외를 절대 그대로 돌려주지 않는다 — 전부
 * console.error로 서버 로그에만 남기고, 클라이언트에는 미리 정해 둔 한국어
 * 문장만 보낸다(예: "이미 생성 중입니다...", "사주 계산 오류"). 그래서
 * error 필드는 이미 "코드"인 게 확실한 몇 가지(premium_required 등)만
 * 문구·행동 버튼으로 바꿔 주고, 그 외에는 서버 문장을 그대로 신뢰해 보여준다
 * — 스택트레이스나 DB 오류 원문을 노출할 위험 없이, 뭉개지 않을 수 있다.
 */
export interface PremiumErrorInfo {
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

export function premiumErrorInfo(data: unknown, fallback: string): PremiumErrorInfo {
  const obj = (data ?? {}) as { error?: unknown; redirect?: unknown };
  const err = obj.error;
  const href = typeof obj.redirect === "string" ? obj.redirect : undefined;

  if (err === "premium_required") {
    return {
      message: "이 리포트는 990원 결제 후 보실 수 있어요.",
      actionLabel: "결제하러 가기",
      actionHref: href ?? "/premium/menu",
    };
  }
  if (err === "profile_required") {
    return {
      message: "먼저 사주를 등록해 주세요.",
      actionLabel: "사주 등록하러 가기",
      actionHref: href ?? "/onboarding",
    };
  }
  if (err === "login_required") {
    return {
      message: "로그인이 필요합니다.",
      actionLabel: "로그인하러 가기",
      actionHref: href ?? "/login",
    };
  }
  if (typeof err === "string" && err.length > 0) {
    // 서버가 이미 사람이 읽을 문장으로 다듬어 보낸 경우(예: "이미 생성 중입니다.
    // 잠시 후 다시 시도해주세요.") — 그대로 신뢰해서 보여준다.
    return { message: err };
  }
  return { message: fallback };
}
