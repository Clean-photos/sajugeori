import type { LLMAdapter, LLMChatOptions } from "./types";

export class OpenAIAdapter implements LLMAdapter {
  private model: string;

  constructor(model: string) {
    this.model = model;
  }

  async *chatStream(opts: LLMChatOptions): AsyncIterable<string> {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const stream = await client.chat.completions.create({
      model: this.model,
      max_tokens: opts.maxTokens ?? 1200,
      temperature: opts.temperature ?? 0.7,
      stream: true,
      messages: [
        { role: "system", content: opts.system },
        ...opts.messages,
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}
