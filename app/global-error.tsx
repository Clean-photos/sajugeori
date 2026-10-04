"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// 최상위 렌더링 오류 — 보고하고 조용한 안내를 보여준다.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body style={{ margin: 0, background: "#F6F1E7", color: "#1A1A18", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>화면을 불러오지 못했어요</p>
          <p style={{ fontSize: 13, color: "#6B6661", margin: 0 }}>잠시 후 다시 시도해주세요. 문제가 계속되면 문의로 알려주세요.</p>
          <button onClick={reset} style={{ marginTop: 8, padding: "10px 20px", borderRadius: 12, border: "none", background: "#1F3D34", color: "#fff", fontSize: 14 }}>
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
