"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

function ChatText({ text }: { text: string }) {
  // [텍스트](url) 마크다운 링크를 <a> 로 변환
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (m) {
          return (
            <a key={i} href={m[2]} className="text-[#C8743A] underline underline-offset-2 font-medium">
              {m[1]}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

const CHARACTER_META: Record<string, { name: string; emoji: string; color: string; bgColor: string; greeting: string }> = {
  sobaeksan_grandma: {
    name: "소백산 할머니",
    emoji: "👵",
    color: "#4F7A5C",
    bgColor: "#4F7A5C14",
    greeting: "아이고 어서 오너라~ 무엇이 궁금하냐?",
  },
  bulte_doryeong: {
    name: "뿔테도령",
    emoji: "🤓",
    color: "#1F3D34",
    bgColor: "#1F3D3414",
    greeting: "안녕하십니까. 무엇을 분석해 드릴까요?",
  },
  tsundere_seonnyeo: {
    name: "츤데레선녀",
    emoji: "🧚",
    color: "#7B5EA7",
    bgColor: "#7B5EA714",
    greeting: "흥, 뭐가 궁금한 거야. 빨리 말해.",
  },
  tla_misuk_robot: {
    name: "T라미숙로봇",
    emoji: "🤖",
    color: "#2563EB",
    bgColor: "#2563EB14",
    greeting: "분석 대기 중. 질문을 입력하십시오.",
  },
  daewang_f_hamzzi: {
    name: "대왕F햄찌",
    emoji: "🐹",
    color: "#C8743A",
    bgColor: "#C8743A14",
    greeting: "어서 와어어~!! 뭐든지 물어봐!! 🐹",
  },
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

function TypingIndicator() {
  return (
    <div className="flex gap-1.5 items-center px-4 py-3">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  );
}

export default function CharacterRoomPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const meta = CHARACTER_META[characterId] ?? {
    name: "역술가",
    emoji: "🔮",
    color: "#1F3D34",
    bgColor: "#1F3D3414",
    greeting: "안녕하세요. 무엇이 궁금하신가요?",
  };
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setStreaming(true);

    try {
      const res = await fetch(`/api/chat/${characterId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok || !res.body) throw new Error("응답 오류");

      setMessages([...next, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: accumulated }]);
      }
    } catch {
      setMessages([...next, { role: "assistant", content: "잠시 후 다시 시도해주세요." }]);
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F6F1E7]">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-[#FBF8F2]/90 backdrop-blur-md border-b border-[#E5DFD4] flex-shrink-0">
        <Link href="/street" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#E5DFD4] transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F3D34" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </Link>

        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border border-[#E5DFD4]"
          style={{ backgroundColor: meta.bgColor }}
        >
          {meta.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-[#1A1A18] leading-none">{meta.name}</p>
          <p className="text-[11px] text-[#6B6661] mt-0.5">사주거리</p>
        </div>

        <div className="w-2 h-2 rounded-full bg-[#4F7A5C] ring-2 ring-[#4F7A5C]/20" title="온라인" />
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">
        {/* Greeting bubble */}
        <div className="flex justify-start animate-fade-up">
          <div className="flex gap-2.5 max-w-[85%]">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 mt-0.5"
              style={{ backgroundColor: meta.bgColor }}
            >
              {meta.emoji}
            </div>
            <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl rounded-tl-md px-4 py-2.5 text-sm text-[#1A1A18] leading-relaxed shadow-sm">
              {meta.greeting}
            </div>
          </div>
        </div>

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-up`}
          >
            {msg.role === "assistant" && (
              <div className="flex gap-2.5 max-w-[85%]">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: meta.bgColor }}
                >
                  {meta.emoji}
                </div>
                <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl rounded-tl-md px-4 py-2.5 text-sm text-[#1A1A18] leading-relaxed shadow-sm">
                  {msg.content ? <ChatText text={msg.content} /> : <TypingIndicator />}
                </div>
              </div>
            )}
            {msg.role === "user" && (
              <div
                className="max-w-[75%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm"
                style={{ backgroundColor: meta.color }}
              >
                {msg.content}
              </div>
            )}
          </div>
        ))}

        {streaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="flex gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-base"
                style={{ backgroundColor: meta.bgColor }}
              >
                {meta.emoji}
              </div>
              <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl rounded-tl-md px-4 py-2.5">
                <TypingIndicator />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-[#FBF8F2]/90 backdrop-blur-md border-t border-[#E5DFD4] flex gap-2 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="메시지를 입력하세요..."
          className="flex-1 border border-[#E5DFD4] rounded-xl px-4 py-2.5 text-sm bg-[#F6F1E7] outline-none focus:border-[#1F3D34] focus:ring-2 focus:ring-[#1F3D34]/10 transition-all"
          disabled={streaming}
        />
        <button
          onClick={send}
          disabled={streaming || !input.trim()}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-30 active:scale-90 transition-all"
          style={{ backgroundColor: meta.color }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
