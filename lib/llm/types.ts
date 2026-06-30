export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMChatOptions {
  system: string;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface LLMAdapter {
  chatStream(opts: LLMChatOptions): AsyncIterable<string>;
}

export type LLMTier = "free_half" | "premium" | "chat";
