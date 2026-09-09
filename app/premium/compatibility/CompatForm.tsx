"use client";

import { useMemo, useState } from "react";
import { cleanReportText } from "@/lib/report-format";
import { WaitingCards } from "@/components/premium/WaitingCards";
import { SajuInputForm, type SavedSaju } from "@/components/premium/SajuInputForm";
import { premiumErrorInfo, type PremiumErrorInfo } from "@/components/premium/premiumError";
import { PremiumErrorBanner } from "@/components/premium/PremiumErrorBanner";
import { CompatReportResultView } from "@/components/premium/CompatReportResultView";
import { toSolar, type CalendarKind } from "@/lib/calendar/convert";

type Step = "form" | "loading" | "result" | "deleted";

const CONTEXT_OPTIONS = [
  { value: "romance", label: "연애 · 결혼" },
  { value: "work", label: "직장 · 비즈니스" },
  { value: "friend", label: "친구 · 지인" },
];

function formatDateInput(raw: string) {
  let v = raw.replace(/[^0-9]/g, "");
  if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4);
  if (v.length > 7) v = v.slice(0, 7) + "-" + v.slice(7);
  return v.slice(0, 10);
}

type Target = { birth_date: string; birth_time: string | null; gender: string };

export function CompatForm({ saved }: { saved: SavedSaju }) {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({
    partner_birth: "", partner_gender: "", context: "romance",
  });
  // §7-1·7-2(CoS+CEO 실물 확인, 2026-09-08): 상대방 입력에 시각·역법이 없어
  // 모든 상대가 시주 제외로, 음력 생일이면 결과가 통째로 틀리게 계산됐다.
  // 내 사주(SajuInputForm)와 같은 방식 — 화면에서 이미 양력으로 변환해 보낸다.
  const [partnerCalendar, setPartnerCalendar] = useState<CalendarKind>("solar");
  const [partnerTime, setPartnerTime] = useState("");
  const [partnerNoTime, setPartnerNoTime] = useState(true);
  const [report, setReport] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState<PremiumErrorInfo | null>(null);
  // 실패한 시도의 id. 있으면 "같은 정보로 재생성" — 서버에 저장된 입력값을 그대로 재사용한다.
  const [attemptId, setAttemptId] = useState<string | null>(null);
  // 어떤 A 사주로 만든 리포트인지. 재생성·삭제 때도 같은 값을 보낸다.
  const [target, setTarget] = useState<Target | null>(null);

  const partnerConv = useMemo(
    () => (form.partner_birth.length === 10 ? toSolar(form.partner_birth, partnerCalendar) : null),
    [form.partner_birth, partnerCalendar]
  );

  // A(나 또는 직접 입력한 사람)는 아래 확정 화면에서 정한다.
  async function submit(regenerate = false, v?: Target) {
    const t = v ?? target;
    if (!t) return;
    if (!partnerConv?.ok) return;
    setTarget(t);
    setStep("loading");
    setError(null);
    try {
      const partnerPayload = {
        partner_birth: partnerConv.solar,
        partner_birth_time: partnerNoTime ? null : partnerTime || null,
        partner_gender: form.partner_gender,
        context: form.context,
      };
      const res = await fetch("/api/premium/compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regenerate && attemptId ? { attemptId, ...t } : { ...partnerPayload, ...t }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAttemptId(typeof data.attemptId === "string" ? data.attemptId : null);
        setError(premiumErrorInfo(data, "분석에 실패했습니다. 입력하신 정보는 그대로 남아 있어요."));
        setStep("form");
        return;
      }
      setAttemptId(null);
      setReport(cleanReportText(data.report));
      setScore(data.score ?? null);
      setStep("result");
    } catch {
      setError({ message: "네트워크 연결을 확인한 뒤 다시 시도해주세요." });
      setStep("form");
    }
  }

  const canSubmit = !!partnerConv?.ok && !!form.partner_gender;

  // 입력을 바꾸면 이전 실패 시도(attemptId)는 더 이상 유효하지 않다 — 새 시도로 취급.
  function updateForm(patch: Partial<typeof form>) {
    setForm({ ...form, ...patch });
    setAttemptId(null);
    setError(null);
  }

  async function handleDelete() {
    const res = await fetch("/api/premium/compatibility", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partner_birth: partnerConv?.ok ? partnerConv.solar : form.partner_birth,
        partner_birth_time: partnerNoTime ? null : partnerTime || null,
        partner_gender: form.partner_gender, context: form.context,
        ...(target ?? {}),
      }),
    });
    if (!res.ok) throw new Error("delete failed");
    setStep("deleted");
  }

  if (step === "deleted") {
    return (
      <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-[#1A1A18]">결과를 삭제했습니다.</p>
        <p className="text-xs text-[#6B6661]">다시 보려면 궁합을 새로 결제해 주세요.</p>
      </div>
    );
  }

  if (step === "result") {
    return (
      <div className="flex flex-col gap-2">
        <CompatReportResultView report={report} score={score} onDelete={handleDelete} />
        <button onClick={() => { setStep("form"); setReport(""); setScore(null); }}
          className="no-print text-sm text-[#6B6661] text-center py-2 -mt-4 active:opacity-60">
          다른 상대와 보기
        </button>
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
        <div className="w-10 h-10 border-2 border-[#C8743A]/30 border-t-[#C8743A] rounded-full animate-spin" />
        <p className="text-sm text-[#6B6661]">두 사주를 맞춰보고 있어요…</p>
        <p className="text-xs text-[#6B6661]/60">최대 1분 정도 걸릴 수 있어요</p>
        <WaitingCards />
      </div>
    );
  }

  return (
    <>
    <div className="flex-1 px-5 pt-6 flex flex-col gap-5">
      <div>
        <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">관계 유형</label>
        <div className="grid grid-cols-3 gap-2">
          {CONTEXT_OPTIONS.map((o) => (
            <button key={o.value} onClick={() => updateForm({ context: o.value })}
              className={`py-2.5 rounded-xl border text-xs font-medium transition-all ${form.context === o.value ? "bg-[#1F3D34] text-white border-[#1F3D34]" : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">상대방 생년월일</label>
        <input type="text" inputMode="numeric" placeholder="YYYY-MM-DD" value={form.partner_birth} maxLength={10}
          onChange={(e) => updateForm({ partner_birth: formatDateInput(e.target.value) })}
          className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-sm bg-[#FBF8F2] focus:outline-none focus:border-[#1F3D34] tracking-widest" />

        {/* §7-2: 상대방 생일이 음력이면 결과가 통째로 틀리는데 경고가 없었다 —
            내 사주와 같은 역법 선택을 넣는다. */}
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          {([["solar", "양력"], ["lunar", "음력(평달)"], ["lunar-leap", "음력(윤달)"]] as const).map(([val, label]) => (
            <button key={val} type="button"
              onClick={() => { setPartnerCalendar(val); setAttemptId(null); setError(null); }}
              className={`py-2.5 rounded-xl border text-xs font-medium transition-all ${partnerCalendar === val ? "bg-[#1F3D34] text-white border-[#1F3D34]" : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"}`}>
              {label}
            </button>
          ))}
        </div>
        {partnerConv && !partnerConv.ok && (
          <p className="mt-2 text-[11.5px] text-[#C0392B] leading-relaxed">{partnerConv.error}</p>
        )}
        {partnerConv?.ok && (
          <p className="mt-2 text-[11.5px] text-[#41614B] leading-relaxed">
            {partnerCalendar === "solar"
              ? `음력으로는 ${partnerConv.lunar}${partnerConv.isLeap ? " (윤달)" : ""}입니다`
              : `양력으로는 ${partnerConv.solar}입니다 · 이 날짜로 계산합니다`}
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">상대방 태어난 시각 (선택)</label>
        <input type="text" inputMode="numeric" placeholder="HH:MM (예: 14:30)" disabled={partnerNoTime}
          value={partnerTime} maxLength={5}
          onChange={(e) => {
            let v = e.target.value.replace(/[^0-9]/g, "");
            if (v.length > 2) v = v.slice(0, 2) + ":" + v.slice(2);
            setPartnerTime(v.slice(0, 5));
            setAttemptId(null); setError(null);
          }}
          className="w-full border border-[#E5DFD4] rounded-xl px-4 py-3.5 text-sm bg-[#FBF8F2] disabled:opacity-40 focus:outline-none focus:border-[#1F3D34] tracking-widest" />
        <label
          onClick={() => { setPartnerNoTime(!partnerNoTime); setPartnerTime(""); setAttemptId(null); setError(null); }}
          className="flex items-center gap-2.5 mt-2.5 text-sm text-[#6B6661] cursor-pointer select-none">
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${partnerNoTime ? "bg-[#1F3D34] border-[#1F3D34]" : "border-[#E5DFD4] bg-white"}`}>
            {partnerNoTime && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          시각 모름 (시주 제외)
        </label>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B6661] uppercase tracking-wider mb-2">상대방 성별</label>
        <div className="flex gap-2">
          {[["M", "남성 ♂"], ["F", "여성 ♀"]].map(([v, l]) => (
            <button key={v} onClick={() => updateForm({ partner_gender: v })}
              className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${form.partner_gender === v ? "bg-[#1F3D34] text-white border-[#1F3D34]" : "bg-[#FBF8F2] text-[#6B6661] border-[#E5DFD4]"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {error && <PremiumErrorBanner error={error} />}

      {attemptId && (
        <div className="pt-2">
          <button onClick={() => submit(true)}
            className="w-full bg-[#C8743A] text-white rounded-xl py-4 font-semibold text-base active:scale-[0.97] transition-all shadow-lg shadow-[#C8743A]/25">
            같은 정보로 재생성하기
          </button>
        </div>
      )}
    </div>

      {/* 첫 번째 사람(A) 확정 — 체크를 풀면 친구·부모님처럼 나와 무관한 두 사람의
          궁합도 볼 수 있다. 예전 custom_person_a 체크박스를 대체하며, 그때는 못 받던
          태어난 시각까지 반영된다. */}
      {!attemptId && (
        <SajuInputForm
          saved={saved}
          busy={false}
          confirmMode
          onSubmit={(v) => { if (canSubmit) submit(false, v); }}
          submitLabel="이 사주로 궁합 보기"
        />
      )}
    </>
  );
}
