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
type ProfileJoinSource = { table: string; label: string; href: string };

const PROFILE_JOIN_SOURCES: ProfileJoinSource[] = [
  { table: "premium_reports", label: "프리미엄 사주", href: "/premium" },
  { table: "premium_salpuri_reports", label: "프리미엄 살풀이", href: "/premium/salpuri" },
  { table: "premium_taekil_reports", label: "프리미엄 택일", href: "/premium/taekil" },
  { table: "premium_yearly_reports", label: "프리미엄 연운세", href: "/premium/yearly" },
  { table: "premium_pet_reports", label: "반려동물 궁합", href: "/premium/pet" },
  { table: "premium_wuxing_reports", label: "오행 보완 리포트", href: "/premium/ohang" },
  { table: "blueprint_reports", label: "운명 설계도", href: "/premium/destiny" },
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
   */
  id: string | null;
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
 */
export function viewHref(r: { href: string; id: MyReport["id"] }): string {
  if (r.href === "/premium/ohang" && r.id) return `/premium/ohang/${r.id}`;
  return r.href;
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
        const { data, error } = await supabaseAdmin
          .from(s.table)
          .select("created_at, saju_profile_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);
        if (error || !data) return;
        for (const row of data) {
          if (!row?.created_at) continue;
          const p = await loadProfile(row.saju_profile_id as string | null);
          out.push({
            label: s.label, href: s.href, created_at: row.created_at,
            target: p ? formatTarget(p.birth_date, p.gender, p.calendar) : null,
            id: (row.saju_profile_id as string | null) ?? null,
          });
        }
      } catch {
        /* 테이블 없음·권한 없음 → 이 항목만 건너뛴다 */
      }
    })
  );

  // 궁합(011)은 person_a_birth/gender를 이미 직접 들고 있어 join이 필요 없다.
  try {
    const { data } = await supabaseAdmin
      .from("premium_compatibility_reports")
      .select("created_at, person_a_birth, person_a_gender")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    for (const row of data ?? []) {
      if (!row?.created_at) continue;
      out.push({
        label: "프리미엄 궁합", href: "/premium/compatibility", created_at: row.created_at,
        target: row.person_a_birth ? formatTarget(row.person_a_birth, row.person_a_gender) : null,
        id: null, // 궁합은 전용 열람 라우트가 아직 없다 — 정적 href로 폴백.
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
      });
    }
  } catch { /* noop */ }

  // 018 — 전 상품 공통 "가족·지인 대상" 1회성 캐시. 지금까지 이 함수가 조회하지
  // 않아 마이페이지에서 통째로 안 보였다(위 주석 참고, §3 점검 중 발견).
  try {
    const { data } = await supabaseAdmin
      .from("premium_adhoc_reports")
      .select("created_at, product_id, birth_date, birth_time, gender")
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
        id: null, // 018(가족·지인 대상) 전용 열람 라우트가 아직 없다 — 정적 href로 폴백.
      });
    }
  } catch { /* noop */ }

  return out.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}
