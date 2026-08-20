"use client";

import { useEffect, useRef, useState } from "react";
import { WAITING_CARDS, type WaitingCard } from "@/lib/waiting-cards";

const EXPOSURE_MS = 5000;
const FADE_MS = 250;

function shuffled(cards: WaitingCard[]): WaitingCard[] {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 비복원 셔플: 전체 카드를 섞어 순서대로 다 보여준 뒤에만 재셔플한다.
 * 재셔플 시 직전에 본 카드가 다음 바퀴 첫 장으로 바로 나오지 않게 조정한다.
 */
function useShuffleBag() {
  const bagRef = useRef<WaitingCard[]>(shuffled(WAITING_CARDS));
  const posRef = useRef(0);

  function next(): WaitingCard {
    if (posRef.current >= bagRef.current.length) {
      const last = bagRef.current[bagRef.current.length - 1];
      let fresh = shuffled(WAITING_CARDS);
      if (fresh[0] === last) {
        const swapAt = 1 + Math.floor(Math.random() * (fresh.length - 1));
        [fresh[0], fresh[swapAt]] = [fresh[swapAt], fresh[0]];
      }
      bagRef.current = fresh;
      posRef.current = 0;
    }
    return bagRef.current[posRef.current++];
  }

  return next;
}

export function WaitingCards() {
  const next = useShuffleBag();
  const [card, setCard] = useState<WaitingCard>(() => next());
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCard(next());
        setVisible(true);
      }, FADE_MS);
    }, EXPOSURE_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full max-w-sm bg-[#FBF8F2] border border-[#E5DFD4] rounded-2xl px-4 py-3.5">
      <div
        className="transition-opacity ease-in-out"
        style={{ transitionDuration: `${FADE_MS}ms`, opacity: visible ? 1 : 0 }}
      >
        <p className="text-xs font-semibold text-[#1F3D34] mb-1">{card.title}</p>
        <p className="text-xs text-[#6B6661] leading-relaxed">{card.body}</p>
      </div>
    </div>
  );
}
