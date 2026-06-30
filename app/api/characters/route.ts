import { NextResponse } from "next/server";

// Static fallback — replace with DB query once Supabase is connected
const CHARACTERS = [
  { id: "sobaeksan_grandma", display_name: "소백산 할머니", tagline: "다정하고 푸근한 산신령 같은 할머니", avatar_url: null, sort_order: 1 },
  { id: "bulte_doryeong", display_name: "뿔테도령", tagline: "뿔테 안경 쓴 선비풍 역술가", avatar_url: null, sort_order: 2 },
  { id: "tsundere_seonnyeo", display_name: "츤데레선녀", tagline: "퉁명한 척하지만 결국 다 챙겨주는 선녀", avatar_url: null, sort_order: 3 },
  { id: "tla_misuk_robot", display_name: "T라미숙로봇", tagline: "감정 빼고 데이터로만 말하는 분석 로봇", avatar_url: null, sort_order: 4 },
  { id: "daewang_f_hamzzi", display_name: "대왕F햄찌", tagline: "공감 폭발 대왕 햄스터, 감정 먼저 보듬는 극F", avatar_url: null, sort_order: 5 },
];

export async function GET() {
  // TODO: query characters table from Supabase
  return NextResponse.json(CHARACTERS);
}
