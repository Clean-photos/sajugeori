import { NextRequest, NextResponse } from "next/server";
import { getAdRewardProvider } from "@/lib/ads";
import { getLLMAdapter } from "@/lib/llm";

// POST /api/free/report
// Gate: ad_token must verify before LLM is called
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { saju_json, kind, ad_token, extra } = body;

  if (!ad_token) {
    return NextResponse.json({ error: "ad_token required" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const adProvider = getAdRewardProvider();
  const valid = await adProvider.verify(ad_token, ip);

  if (!valid) {
    return NextResponse.json({ error: "Invalid or used ad token" }, { status: 403 });
  }

  // TODO: if saju_json is null, calculate from extra.birth_date etc. using saju engine
  // TODO: mark ad_token as used in DB

  // Demo: run engine on the provided birth info
  let engineResult = "";
  try {
    const { runSajuEngine } = await import("@/lib/saju-engine");
    const birthDate = extra?.birth_date ?? "1990-01-01";
    const birthTime = extra?.birth_time ?? null;
    const gender = extra?.gender ?? "M";
    const result = runSajuEngine({ birth_date: birthDate, birth_time: birthTime, calendar: "solar", gender });
    const chart = result.saju_json;
    engineResult = `일간 ${chart.identity.day_master} · ${chart.identity.strength_label}`;
  } catch {
    engineResult = "사주 계산 완료";
  }

  const mockReport = `🔮 무료 사주 분석 결과 (${engineResult})

【 핵심 성격 】
단단하고 책임감이 강한 성향입니다. 한 번 결정하면 끝까지 밀고 나가는 추진력이 있으며, 맡은 일에 성실하게 임합니다. 다만 혼자 짐을 다 지려는 경향이 있어 때로 스스로를 혹사시킬 수 있습니다.

【 현재 운세 】
지금 시기는 실력을 쌓고 기반을 다지는 축적기입니다. 빠른 결과보다 꾸준한 준비가 더 중요한 때입니다. 인정받을 기회는 반드시 옵니다.

【 조언 】
재물운은 안목과 성실함으로 쌓이는 구조입니다. 투자보다 전문성 강화에 집중하는 것이 이 시기에 맞습니다.

━━━━━━━━━━━━━━━
🔒 더 자세한 분석 (직업운 · 연애운 · 건강 · 대운 전체)은 프리미엄에서 확인하세요.`;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      for (const char of mockReport) {
        controller.enqueue(enc.encode(char));
        await new Promise(r => setTimeout(r, 12));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
