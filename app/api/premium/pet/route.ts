import { NextRequest, NextResponse } from "next/server";
import { parseTargetBody, resolveTarget, isoOf } from "@/lib/billing/report-target";
import { requireUser } from "@/lib/premium/require-user";
import { beginAttempt, abortAttempt, acquirePass, runGeneration, failAttempt } from "@/lib/premium/pipeline";
import { findCached, saveReport, deleteById, deleteByTarget } from "@/lib/premium/report-store";
import { buildChart, petCompatibility, PET_DEFAULT_MONTH, PET_FLOW_HINT, PET_BRANCH_HINT } from "@/lib/saju-engine";
import type { PetSpecies } from "@/lib/saju-engine";
import { generatePetReport } from "@/lib/premium/pet-generate";
import { kstYear } from "@/lib/time/kst";

// 펫 리포트 생성이 병렬 5콜로 나뉘어 있어도(lib/premium/pet-generate.ts 참고)
// 전체 요청 처리 시간은 Vercel Hobby 플랜의 60초 제한 안에 들어와야 한다.
export const maxDuration = 60;

const PRODUCT_ID = "pet_one";

// POST /api/premium/pet — 로그인+프리미엄 필수. 등록된 주인 사주 × 반려동물 궁합.
// body에 attemptId가 있으면 "같은 정보로 재생성" 요청으로 보고, 최초 시도 때 저장해 둔
// 입력값을 그대로 재사용한다.
export async function POST(req: NextRequest) {
  const user = await requireUser("/premium/pet");
  if (!user.ok) return user.response;
  const userId = user.userId;

  const body = await req.json();
  const attemptId = typeof body.attemptId === "string" ? body.attemptId : undefined;

  const began = await beginAttempt(userId, PRODUCT_ID, attemptId, body);
  if (!began.ok) return began.response;
  const { attempt } = began;
  const input = attempt.input;

  // 집사 사주는 화면에서 확정해 보낸다(생성 직전 컨펌). 예전처럼 "마지막에 등록한
  // 본인 사주"를 말없이 쓰지 않는다 — 가족 사주로 볼 방법이 없던 원인이었다.
  const parsedTarget = parseTargetBody(input);
  if (!parsedTarget.ok) {
    return abortAttempt(attempt, NextResponse.json({ error: parsedTarget.error }, { status: 400 }));
  }
  const target = parsedTarget.input;
  const { ownProfile, isAdhoc } = await resolveTarget(userId, target);

  const species: PetSpecies = input.species === "cat" ? "cat" : "dog";
  const petYear = parseInt(String(input.petYear));
  const petMonth = parseInt(String(input.petMonth)) || PET_DEFAULT_MONTH;
  const petDay = input.petDay ? parseInt(String(input.petDay)) : null;
  const petName = String(input.petName ?? "").slice(0, 20).trim() || "아이";
  if (!petYear || petYear < 1980 || petYear > kstYear()) {
    return abortAttempt(attempt, NextResponse.json({ error: "반려동물 출생 연도를 확인해주세요." }, { status: 400 }));
  }

  let facts;
  let owner: ReturnType<typeof buildChart>;
  try {
    owner = buildChart(isoOf(target), target.gender, !!target.birthTime);
    facts = petCompatibility(owner, { species, petYear, petMonth, petDay, petName });
  } catch (e) {
    console.error("premium pet engine error:", e);
    return failAttempt(attempt, null, "사주 계산 오류",
      NextResponse.json({ error: "사주 계산 오류", attemptId: attempt.attemptId }, { status: 500 }));
  }

  // 같은 아이·같은 조건이면 재생성하지 않는다. 캐시 키의 pet_day는 0이 '모름'.
  // 집사 사주가 다르면 같은 아이라도 다른 리포트이므로 variant에 함께 넣는다.
  const variant = [species, petName, petYear, petMonth, petDay ?? 0].join("|");
  const key = { userId, productId: PRODUCT_ID, target, ownProfile, isAdhoc, variant };

  // 캐시가 있으면 이용권 없이 재열람(미사용 이용권이 있으면 건너뛰고 새로 생성 — 프로모션 이용권 사용).
  const cached = await findCached<string>(key);
  if (cached) {
    return abortAttempt(attempt, NextResponse.json({
      report: cached.content, pet: facts.pet, petName, cached: true, ...(cached.adhoc ? { adhoc: true } : {}),
    }));
  }

  // 구독자 또는 990원 단건 이용권 보유자만 통과(원자적 선점).
  const pass = await acquirePass(userId, PRODUCT_ID, attempt);
  if (!pass.ok) return pass.response;

  return runGeneration({
    label: "pet",
    attempt,
    passId: pass.passId,
    run: async () => {
      const report = await generatePetReport(facts, petName, PET_BRANCH_HINT, PET_FLOW_HINT, owner);
      await saveReport(key, report, { species, pet_name: petName, pet_year: petYear, pet_month: petMonth, pet_day: petDay });
      return report;
    },
    ok: (report) => NextResponse.json({ report, pet: facts.pet, petName, cached: false }),
  });
}

// DELETE /api/premium/pet — 로그인 필수. 사용자가 특정 반려동물의 궁합 결과를 직접 삭제.
export async function DELETE(req: NextRequest) {
  const user = await requireUser("/premium/pet");
  if (!user.ok) return NextResponse.json({ error: "login_required" }, { status: 401 });
  const userId = user.userId;

  const body = await req.json().catch(() => ({}));

  // §1(CoS 결정 2026-09-08): /premium/pet/[id](저장된 결과 재열람 전용)는 행의 정확한 PK(id)를 안다.
  // species·이름 등으로 되짚으면 본인 사주를 재등록해 프로필이 바뀐 경우 엉뚱한 행을 건드릴 여지가 있다.
  if (typeof body.id === "string" && body.id) return deleteById(userId, PRODUCT_ID, body.id);

  const species: PetSpecies = body.species === "cat" ? "cat" : "dog";
  const petYear = parseInt(String(body.petYear));
  const petMonth = parseInt(String(body.petMonth)) || PET_DEFAULT_MONTH;
  const petDay = body.petDay ? parseInt(String(body.petDay)) : null;
  const petName = String(body.petName ?? "").slice(0, 20).trim() || "아이";
  if (!petYear) {
    return NextResponse.json({ error: "petYear is required" }, { status: 400 });
  }

  // 대상(집사 사주)을 함께 받는다 — 안 받으면 가족 사주로 만든 리포트를 지우려다 본인 리포트가 지워진다.
  const parsedTarget = parseTargetBody(body);
  return deleteByTarget({
    userId, productId: PRODUCT_ID,
    target: parsedTarget.ok ? parsedTarget.input : null,
    variant: [species, petName, petYear, petMonth, petDay ?? 0].join("|"),
  });
}
