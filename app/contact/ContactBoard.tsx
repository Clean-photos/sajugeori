"use client";

import { useEffect, useState } from "react";

interface Inquiry {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

const CATEGORY_OPTIONS = [
  { value: "general", label: "일반" },
  { value: "bug", label: "오류 신고" },
  { value: "payment", label: "결제" },
  { value: "account", label: "계정" },
  { value: "suggestion", label: "제안" },
];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.value, c.label]));
const STATUS_LABEL: Record<string, string> = { open: "접수됨", answered: "답변 완료", closed: "종료" };

export function ContactBoard() {
  const [list, setList] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ category: "general", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/inquiries");
      const data = await res.json();
      setList(data.inquiries ?? []);
    } catch { /* noop */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "문의 등록에 실패했습니다.");
        setSubmitting(false);
        return;
      }
      setForm({ category: "general", subject: "", message: "" });
      setDone(true);
      setList((prev) => [data.inquiry, ...prev]);
      setTimeout(() => setDone(false), 2500);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
    setSubmitting(false);
  }

  const canSubmit = form.subject.trim().length >= 2 && form.message.trim().length >= 5 && !submitting;

  return (
    <div className="px-5 py-6 flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">문의 유형</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setForm({ ...form, category: o.value })}
                className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${form.category === o.value ? "bg-[#1F3D34] text-white border-[#1F3D34]" : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">제목</label>
          <input type="text" value={form.subject} maxLength={100} placeholder="제목을 입력하세요"
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3 text-sm bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34]" />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">내용</label>
          <textarea value={form.message} maxLength={2000} rows={5} placeholder="문의 내용을 자유롭게 남겨주세요"
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3 text-sm bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] resize-none leading-relaxed" />
        </div>

        {error && <p className="text-xs text-[#C0392B] px-1">{error}</p>}
        {done && <p className="text-xs text-[#4F7A5C] px-1">문의가 접수되었습니다. 확인 후 검토하겠습니다.</p>}

        <button onClick={submit} disabled={!canSubmit}
          className="w-full bg-[#C8743A] text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.97] transition-all">
          {submitting ? "등록 중…" : "문의 남기기"}
        </button>
        <p className="text-[11px] text-[#6B6661]/70 text-center">
          문의 내용은 운영자에게만 전달되며, 다른 이용자에게 공개되지 않습니다.
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-[#6B6661] tracking-wide mb-3 px-1">내 문의 내역</p>
        {loading ? (
          <p className="text-xs text-[#6B6661]/60 px-1">불러오는 중…</p>
        ) : list.length === 0 ? (
          <p className="text-xs text-[#6B6661]/60 px-1">아직 남긴 문의가 없어요.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {list.map((q) => (
              <div key={q.id} className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#1F3D34]/8 text-[#1F3D34]">
                    {CATEGORY_LABEL[q.category] ?? q.category}
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#C8743A]/12 text-[#C8743A]">
                    {STATUS_LABEL[q.status] ?? q.status}
                  </span>
                  <span className="ml-auto text-[10px] text-[#6B6661]/60">{q.created_at?.slice(0, 10)}</span>
                </div>
                <p className="text-sm font-semibold text-[#1A1A18]">{q.subject}</p>
                <p className="text-xs text-[#6B6661] mt-1 leading-relaxed whitespace-pre-wrap">{q.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
