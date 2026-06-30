import type { UserMemory } from "@/types/saju";

const EMPTY_MEMORY: UserMemory = {
  career: { facts: [], concerns: [], goals: [] },
  love: { facts: [], concerns: [], goals: [] },
  family: { facts: [], concerns: [], goals: [] },
  finance: { facts: [], concerns: [], goals: [] },
  personality: { traits: [] },
  people: [],
  events: [],
  good_news: [],
};

/**
 * 대화 1턴에서 개인 정보를 추출해 기존 메모리와 병합한다.
 * 응답 스트리밍 완료 후 비동기로 호출 — 실패해도 무시.
 */
export async function extractAndMergeMemory(
  existing: UserMemory | null,
  userMessage: string,
  aiResponse: string,
  characterId: string
): Promise<UserMemory> {
  const base: UserMemory = existing
    ? { ...structuredClone(EMPTY_MEMORY), ...existing }
    : structuredClone(EMPTY_MEMORY);

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const today = new Date().toISOString().split("T")[0];

  const prompt = `아래 대화에서 사용자가 자신에 대해 드러낸 정보를 JSON으로 추출하세요.
없으면 빈 배열. 추측 금지, 명확히 언급한 것만 추출.

사용자 발언: "${userMessage}"
오늘 날짜: ${today}

다음 JSON 형식으로만 응답 (다른 텍스트 없이):
{
  "career": { "facts": [], "concerns": [], "goals": [] },
  "love": { "facts": [], "concerns": [], "goals": [] },
  "family": { "facts": [], "concerns": [], "goals": [] },
  "finance": { "facts": [], "concerns": [], "goals": [] },
  "personality": { "traits": [] },
  "people": [],
  "good_news": []
}

good_news 추출 기준 — 사용자가 직접 언급한 긍정적 사건/성과/행운만:
- "이직 성공했어" → { "what": "이직 성공", "date": "${today}" }
- "로또 5만원 됐어" → { "what": "로또 5만원 당첨", "date": "${today}" }
- "남자친구 생겼어" → { "what": "새 연인 생김", "date": "${today}" }
- "승진했어" → { "what": "승진", "date": "${today}" }
고민·걱정·부정적 내용은 good_news에 넣지 마세요.

concerns/facts 추출 기준:
- "이직하고 싶어" → career.concerns: ["이직 고민 중"]
- "남자친구가 바람을 피워" → love.concerns: ["연인의 외도 문제"]
- "엄마가 아프셔" → family.concerns: ["어머니 건강 걱정"]`;

  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = res.content[0].type === "text" ? res.content[0].text.trim() : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return base;

    const extracted = JSON.parse(jsonMatch[0]) as Partial<UserMemory> & {
      good_news?: Array<{ what: string; date: string }>;
    };

    // 카테고리 병합
    const merge = (a: string[], b: string[] = []) =>
      [...new Set([...a, ...b.filter((s) => s?.trim())])];

    const cats = ["career", "love", "family", "finance"] as const;
    for (const cat of cats) {
      const e = extracted[cat];
      if (!e) continue;
      base[cat].facts = merge(base[cat].facts, e.facts);
      base[cat].concerns = merge(base[cat].concerns, e.concerns);
      base[cat].goals = merge(base[cat].goals, e.goals);
    }

    if (extracted.personality?.traits) {
      base.personality.traits = merge(base.personality.traits, extracted.personality.traits);
    }

    if (extracted.people?.length) {
      const existingNames = new Set((base.people ?? []).map((p) => p.name));
      for (const p of extracted.people) {
        if (p.name && !existingNames.has(p.name)) {
          base.people = [...(base.people ?? []), p];
        }
      }
    }

    // 좋은 소식 병합 (중복 제거)
    if (extracted.good_news?.length) {
      const existingNews = new Set((base.good_news ?? []).map((n) => n.what));
      for (const n of extracted.good_news) {
        if (n.what && !existingNews.has(n.what)) {
          base.good_news = [
            ...(base.good_news ?? []),
            { what: n.what, date: n.date ?? today, shared_by: characterId },
          ];
          existingNews.add(n.what);
        }
      }
    }

    return base;
  } catch {
    return base;
  }
}
