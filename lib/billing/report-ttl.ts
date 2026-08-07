/** 프리미엄 리포트 캐시 보관 기간. 이 기간이 지나면 배치가 실제로 삭제한다. */
export const REPORT_TTL_DAYS = 365;

/** 지금 생성하는 리포트의 만료 시각(ISO). 캐시 upsert/insert 시 expires_at에 넣는다. */
export function reportExpiresAtIso(): string {
  return new Date(Date.now() + REPORT_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Supabase 쿼리에 붙여 만료된 행을 조회 결과에서 제외하는 조건.
 * expires_at이 NULL인 행(이 정책 이전에 생성됐거나 무기한으로 남긴 행)은 계속 유효하다.
 * 사용법: query.or(notExpiredFilter())
 */
export function notExpiredFilter(): string {
  return `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`;
}
