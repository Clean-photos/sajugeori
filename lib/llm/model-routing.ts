import type { LLMTier } from "./types";

export interface ModelConfig {
  provider: "openai" | "anthropic";
  model: string;
  maxTokens: number;
}

const provider = (process.env.LLM_PROVIDER ?? "anthropic") as "openai" | "anthropic";

export const MODEL_BY_TIER: Record<LLMTier, ModelConfig> = {
  free_half: {
    provider,
    model: process.env.LLM_FREE_MODEL ?? "claude-haiku-4-5-20251001",
    maxTokens: 800,
  },
  premium: {
    provider,
    model: process.env.LLM_PREMIUM_MODEL ?? "claude-sonnet-4-6",
    maxTokens: 4000,
  },
  chat: {
    provider,
    model: process.env.LLM_CHAT_MODEL ?? "claude-haiku-4-5-20251001",
    maxTokens: 1200,
  },
};
