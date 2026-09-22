"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * 결과 요약 카드의 [이미지로 저장] [공유] 버튼 — 상품 공용.
 *
 * CoS 설계(2026-09-19 §C): 결과 최상단 카드를 캡처해 단톡방에 던질 수 있게 한다.
 * - DOM을 그대로 html2canvas로 뜬다(별도 이미지 서버 없음, 이미지는 브라우저 밖으로 나가지 않는다).
 * - 저장·공유 버튼은 광고 게이트 뒤에 두지 않는다.
 * - 공유 링크의 UTM은 GA4 표준값: utm_source=card · utm_medium=referral · utm_campaign={상품}.
 *   (케미가 utm_medium=result를 써서 Unassigned로 빠졌던 것과 같은 실수를 피한다.)
 *
 * 계측: report_card_view(노출) / report_card_save / report_card_share.
 */
const SHARE_ORIGIN = "https://sajugeori.com";

async function renderBlob(el: HTMLElement): Promise<Blob | null> {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: true, logging: false });
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

export function ResultCardActions({
  targetRef,
  itemId,
  campaign,
  landingPath,
  shareTitle,
  shareText,
}: {
  targetRef: RefObject<HTMLElement | null>;
  /** GA4 item_id — report_generated와 같은 값을 쓴다(예: "wuxing") */
  itemId: string;
  /** utm_campaign 값 (예: "ohang") */
  campaign: string;
  /** 공유 링크가 가리킬 공개 페이지 (예: "/free/saju") */
  landingPath: string;
  shareTitle: string;
  shareText: string;
}) {
  const [busy, setBusy] = useState<"save" | "share" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const viewedRef = useRef(false);

  // 카드가 화면에 절반 이상 보이면 노출 1회로 센다.
  useEffect(() => {
    const el = targetRef.current;
    if (!el || viewedRef.current) return;
    if (typeof IntersectionObserver === "undefined") {
      viewedRef.current = true;
      trackEvent("report_card_view", { item_id: itemId });
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (viewedRef.current || !entries.some((e) => e.isIntersecting)) return;
        viewedRef.current = true;
        trackEvent("report_card_view", { item_id: itemId });
        io.disconnect();
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [targetRef, itemId]);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  }

  const shareUrl = `${SHARE_ORIGIN}${landingPath}?utm_source=card&utm_medium=referral&utm_campaign=${encodeURIComponent(campaign)}`;

  async function save() {
    const el = targetRef.current;
    if (!el || busy) return;
    setBusy("save");
    try {
      const blob = await renderBlob(el);
      if (!blob) throw new Error("no blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sajugeori-${campaign}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      trackEvent("report_card_save", { item_id: itemId });
    } catch {
      flash("이미지를 만들지 못했어요. 화면 캡처로 저장해 주세요.");
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    const el = targetRef.current;
    if (!el || busy) return;
    setBusy("share");
    try {
      // 1순위: 이미지 파일 첨부 공유(모바일 대부분). 지원 안 하면 텍스트+링크, 그것도 없으면 링크 복사.
      let file: File | null = null;
      try {
        const blob = await renderBlob(el);
        if (blob) file = new File([blob], `sajugeori-${campaign}.png`, { type: "image/png" });
      } catch {
        /* 이미지 없이 링크만 공유 */
      }

      const native = typeof navigator.share === "function";
      if (native) {
        const withFile = !!file && !!navigator.canShare?.({ files: [file] });
        await navigator.share(
          withFile
            ? { files: [file!], title: shareTitle, text: `${shareText}\n${shareUrl}` }
            : { title: shareTitle, text: shareText, url: shareUrl }
        );
      } else {
        await navigator.clipboard.writeText(shareUrl);
        flash("링크가 복사됐어요.");
      }
      trackEvent("report_card_share", { item_id: itemId, method: native ? "native" : "copy" });
    } catch (e) {
      // 사용자가 공유 시트를 닫은 경우(AbortError)는 실패도 공유도 아니다.
      if (!(e instanceof DOMException && e.name === "AbortError")) flash("공유하지 못했어요. 이미지 저장을 이용해 주세요.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="no-print flex flex-col gap-1.5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy !== null}
          className="flex-1 border border-[#E5DFD4] bg-[#FBF8F2] text-[#1F3D34] rounded-xl py-3 text-sm font-semibold active:scale-[0.97] transition-all disabled:opacity-50"
        >
          {busy === "save" ? "이미지 만드는 중…" : "이미지로 저장"}
        </button>
        <button
          type="button"
          onClick={share}
          disabled={busy !== null}
          className="flex-1 bg-[#1F3D34] text-white rounded-xl py-3 text-sm font-semibold active:scale-[0.97] transition-all disabled:opacity-50"
        >
          {busy === "share" ? "준비 중…" : "공유"}
        </button>
      </div>
      {notice && (
        <p role="status" className="text-center text-[11.5px] text-[#6B6661]">
          {notice}
        </p>
      )}
    </div>
  );
}
