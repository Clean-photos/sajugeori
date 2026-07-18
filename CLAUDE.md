# CLAUDE.md — 사주거리(sajugeori.com) 작업 규칙

Next.js 15 App Router / Vercel / Supabase / Anthropic API 기반 사주·운세 서비스.

## 변경 리포트 (모든 작업 종료 시 의무 출력)

작업 세션 종료 시 마지막 응답에 아래 5줄 양식을 출력한다.

```
[변경 리포트 | YYYY-MM-DD]
- 변경 내용: (1~2줄)
- 변경 파일: (나열)
- 변경 등급: 🟢 데이터/설정 | 🟡 additive | 🔴 로직/교체/제거
- 특이사항: 계산 엔진·결제·광고·개인정보 접촉 여부
- 남은 일: (있으면)
```

코드 작업과 기획이 분리돼 있어, 이 리포트가 기획 쪽에 변경을 전달하는 채널이다.
읽기만 한 세션에도 출력하되 "변경 없음"으로 적는다.

## 하드룰

1. **계산 엔진 신중 취급**: `lib/saju-engine/`은 순수 계산 레이어다(외부 의존 0, LLM·결제·캐릭터 import 금지). 상수 테이블(`constants.ts`) 수정은 모든 사용자의 결과를 바꾸므로 근거를 검증하고 사용자 확인 후 변경한다.
2. **명리 지식은 검증 후 집필**: 사주 콘텐츠를 새로 쓸 때 학습 지식에만 의존하지 않는다. 성립 조건·조견표·통계 같은 사실 주장은 웹으로 확인한 뒤 쓰고, 유파에 따라 갈리는 대목은 갈린다고 명시한다. 개운법·풍수 관습은 정통 명리 이론과 구분해 위상을 밝힌다.
3. **콘텐츠 위상 고지**: 모든 사주 콘텐츠에 오락·참고용 면책을 유지한다. 부적·굿 등 금전 지출을 유도하거나 공포를 조장하는 서술 금지(LLM 프롬프트에도 명시).
4. **결제·개인정보 경로**: `app/api/payments/`, `lib/billing/`, 개인정보 처리 경로 변경 시 반드시 사전 확인. 이용권 소진은 리포트 생성 성공 후에만 수행한다.
5. **DB 마이그레이션**: `lib/db/migrations/`에 번호 순으로 추가하고, 마지막에 `grant all on table ... to service_role;`을 반드시 포함한다(누락 시 서버에서 접근 불가).

## 자주 밟는 함정

- **dev 서버 켜 둔 채 `next build` 금지** — `.next`가 덮어써져 dev가 `Cannot find module './NNNN.js'`로 전부 500이 된다. 빌드 검증 전 `preview_stop` → 필요시 `rm -rf .next`.
- **`next/script`를 `<head>`에 쓰지 말 것** — 클라이언트에서 `__next_s` 큐로 치환되어 하이드레이션 불일치가 나고, SSR HTML에 정적 태그가 남지 않아 크롤러가 인지하지 못한다. AdSense 스크립트는 평범한 `<script>`로 유지.
- **Supabase SQL Editor 마이그레이션**은 `GRANT` 누락이 잦다.
- **`content.find(b => b.type === "text")`** — Anthropic 응답에서 `content[0]`을 쓰지 말 것(thinking 블록이 앞에 올 수 있음).

## 구조 메모

- **사주 엔진**: `lib/saju-engine/` — `buildChart`, `pairAnalysis`/`mutualAnalysis`(궁합), `rankDates`(택일), `scoreYear`(연운세), `detectSal`(신살 13종).
- **프리미엄 기능 패턴**: `app/premium/<feature>/page.tsx` + `<Feature>Form.tsx` + `app/api/premium/<feature>/route.ts` + `app/premium/menu/page.tsx` 카드 등록.
- **콘텐츠**: `app/guide/articles.ts`(읽을거리), `app/dictionary/terms.ts`(용어 백과). 두 배열은 `sitemap.ts`·`rss.xml`이 자동 참조하므로 항목 추가 시 별도 수정 불필요.
- **환장의 케미(`/chemi`)는 이 저장소에 없다.** 별도 저장소(`바탕화면/hwanjang-chemi`)·별도 Vercel 프로젝트이며, `next.config.ts`의 Multi-Zone rewrite로 프록시된다. 사주 계산도 별개 구현(`hwanjang-chemi/lib/saju/`)이라 이 저장소의 엔진과 공유하지 않는다. 해당 프로젝트 작업 규칙은 `hwanjang-chemi/CLAUDE.md`를 따른다.

## 자주 쓰는 명령

- 타입체크: `npx tsc --noEmit`
- 빌드: `npx next build` (dev 서버 내린 뒤)
- 개발 서버: `preview_start`로 `saju-dev` 실행 (Bash로 직접 띄우지 않는다)
