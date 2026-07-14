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

const CHARACTER_META: Record<string, { name: string; emoji: string; color: string; bgColor: string; greetings: string[] }> = {
  sobaeksan_grandma: {
    name: "소백산 할머니",
    emoji: "👵",
    color: "#4F7A5C",
    bgColor: "#4F7A5C14",
    greetings: [
      "왔느냐, 뭐가 그리 궁금해서 이 할미를 찾아왔을꼬.",
      "아이고 아가야, 어서 오너라. 오늘은 무슨 바람이 불었느냐.",
      "그래, 마침 잘 왔다. 무엇이 마음에 걸리느냐.",
      "이 할미한테 다 털어놓거라. 뭐가 궁금한 게냐.",
      "어서 와 앉거라. 차 한잔 내릴테니 생각을 정리해보렴.",
      "오냐오냐, 얼굴 보니 좋구나. 무슨 일로 왔느냐.",
    ],
  },
  bulte_doryeong: {
    name: "뿔테도령",
    emoji: "🤓",
    color: "#1F3D34",
    bgColor: "#1F3D3414",
    greetings: [
      "안녕하십니까. 어떤 도움을 드릴까요?",
      "어서 오십시오. 궁금한 점을 차분히 말씀해 주십시오.",
      "반갑습니다. 오늘은 어떤 사안을 살펴볼까요?",
      "편히 앉으시지요. 무엇이 궁금하신지 여쭙겠습니다.",
      "잘 오셨습니다. 하나씩 정리해 드리겠습니다.",
      "무엇이든 물어보십시오. 근거를 들어 말씀드리겠습니다.",
    ],
  },
  tsundere_seonnyeo: {
    name: "츤데레선녀",
    emoji: "🧚",
    color: "#7B5EA7",
    bgColor: "#7B5EA714",
    greetings: [
      "뭐가 궁금해서 왔어? 빨리 말해봐.",
      "흥, 또 왔네. ...뭐, 왔으니까 봐줄게.",
      "왜, 무슨 일인데. 뜸 들이지 말고.",
      "뭐야 그 표정은. 할 말 있으면 해.",
      "됐고, 궁금한 거나 말해. 시간 없어.",
      "...왔으면 앉든가. 뭐 물어보려고 온 거잖아.",
    ],
  },
  tla_misuk_robot: {
    name: "T라미숙로봇",
    emoji: "🤖",
    color: "#2563EB",
    bgColor: "#2563EB14",
    greetings: [
      "분석 대기 중. 질문을 입력하십시오.",
      "시스템 가동. 요청 사항 접수 준비 완료.",
      "접속 확인. 무엇을 분석할지 입력 요망.",
      "대기 상태. 데이터 입력을 기다립니다.",
      "가동 준비 완료. 질의 입력 시 분석 개시.",
      "세션 시작. 처리할 항목을 입력하십시오.",
    ],
  },
  daewang_f_hamzzi: {
    name: "대왕F햄찌",
    emoji: "🐹",
    color: "#C8743A",
    bgColor: "#C8743A14",
    greetings: [
      "어서 와어어~!! 뭐든지 물어봐!! 🐹",
      "왔햄?? 기다렸어어 ㅠㅠ 오늘 뭐 궁금해?",
      "헤헤 반가워어! 무슨 얘기 하고 싶햄?",
      "왔구나 왔구나~ 편하게 다 말해도 돼햄!",
      "오늘도 와줘서 고마워어🫳 뭐가 궁금해?",
      "햄찌 여기 있어! 무슨 고민이든 말해봐햄!",
    ],
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
    greetings: ["안녕하세요. 무엇이 궁금하신가요?"],
  };
  // 방 입장 때마다 인사말을 랜덤으로 하나 골라 고정 (매 렌더마다 안 바뀌게)
  const [greeting] = useState(() => meta.greetings[Math.floor(Math.random() * meta.greetings.length)]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  // 무료 체험 상태: premium이면 배너 숨김, 아니면 remaining 표시
  const [trial, setTrial] = useState<{ premium: boolean; limit?: number; remaining?: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch("/api/chat/status")
      .then((r) => r.json())
      .then((d) => {
        if (d?.loggedIn) setTrial({ premium: !!d.premium, limit: d.limit, remaining: d.remaining });
      })
      .catch(() => {});
  }, []);

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

      // 게이트 응답(로그인/사주등록/페이월) — JSON으로 내려오면 안내 후 이동
      if (res.status === 401 || res.status === 402 || res.status === 403) {
        const data = await res.json().catch(() => null);
        const msg = data?.message ?? "계속하려면 로그인이 필요합니다.";
        setMessages([...next, { role: "assistant", content: msg }]);
        if (data?.redirect) {
          setTimeout(() => { window.location.href = data.redirect; }, 1400);
        }
        return;
      }

      if (!res.ok || !res.body) throw new Error("응답 오류");

      // 무료 메시지 1개 소비 반영
      setTrial((t) =>
        t && !t.premium && typeof t.remaining === "number"
          ? { ...t, remaining: Math.max(0, t.remaining - 1) }
          : t
      );

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

      {/* 무료 체험 배너 (비프리미엄) */}
      {trial && !trial.premium && typeof trial.remaining === "number" && (
        <Link
          href="/premium"
          className="flex-shrink-0 flex items-center justify-center gap-1.5 bg-[#C8743A]/10 border-b border-[#C8743A]/20 px-4 py-2 text-xs text-[#9A5A2A] active:opacity-70"
        >
          <span className="font-semibold">체험 중</span>
          <span className="opacity-70">·</span>
          {trial.remaining > 0 ? (
            <span>무료 채팅 <b className="font-bold">{trial.remaining}</b>개 남았어요</span>
          ) : (
            <span>무료 체험이 끝났어요 · 프리미엄으로 계속하기 →</span>
          )}
        </Link>
      )}

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
              {greeting}
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
