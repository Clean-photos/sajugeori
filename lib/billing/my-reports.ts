import { supabaseAdmin } from "@/lib/db/client";

/**
 * 마이페이지에 보여줄 "내가 만들어 둔 리포트" 목록.
 *
 * 리포트가 상품별로 다른 테이블에 나뉘어 저장돼 있어서, 마이페이지에서는 어떤 걸
 * 봤는지 전혀 확인할 수 없었다(궁합을 봤는데 마이페이지가 비어 보이는 문제).
 * 테이블별로 훑어서 최근 순으로 합친다.
 *
 * 테이블이 없거나 권한이 없으면 그 항목만 건너뛴다 — 마이페이지 전체가 깨지지 않게.
 *
 * §3(CEO 결정 2026-09-02): 018(premium_adhoc_reports, 가족·지인 대상 1회성 캐시)이
 * 도입된 뒤로 018 라우트를 탄 가족 리포트는 label이 항상 같아서("프리미엄 연운세" 등)
 * 여러 건이면 누구 걸 봤는지 구분이 안 됐다. 그리고 이 함수는 애초에 018 테이블을
 * 조회 대상에 넣지 않아서, 가족 리포트는 마이페이지에 아예 안 보이고 있었다(점검 중
 * 발견 — report-target.ts가 018을 쓰는 5개 라우트: 연운세·살풀이·오행·궁합·펫).
 * 이번에 그 누락을 메우고, 모든 리포트에 대상 사주(생년월일·성별)를 함께 붙인다.
 */
/**
 * idColumn: 이 테이블에서 "보기 →" 열람 라우트가 식별자로 쓸 컬럼.
 *   - "saju_profile_id" — 프로필당 1행(PK 자체가 saju_profile_id). 살풀이·오행·
 *     연운세(+year)·프리미엄 사주가 여기 해당.
 *   - "id" — 프로필당 여러 행 가능(자체 PK 보유). 택일·펫이 여기 해당(같은
 *     프로필로도 목적·기간, 아이가 다르면 별도 행이라 saju_profile_id만으로는
 *     어느 행인지 특정할 수 없다).
 * hasYear: 연운세 전용 — year도 함께 select해 링크에 쿼리로 붙인다(개인정보
 * 아니므로 쿼리 노출 무방 — §1이 없앤 것은 생년월일·시각·성별이었다).
 */
type ProfileJoinSource = { table: string; label: string; href: string; idColumn: "saju_profile_id" | "id"; hasYear?: boolean };

const PROFILE_JOIN_SOURCES: ProfileJoinSource[] = [
  { table: "premium_reports", label: "프리미엄 사주", href: "/premium", idColumn: "saju_profile_id" },
  { table: "premium_salpuri_reports", label: "프리미엄 살풀이", href: "/premium/salpuri", idColumn: "saju_profile_id" },
  { table: "premium_taekil_reports", label: "프리미엄 택일", href: "/premium/taekil", idColumn: "id" },
  { table: "premium_yearly_reports", label: "프리미엄 연운세", href: "/premium/yearly", idColumn: "saju_profile_id", hasYear: true },
  { table: "premium_pet_reports", label: "반려동물 궁합", href: "/premium/pet", idColumn: "id" },
  { table: "premium_wuxing_reports", label: "오행 보완 리포트", href: "/premium/ohang", idColumn: "saju_profile_id" },
  // 운명 설계도는 전용 열람 라우트가 없다 — §1(CoS 결정 2026-09-08) 검토 결과,
  // 이 상품은 페이지 자체 게이트(canView = premium || hasPass || hasReport)가
  // 이미 "리포트 보유"만으로 통과시키고, API도 status:"done"이면 이용권 검사
  // 전에 바로 내용을 돌려줘 오행과 같은 재결제 요구 문제가 원래 없다(확인:
  // app/premium/destiny/page.tsx, app/api/premium/destiny/route.ts). 그래서
  // 정적 href를 그대로 둔다.
  { table: "blueprint_reports", label: "운명 설계도", href: "/premium/destiny", idColumn: "saju_profile_id" },
];

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
   * §1(CoS 결정 2026-09-08, 재설계): 이 리포트를 저장한 saju_profile_id.
   * viewHref()가 이 값으로 "/premium/{product}/{id}" 형태의 영구 링크를 만든다.
   *
   * ⚠️ 예전엔 birth_date 등 원본 대상 값을 쿼리로 실어 보내 그 페이지가 자동
   * 제출하게 했다(autostart) — 그런데 그건 "다시 보기"가 아니라 "같은 조건으로
   * 다시 만들기" 요청이라, 1회권을 이미 소진한 사용자는 결제 게이트에 막혀
   * 재열람이 안 됐다(실측: 990원 결제 → 정상 생성 → 재진입 시 페이월 재노출).
   * 부수적으로 생년월일·성별이 URL에 평문으로 남는 문제도 있었다. saju_profile_id
   * 기반 열람 라우트(이용권 검사 없음)로 교체해 두 문제를 함께 없앤다.
   *
   * idColumn이 "id"인 소스(택일·펫)에서는 그 테이블 자체의 PK가 들어간다 —
   * 프로필당 여러 행일 수 있어 saju_profile_id만으로는 특정 행을 가리킬 수 없다.
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
 * 교체한다. 오행만 전용 열람 라우트(app/premium/ohang/[id])가 있고, 나머지
 * 상품은 아직 없어(구조가 제각각이라 검증이 더 필요) 기존 정적 href를 쓴다 —
 * 같은 문제가 있는 것은 확인했으나 이번 회차 범위 밖(다음 회차로 이월).
 *
 * 홈·마이페이지 둘 다 리포트 목록을 보여주므로(QA 2026-09-05: "홈·마이페이지
 * 양쪽 동일" 지적) 한 곳에만 두면 나중에 한쪽만 고치는 사고가 난다 — 공용으로 뺀다.
 *
 * §1 확장(2026-09-08): 오행에서 검증된 패턴(id 기반 열람, 이용권 검사 없음)을
 * 같은 게이트를 쓰는 살풀이·택일·연운세·펫·궁합에도 적용했다. 운명 설계도는
 * 이 문제가 원래 없어(PROFILE_JOIN_SOURCES 주석 참고) 정적 href 그대로다.
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
      return `${r.href}/${r.id}`;
    case "/premium/yearly":
      return r.year ? `/premium/yearly/${r.id}?year=${r.year}` : r.href;
    default:
      return r.href;
  }
}

function formatTarget(birthDate: string, gender: string, calendar?: string | null): string {
  const genderKr = gender === "M" ? "남성" : "여성";
  const calKr = calendar === "lunar" ? "음력" : "양력";
  return `${birthDate}(${calKr}) ${genderKr}`;
}

export async function listUserReports(userId: string): Promise<MyReport[]> {
  const out: MyReport[] = [];

  // saju_profile_id로 저장된 리포트들 — 같은 사용자가 과거에 여러 번 재등록했다면
  // 서로 다른 profile row를 가리킬 수 있다(재등록은 INSERT라 옛 row가 남는다).
  // id별로 한 번만 조회해 재사용한다.
  type ProfileRow = { birth_date: string; birth_time: string | null; gender: string; calendar: string };
  const profileCache = new Map<string, ProfileRow | null>();
  async function loadProfile(id: string | null | undefined): Promise<ProfileRow | null> {
    if (!id) return null;
    if (!profileCache.has(id)) {
      const { data } = await supabaseAdmin
        .from("saju_profiles").select("birth_date, birth_time, gender, calendar").eq("id", id).maybeSingle();
      profileCache.set(id, data ?? null);
    }
    return profileCache.get(id) ?? null;
  }

  await Promise.all(
    PROFILE_JOIN_SOURCES.map(async (s) => {
      try {
        const cols = ["created_at", "saju_profile_id"];
        if (s.idColumn === "id") cols.push("id");
        if (s.hasYear) cols.push("year");
        const { data, error } = await supabaseAdmin
          .from(s.table)
          .select(cols.join(", "))
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);
        if (error || !data) return;
        for (const row of data as unknown as Record<string, unknown>[]) {
          if (!row?.created_at) continue;
          const p = await loadProfile(row.saju_profile_id as string | null);
          out.push({
            label: s.label, href: s.href, created_at: row.created_at as string,
            target: p ? formatTarget(p.birth_date, p.gender, p.calendar) : null,
            id: (s.idColumn === "id" ? (row.id as string | null) : (row.saju_profile_id as string | null)) ?? null,
            year: s.hasYear ? ((row.year as number | null) ?? null) : null,
            adhocId: null,
          });
        }
      } catch {
        /* 테이블 없음·권한 없음 → 이 항목만 건너뛴다 */
      }
    })
  );

  // 궁합(011)은 person_a_birth/gender를 이미 직접 들고 있어 join이 필요 없다.
  // §1(CoS 결정 2026-09-08): 프로필당 여러 행(상대·관계유형 조합별)이라 이
  // 테이블 자체의 PK(id)를 열람 라우트 식별자로 쓴다(택일·펫과 동일 이유).
  try {
    const { data } = await supabaseAdmin
      .from("premium_compatibility_reports")
      .select("id, created_at, person_a_birth, person_a_gender")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    for (const row of data ?? []) {
      if (!row?.created_at) continue;
      out.push({
        label: "프리미엄 궁합", href: "/premium/compatibility", created_at: row.created_at,
        target: row.person_a_birth ? formatTarget(row.person_a_birth, row.person_a_gender) : null,
        id: row.id ?? null,
        year: null,
        adhocId: null,
      });
    }
  } catch { /* noop */ }

  // 016 — 프리미엄 사주 직접 입력(1회성 캐시). birth_date/gender를 직접 들고 있다.
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
        target: row.birth_date ? formatTarget(row.birth_date, row.gender) : null,
        id: null, // 016(직접입력) 전용 열람 라우트가 아직 없다 — 정적 href로 폴백.
        year: null,
        adhocId: null,
      });
    }
  } catch { /* noop */ }

  // 018 — 전 상품 공통 "가족·지인 대상" 1회성 캐시. 지금까지 이 함수가 조회하지
  // 않아 마이페이지에서 통째로 안 보였다(위 주석 참고, §3 점검 중 발견).
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
        target: row.birth_date ? formatTarget(row.birth_date, row.gender) : null,
        id: null,
        year: null,
        // §0-2⑥: 오행만 전용 소급 라우트(/premium/ohang/adhoc/[id])가 있다.
        // 나머지 상품은 아직 없어 정적 href로 폴백한다(다음 회차로 이월).
        adhocId: row.product_id === "wuxing_one" ? (row.id as string) : null,
      });
    }
  } catch { /* noop */ }

  return out.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}
