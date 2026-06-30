import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 클라이언트 사이드 or 일반 API route — RLS 적용
export const supabase = createClient(url, anon);

// 서버 전용 (회원가입, 어드민 작업) — RLS bypass
export const supabaseAdmin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});
