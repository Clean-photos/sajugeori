// ──────────────────────────────────────────────
// Character AI — Layer 2
// Assembles LLM context in the required token-optimized order:
//   character_prompt → saju_compact → memory_summary → recent_messages (max 20)
// ──────────────────────────────────────────────

import type { SajuCompact, UserMemory } from "@/types/saju";
import type { LLMMessage } from "@/lib/llm/types";

interface BuildContextInput {
  characterSystem: string;
  sajuCompact: SajuCompact | null;
  memory: UserMemory | null;
  recentMessages: LLMMessage[];
  currentCharacterId?: string;
}

export function buildSystemPrompt(input: BuildContextInput): string {
  const parts: string[] = [input.characterSystem];

  if (input.sajuCompact) {
    parts.push(`\n[사주 요약]\n${JSON.stringify(input.sajuCompact)}`);
  }

  if (input.memory) {
    const memSummary = summarizeMemory(input.memory);
    if (memSummary) {
      parts.push(
        `\n[사용자 기억 — 다른 역술가들과 나눈 대화에서 파악된 정보]\n이 정보를 자연스럽게 활용하되, "기록에 의하면" 같은 기계적 표현 금지. 자신이 원래 알고 있던 것처럼 또는 사주에서 보인다는 식으로 녹여 쓰세요.\n${memSummary}`
      );
    }

    // 좋은 소식 — 다른 캐릭터한테서 들은 것만 소문으로 전달
    const news = (input.memory.good_news ?? []).filter(
      (n) => !input.currentCharacterId || n.shared_by !== input.currentCharacterId
    );
    if (news.length > 0) {
      const newsList = news.map((n) => `- ${n.what}`).join("\n");
      parts.push(
        `\n[사주거리 소문 — 반드시 대화 초반에 자연스럽게 언급하세요]\n다른 역술가한테서 이 소식이 들려왔습니다. 캐릭터 말투 그대로 소문처럼 꺼내세요.\n예시: "사주거리에 소문이 자자하던데, 너 로또 됐다며?" / "어머, 들었어. 이직 성공했다고?"\n${newsList}`
      );
    }
  }

  return parts.join("\n");
}

function summarizeMemory(memory: UserMemory): string {
  const lines: string[] = [];

  const categories = ["career", "love", "family", "finance"] as const;
  for (const cat of categories) {
    const m = memory[cat];
    if (m.facts.length) lines.push(`${cat} 사실: ${m.facts.slice(0, 3).join(", ")}`);
    if (m.concerns.length) lines.push(`${cat} 고민: ${m.concerns.slice(0, 2).join(", ")}`);
    if (m.goals.length) lines.push(`${cat} 목표: ${m.goals.slice(0, 2).join(", ")}`);
  }

  if (memory.people?.length) {
    lines.push(`주변인: ${memory.people.slice(0, 3).map((p) => `${p.name}(${p.relation})`).join(", ")}`);
  }

  return lines.join("\n");
}

export function trimMessages(messages: LLMMessage[], maxCount = 20): LLMMessage[] {
  return messages.slice(-maxCount);
}
