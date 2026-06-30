export interface CharacterPromptParams {
  tone: "warm" | "professional" | "tsundere" | "direct";
  directness: number; // 0-100
  empathy: number; // 0-100
  logic: number; // 0-100
  humor?: number;
  spirituality?: number;
  formality?: number;
  response_length?: "short" | "medium" | "long";
}

export interface Character {
  id: string;
  display_name: string;
  tagline: string | null;
  avatar_url: string | null;
  prompt_params: CharacterPromptParams;
  is_active: boolean;
  sort_order: number;
}

export interface ChatMessage {
  id: number;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  token_count: number | null;
  created_at: string;
}
