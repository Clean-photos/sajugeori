/**
 * 카카오 애드핏 스크립트를 "이번 렌더 배치가 끝난 뒤 한 번만" 새로 붙인다.
 *
 * §5(CEO 결정 2026-09-02) — "홈/광고 화면 30초+ 프리즈" 진단 결과: 광고 단위
 * (.kakao_ad_area)가 여러 개인 화면(홈: 상단/중단/하단 3개)에서 각 배너
 * 컴포넌트가 마운트마다 독립적으로 script 태그를 붙이고 있었다. 같은
 * ba.min.js가 3번 따로 실행되며 각자 전체 DOM을 스캔하고 광고를 요청하니,
 * 느린 네트워크에서는 3번의 광고 요청 왕복이 겹쳐 체감 프리즈로 이어지기
 * 쉬운 구조였다(스크립트 자체는 async라 메인 스레드를 막지 않지만, 로드된
 * 뒤 각 인스턴스가 수행하는 스캔·렌더 작업이 3배로 겹친다).
 *
 * 해법: 여러 배너가 같은 렌더 배치(effect flush)에서 동시에 마운트되면
 * setTimeout(0) 예약을 계속 취소·재예약해, 그 배치가 끝난 뒤 실제로는 script
 * 태그를 딱 한 번만 붙인다. 그 시점엔 페이지의 .kakao_ad_area 전부가 이미
 * DOM에 있으므로 한 번의 스캔으로 전부 처리된다. 나중에(SPA 네비게이션 등으로)
 * 새 화면이 마운트되면 그건 별도 호출 배치라 다시 정상적으로 스크립트가
 * 붙는다 — 기존의 "마운트마다 재스캔 유도" 목적은 그대로 유지된다.
 *
 * requestAnimationFrame이 아니라 setTimeout을 쓴다 — rAF는 탭이 백그라운드거나
 * 아직 첫 페인트 전이면 실행이 미뤄지거나 아예 안 불릴 수 있어(스펙상 명시된
 * 동작), 그 경우 광고가 영영 안 뜨는 사고로 이어진다. setTimeout(0)은 그런
 * 제약 없이 항상 실행된다.
 */
let scheduled: ReturnType<typeof setTimeout> | null = null;

export function scheduleKakaoAdfitLoad() {
  if (typeof window === "undefined") return;
  if (scheduled !== null) clearTimeout(scheduled);
  scheduled = setTimeout(() => {
    scheduled = null;
    const script = document.createElement("script");
    script.src = "//t1.kakaocdn.net/kas/static/ba.min.js";
    script.async = true;
    document.body.appendChild(script);
  }, 0);
}
