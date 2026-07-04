// Resend API 직접 호출 (SDK 미설치, fetch만 사용).
// RESEND_API_KEY 없으면 콘솔에 로그만 남기고 조용히 스킵(dev 편의).
export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY 미설정 — 발송 스킵:", opts.to, opts.subject);
    return false;
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "사주거리 <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
  });

  if (!res.ok) {
    console.error("[email] 발송 실패:", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}
