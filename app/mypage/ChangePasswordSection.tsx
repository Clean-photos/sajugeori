"use client";

import { useState } from "react";

export function ChangePasswordSection() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function reset() {
    setOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
    setError("");
    setDone(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "오류가 발생했습니다.");
      setDone(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between text-sm font-semibold text-[#1B3A4B]"
        >
          비밀번호 변경
          <span className="text-[#6B6661] text-xs font-normal">→</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl p-4">
      <p className="text-sm font-semibold text-[#1B3A4B] mb-3">비밀번호 변경</p>

      {done ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[#1A1A18]">비밀번호가 변경됐습니다.</p>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-[#6B6661] text-left"
          >
            닫기
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          <input
            type="password"
            placeholder="현재 비밀번호"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-[#1F3D34] focus:ring-2 focus:ring-[#1F3D34]/10 transition-all"
          />
          <input
            type="password"
            placeholder="새 비밀번호 (8자 이상, 영문+숫자)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-[#1F3D34] focus:ring-2 focus:ring-[#1F3D34]/10 transition-all"
          />
          <input
            type="password"
            placeholder="새 비밀번호 확인"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-[#1F3D34] focus:ring-2 focus:ring-[#1F3D34]/10 transition-all"
          />
          {error && <p className="text-xs text-[#C0392B]">{error}</p>}
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={reset}
              disabled={loading}
              className="flex-1 border border-[#E5DFD4] text-[#6B6661] rounded-xl py-2.5 text-xs font-medium disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !currentPassword || !newPassword || !confirm}
              className="flex-1 bg-[#1F3D34] text-white rounded-xl py-2.5 text-xs font-semibold disabled:opacity-40"
            >
              {loading ? "변경 중..." : "변경하기"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
