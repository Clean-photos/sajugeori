import { supabaseAdmin } from "@/lib/db/client";

/**
 * 마이페이지에 보여줄 "내가 만들어 둔 리포트" 목록.
 *
 * 리포트가 상품별로 다른 테이블에 나뉘어 저장돼 있어서, 마이페이지에서는 어떤 걸
 * 봤는지 전혀 확인할 수 없었다(궁합을 봤는데 마이페이지가 비어 보이는 문제).
 * 테이블별로 훑어서 최근 순으로 합친다.
 *
 * 테이블이 없거나 권한이 없으면 그 항목만 건너뛴다 — 마이페이지 전체가 깨지지 않게.
 */
const SOURCES: { table: string; label: string; href: string }[] = [
  { table: "premium_reports", label: "프리미엄 사주", href: "/premium" },
  { table: "premium_compatibility_reports", label: "프리미엄 궁합", href: "/premium/compatibility" },
  { table: "premium_salpuri_reports", label: "프리미엄 살풀이", href: "/premium/salpuri" },
  { table: "premium_taekil_reports", label: "프리미엄 택일", href: "/premium/taekil" },
  { table: "premium_yearly_reports", label: "프리미엄 연운세", href: "/premium/yearly" },
  { table: "premium_pet_reports", label: "반려동물 궁합", href: "/premium/pet" },
  { table: "premium_saju_adhoc_reports", label: "프리미엄 사주 (직접 입력)", href: "/premium" },
  { table: "blueprint_reports", label: "운명 설계도", href: "/premium/destiny" },
];

export type MyReport = { label: string; href: string; created_at: string };

export async function listUserReports(userId: string): Promise<MyReport[]> {
  const out: MyReport[] = [];

  await Promise.all(
    SOURCES.map(async (s) => {
      try {
        const { data, error } = await supabaseAdmin
          .from(s.table)
          .select("created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);
        if (error || !data) return;
        for (const row of data) {
          if (row?.created_at) out.push({ label: s.label, href: s.href, created_at: row.created_at });
        }
      } catch {
        /* 테이블 없음·권한 없음 → 이 항목만 건너뛴다 */
      }
    })
  );

  return out.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}
