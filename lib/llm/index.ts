import type { LLMAdapter, LLMTier } from "./types";
import { MODEL_BY_TIER } from "./model-routing";

export function getLLMAdapter(tier: LLMTier): LLMAdapter {
  const config = MODEL_BY_TIER[tier];

  if (config.provider === "anthropic") {
    const { AnthropicAdapter } = require("./anthropic");
    return new AnthropicAdapter(config.model);
  }

  const { OpenAIAdapter } = require("./openai");
  return new OpenAIAdapter(config.model);
}

export { MODEL_BY_TIER };
export type { LLMAdapter, LLMTier };
