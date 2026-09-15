// §2-2(CoS 실물 재검증, 2026-09-15 재발): 홈 히어로 폼 → /free/saju로 생년월일시를
// 넘길 때 URL 쿼리에 실으면, 도착 즉시 history.replaceState로 주소창을 지워도
// 늦다 — AdSense 정적 <script>(app/layout.tsx head)가 하이드레이션 useEffect보다
// 먼저 실행되며 그 시점의 document.URL을 광고 요청에 그대로 실어 보낸다(실측:
// googleads.g.doubleclick.net /pagead/ads의 url= 파라미터에 생년월일시 노출).
// 근본 해결은 PII를 애초에 주소창에 올리지 않는 것 — sessionStorage로 1회성
// 전달하고, 읽는 즉시 지운다. autostart=1만 쿼리에 남는다(PII 아님).
const KEY = "free_saju_handoff";

export type FreeSajuHandoff = { birth_date: string; birth_time: string; gender: string };

export function writeFreeSajuHandoff(target: FreeSajuHandoff) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(target));
  } catch {
    // 저장 실패(프라이빗 모드 등)해도 폼은 그대로 진행된다 — /free/saju가 빈 폼으로 뜰 뿐.
  }
}

export function readAndClearFreeSajuHandoff(): FreeSajuHandoff | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw);
    if (typeof parsed?.birth_date !== "string" || typeof parsed?.gender !== "string") return null;
    return { birth_date: parsed.birth_date, birth_time: typeof parsed.birth_time === "string" ? parsed.birth_time : "", gender: parsed.gender };
  } catch {
    return null;
  }
}
