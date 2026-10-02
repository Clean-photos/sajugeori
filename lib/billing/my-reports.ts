import { supabaseAdmin } from "@/lib/db/client";

/**
 * 마이페이지에 보여줄 "내가 만들어 둔 리포트" 목록.
 *
 * [리포트 7개 테이블 통합, 2026-10-02] 예전에는 상품별로 테이블이 7개로
 * 나뉘어 있어(premium_reports/salpuri/taekil/yearly/wuxing/compatibility/pet)
 * 이 함수가 그 7개를 각자 다른 컬럼 규칙으로 하나씩 조회해 합쳤다 — 새 상품을
 * 추가할 때마다 여기도 빠짐없이 챙겨야 했고, 과거 실제로 "펫·가족 리포트가
 * 마이페이지에 안 보임" 같은 버그가 이 구조 때문에 반복됐다. 이제 단일
 * `reports` 테이블(product_id로 구분, profile_id 공통)이라 한 번의 쿼리로 끝난다.
 *
 * 통합 대상이 아닌 것들은 여전히 따로 조회한다:
 *   - blueprint_reports(운명 설계도) — 폴링 기반 재개형 생성이라 데이터 모양이
 *     근본적으로 다름(통합 안 하기로 결정, 022 마이그레이션 주석 참고).
 *   - premium_saju_adhoc_reports(016)·premium_adhoc_reports(018) — "본인이
 *     아닌 대상"을 위한 1회성 캐시로, 애초에 전 상품 공통 구조라 통합 필요가 없음.
 */
const PRODUCT_META: Record<string, { label: string; href: string }> = {
  saju_one: { label: "프리미엄 사주", href: "/premium" },
  salpuri_one: { label: "프리미엄 살풀이", href: "/premium/salpuri" },
  taekil_one: { label: "프리미엄 택일", href: "/premium/taekil" },
  yearly_one: { label: "프리미엄 연운세", href: "/premium/yearly" },
  wuxing_one: { label: "오행 보완 리포트", href: "/premium/ohang" },
  compatibility_one: { label: "프리미엄 궁합", href: "/premium/compatibility" },
  pet_one: { label: "반려동물 궁합", href: "/premium/pet" },
};

// 018(premium_adhoc_reports)의 product_id → 표시 라벨/링크. report-target.ts가
// 이 값들을 PRODUCT_ID로 쓰는 라우트들과 정확히 맞춰야 한다(각 route.ts 참고).
const ADHOC_PRODUCT_MAP: Record<string, { label: string; href: string }> = {
  yearly_one: { label: "프리미엄 연운세", href: "/premium/yearly" },
  salpuri_one: { label: "프리미엄 살풀이", href: "/premium/salpuri" },
  wuxing_one: { label: "오행 보완 리포트", href: "/premium/ohang" },
  compatibility_one: { label: "프리미엄 궁합", href: "/premium/compatibility" },
  pet_one: { label: "반려동물 궁합", href: "/premium/pet" },
};

export type MyReport = {
  label: string;
  href: string;
  created_at: string;
  /** 이 리포트를 만든 대상 사주 표시 문구(예: "1978-03-01(양력) 여성"). 알 수 없으면 null. */
  target: string | null;
  /**
   * reports.id(통합 전엔 saju_profile_id 또는 테이블 자체 PK가 섞여 있었다 —
   * 모든 상품이 자기 PK를 갖게 되면서 이 구분이 사라졌다). viewHref()가 이
   * 값으로 "/premium/{product}/{id}" 형태의 영구 링크를 만든다.
   */
  id: string | null;
  /** 연운세 전용 — 어느 연도의 리포트인지. 다른 상품에서는 항상 null. */
  year: number | null;
  /**
   * §0-2⑥(CoS 실물 재검증, 2026-09-10): 018(premium_adhoc_reports, 본인과
   * 다른 대상) 출신 오행 리포트의 그 테이블 자체 PK. "구 생성분 — ID 없음"
   * (마이페이지가 018 출신엔 열람 라우트를 안 만들던 문제)의 소급 수정 —
   * viewHref()가 이 값이 있으면 /premium/ohang/adhoc/{id}로 보낸다. 다른
   * 상품으로 확장할 때도 이 필드를 재사용하면 된다.
   */
  adhocId: string | null;
};

/**
 * §1(CoS 결정 2026-09-08): "보기 →"가 저장된 결과를 열지 못하고 재생성을
 * 요청해 1회권 소진자를 결제 게이트로 되돌리던 문제 — id 기반 영구 링크로
 * 교체한다.
 *
 * 홈·마이페이지 둘 다 리포트 목록을 보여주므로(QA 2026-09-05: "홈·마이페이지
 * 양쪽 동일" 지적) 한 곳에만 두면 나중에 한쪽만 고치는 사고가 난다 — 공용으로 뺀다.
 */
export function viewHref(r: { href: string; id: MyReport["id"]; year?: MyReport["year"]; adhocId?: MyReport["adhocId"] }): string {
  // §0-2⑥: 018(본인과 다른 대상) 출신 오행 리포트 — 전용 소급 라우트로.
  if (r.href === "/premium/ohang" && r.adhocId) return `/premium/ohang/adhoc/${r.adhocId}`;
  if (!r.id) return r.href;
  switch (r.href) {
    case "/premium/ohang":
    case "/premium/salpuri":
    case "/premium/taekil":
    case "/premium/pet":
    case "/premium/compatibility":
    case "/premium/destiny":
      return `${r.href}/${r.id}`;
    case "/premium/yearly":
      return r.year ? `/premium/yearly/${r.id}?year=${r.year}` : r.href;
    default:
      return r.href;
  }
}

// §D(CoS 실물 확인, 2026-09-29): 목록에 생년월일만 있고 시각이 없어, 시각만
// 다르게 넣은 여러 리포트를 구분할 수 없었다. birthTime이 있으면 함께 보여주고,
// 없으면("시각 모름"으로 등록) 그렇게 명시한다 — 값이 없는 걸 표기 누락처럼
// 보이지 않게 한다.
function formatTarget(birthDate: string, gender: string, calendar?: string | null, birthTime?: string | null): string {
  const genderKr = gender === "M" ? "남성" : "여성";
  const calKr = calendar === "lunar" ? "음력" : "양력";
  if (birthTime) return `${birthDate} ${birthTime.slice(0, 5)}(${calKr}) ${genderKr}`;
  return `${birthDate}(${calKr}) ${genderKr} · 시각 모름`;
}

export async function listUserReports(userId: string): Promise<MyReport[]> {
  const out: MyReport[] = [];

  // 대상 사주 표시(target)는 각 소스 조회가 끝난 뒤 profile id를 모아 한 번에 읽는다 —
  // 예전엔 행마다 순서대로 await해 왕복이 리포트 수만큼 늘었다(2026-09-19 마이페이지 4.6초 후속).
  type ProfileRow = { id: string; birth_date: string; birth_time: string | null; gender: string; calendar: string };
  const profileIdOf = new Map<MyReport, string>();
  const remember = (r: MyReport, profileId: unknown) => {
    if (typeof profileId === "string" && profileId) profileIdOf.set(r, profileId);
  };

  // 서로 무관한 독립 쿼리라 하나의 Promise.all로 동시에 실행한다(2026-09-17 후속).
  await Promise.all([
    // 통합 reports 테이블 — 7개 상품 전부 한 번에.
    (async () => {
      try {
        const { data } = await supabaseAdmin
          .from("reports")
          .select("id, created_at, product_id, profile_id, extra")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(100);
        for (const row of data ?? []) {
          if (!row?.created_at) continue;
          const meta = PRODUCT_META[row.product_id as string];
          if (!meta) continue; // 모르는 product_id는 목록을 깨뜨리느니 건너뛴다
          const extra = (row.extra ?? {}) as Record<string, unknown>;
          let label = meta.label;
          let year: number | null = null;
          if (row.product_id === "pet_one") {
            const petName = extra.pet_name as string | undefined;
            const speciesKr = extra.species === "cat" ? "고양이" : "강아지";
            label = petName ? `반려동물 궁합 · ${petName}(${speciesKr})` : "반려동물 궁합";
          } else if (row.product_id === "yearly_one") {
            year = (extra.year as number | undefined) ?? null;
          }
          const r: MyReport = {
            label, href: meta.href, created_at: row.created_at as string,
            target: null, id: row.id as string, year, adhocId: null,
          };
          remember(r, row.profile_id);
          out.push(r);
        }
      } catch { /* 테이블 없음·권한 없음 → 건너뛴다 */ }
    })(),

    // 운명 설계도(blueprint_reports) — 통합 대상이 아니다(022 마이그레이션 주석 참고).
    (async () => {
      try {
        const { data } = await supabaseAdmin
          .from("blueprint_reports")
          .select("created_at, saju_profile_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);
        for (const row of data ?? []) {
          if (!row?.created_at) continue;
          const r: MyReport = {
            label: "운명 설계도", href: "/premium/destiny", created_at: row.created_at,
            target: null, id: (row.saju_profile_id as string | null) ?? null, year: null, adhocId: null,
          };
          remember(r, row.saju_profile_id);
          out.push(r);
        }
      } catch { /* noop */ }
    })(),

    // 016 — 프리미엄 사주 직접 입력(1회성 캐시). birth_date/gender를 직접 들고 있다.
    (async () => {
      try {
        const { data } = await supabaseAdmin
          .from("premium_saju_adhoc_reports")
          .select("created_at, birth_date, birth_time, gender")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);
        for (const row of data ?? []) {
          if (!row?.created_at) continue;
          out.push({
            label: "프리미엄 사주 (직접 입력)", href: "/premium", created_at: row.created_at,
            target: row.birth_date ? formatTarget(row.birth_date, row.gender, null, row.birth_time) : null,
            id: null, // 016(직접입력) 전용 열람 라우트가 아직 없다 — 정적 href로 폴백.
            year: null,
            adhocId: null,
          });
        }
      } catch { /* noop */ }
    })(),

    // 018 — 전 상품 공통 "가족·지인 대상" 1회성 캐시.
    (async () => {
      try {
        const { data } = await supabaseAdmin
          .from("premium_adhoc_reports")
          .select("id, created_at, product_id, birth_date, birth_time, gender")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);
        for (const row of data ?? []) {
          if (!row?.created_at) continue;
          const meta = ADHOC_PRODUCT_MAP[row.product_id as string];
          if (!meta) continue; // 모르는 product_id는 목록을 깨뜨리느니 건너뛴다
          out.push({
            label: meta.label, href: meta.href, created_at: row.created_at,
            target: row.birth_date ? formatTarget(row.birth_date, row.gender, null, row.birth_time) : null,
            id: null,
            year: null,
            // §0-2⑥: 오행만 전용 소급 라우트(/premium/ohang/adhoc/[id])가 있다.
            // 나머지 상품은 아직 없어 정적 href로 폴백한다(다음 회차로 이월).
            adhocId: row.product_id === "wuxing_one" ? (row.id as string) : null,
          });
        }
      } catch { /* noop */ }
    })(),
  ]);

  // 대상 사주 표시 — 모인 profile id를 한 번의 쿼리로 읽는다. 실패해도 목록은 그대로(target=null).
  const profileIds = [...new Set(profileIdOf.values())];
  if (profileIds.length > 0) {
    try {
      const { data } = await supabaseAdmin
        .from("saju_profiles").select("id, birth_date, birth_time, gender, calendar").in("id", profileIds);
      const byId = new Map((data as ProfileRow[] | null ?? []).map((p) => [p.id, p]));
      for (const [r, pid] of profileIdOf) {
        const p = byId.get(pid);
        if (p) r.target = formatTarget(p.birth_date, p.gender, p.calendar, p.birth_time);
      }
    } catch { /* 표시 문구만 비는 것 — 무시 */ }
  }

  return out.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}
