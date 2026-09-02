import { NextResponse } from "next/server";

/**
 * GET /ohang — 네이버 블로그 유입용 짧은 링크. 프리미엄 메뉴로 보낸다.
 *
 * 블로그 본문에 붙일 주소를 짧고 외우기 쉽게 두려고 만든 진입점이다
 * (sajugeori.com/ohang). 목적지는 오행 리포트 상세(/premium/ohang)가 아니라
 * **프리미엄 메뉴**다 — 처음 온 사람에게 상품 목록을 먼저 보여주라는 지시.
 *
 * UTM을 붙여 GA4에서 이 링크로 들어온 사람을 따로 볼 수 있게 한다. 블로그에
 * UTM이 다 붙은 긴 주소를 노출하지 않아도 되는 게 이 방식의 이점이다.
 *
 * 307(임시)을 쓰는 이유: 308(영구)은 브라우저가 캐시해 버려서, 나중에 목적지를
 * 바꿔도 이미 한 번 눌러 본 사람에게는 반영되지 않는다. 마케팅 링크는 목적지가
 * 바뀔 수 있으므로 임시 리다이렉트가 맞다.
 */
const DESTINATION = "/premium/menu";
const UTM = "utm_source=naver_blog&utm_medium=referral&utm_campaign=ohang";

export function GET(req: Request) {
  return NextResponse.redirect(new URL(`${DESTINATION}?${UTM}`, req.url), 307);
}
