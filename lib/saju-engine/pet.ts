// 반려동물 ↔ 주인 궁합 — 사람 둘의 일주 중심 궁합(pairAnalysis)과 달리,
// 주인의 완전한 사주와 반려동물의 띠(년지)·오행을 상호작용시킨다.
//
// 반려동물 입력: 년(필수) + 월(필수, 모르면 대표월 6월) + 일(선택).
// 일을 알면 동물의 일주까지 세워 정밀도가 오르고, 모르면 년·월주 기준으로 본다.
// 입춘 경계 탓에 양력 1~2월 초 출생은 월이 없으면 띠가 어긋날 수 있어 월을 필수로 받는다.

import { buildChart } from "./engine";
import type { SajuChart } from "./engine";
import type { Element } from "./constants";
import * as C from "./constants";

/** 월을 모를 때 쓰는 대표 월. 입춘을 한참 지나 띠가 확실하고 연중 중앙이라 안전하다. */
export const PET_DEFAULT_MONTH = 6;

export type PetSpecies = "dog" | "cat";

/**
 * 종별 행동 심리 — 동물행동학 연구에서 확인된 내용만 담는다.
 * 사주 해석에 이 결을 얹어 강아지는 강아지답게, 고양이는 고양이답게 서술하기 위한 근거.
 */
export const SPECIES_PSYCHOLOGY: Record<
  PetSpecies,
  { label: string; call: string; traits: string[]; loveSigns: string[] }
> = {
  dog: {
    label: "강아지",
    call: "강아지",
    traits: [
      "주인을 '안전기지(secure base)'로 삼는다. 주인이 곁에 있을 때 낯선 과제에 더 오래 도전하고, 낯선 사람이 있을 때는 같은 효과가 나타나지 않는다 — 주인에게만 해당하는 반응이다.",
      "낯설거나 애매한 상황을 만나면 주인의 표정과 목소리를 살펴 자기 행동을 정한다(사회적 참조). 연구에서 대다수의 개가 낯선 물체를 본 뒤 주인을 돌아보았다.",
      "주인과 눈을 맞추는 동안 서로에게서 옥시토신이 오른다. 사람의 아기가 부모와 맺는 유대와 비슷한 회로다.",
      "무리 생활의 결이 남아 있어 함께 걷고 함께 활동하는 데서 안정을 얻는다.",
    ],
    loveSigns: [
      "현관에서 온몸으로 반기는 것",
      "낯선 곳에서 주인을 돌아보는 것",
      "곁에 붙어 앉거나 발치에서 잠드는 것",
      "주인이 가는 방향을 먼저 살피는 것",
    ],
  },
  cat: {
    label: "고양이",
    call: "고양이",
    traits: [
      "흔한 오해와 달리 고양이도 주인에게 안정 애착을 형성한다. 연구에서 약 3분의 2가 안정 애착을 보였고, 이는 사람 아기에게서 나타나는 비율과 비슷하다.",
      "천천히 눈을 감았다 뜨는 '슬로우 블링크'는 애정과 신뢰의 신호다. 눈을 감는 것은 스스로 무방비 상태가 되는 일이라, 안전하다고 느끼는 상대에게만 보인다. 주인이 같은 방식으로 답하면 유대가 깊어진다.",
      "골골 소리를 내거나 머리를 비비는 것은 곁에 있는 것이 편안하다는 표현이다. 스스로 무릎에 올라오거나 머리를 비빌 때 유대 호르몬 반응이 가장 크게 나타난다.",
      "영역 동물이라 자기 공간이 안전하게 지켜지는 것을 중요하게 여긴다. 높은 곳이나 사방이 둘러싸인 자리를 편안해하는데, 주변을 살피기 좋고 몸을 숨길 수 있기 때문이다.",
      "애정 표현이 개처럼 요란하지 않고, 같은 공간에 머무르거나 조용히 곁을 지키는 방식으로 나타난다.",
    ],
    loveSigns: [
      "천천히 눈을 감았다 뜨는 슬로우 블링크",
      "머리나 몸을 비비는 것",
      "곁에서 골골 소리를 내는 것",
      "같은 방에 조용히 머무르는 것",
      "배를 보이며 눕는 것",
    ],
  },
};

/** 오행 흐름 → "반려동물이 주인을 어떻게 느끼는지"의 방향 힌트. 전부 긍정 프레임. */
export const PET_FLOW_HINT: Record<PetFlow, string> = {
  owner_generates_pet:
    "주인이 아이에게 기운을 내어 주는 관계입니다. 아이는 주인을 든든한 보호자이자 부모처럼 여기며, 품 안에서 조건 없이 사랑받고 있다고 느낍니다.",
  pet_generates_owner:
    "아이가 주인에게 기운을 북돋워 주는 관계입니다. 아이는 주인을 지켜 주고 싶은 소중한 사람으로 여기며, 곁에서 힘이 되어 주는 작은 수호천사 같은 마음을 품습니다.",
  same:
    "주인과 아이가 같은 결의 기운을 지닌 닮은꼴입니다. 말하지 않아도 통하는 단짝처럼, 아이는 주인을 세상에서 가장 편한 짝꿍으로 여깁니다.",
  owner_controls_pet:
    "주인이 아이를 부드럽게 이끄는 관계입니다. 아이는 주인을 믿고 따르는 든든한 대장으로 여기며, 곁에 있으면 안심하는 순한 마음을 보입니다.",
  pet_controls_owner:
    "아이가 애교로 주인의 마음을 쥐락펴락하는 관계입니다. 아이는 주인을 자기만의 다정한 집사처럼 여기며, 사랑스러운 투정과 응석으로 주인을 꼼짝 못 하게 만듭니다.",
  neutral:
    "주인과 아이가 서로의 공간을 존중하는 편안한 관계입니다. 아이는 주인을 각자의 결을 지켜 주는 성숙하고 다정한 동반자로 여깁니다.",
};

/**
 * 오행별 개운 요소 — 색·방향은 오방색 기준(수=검정, 목=청록).
 * 장소·활동은 종에 따라 다르다. 고양이는 영역 동물이라 바깥 나들이보다
 * 집 안 환경을 그 기운에 맞게 꾸미는 쪽이 실제 생활에 맞다.
 */
export const ELEMENT_LIFESTYLE: Record<
  Element,
  {
    color: string;
    direction: string;
    dog: { place: string; activity: string };
    cat: { place: string; activity: string };
  }
> = {
  木: {
    color: "초록·청록 계열",
    direction: "동쪽",
    dog: {
      place: "나무와 풀이 우거진 공원, 수목원, 숲길",
      activity: "새로 난 길을 따라 산책하며 흙과 풀 냄새를 마음껏 맡게 해 주는 것",
    },
    cat: {
      place: "창가에 초록 화분을 둔 자리, 캣그라스가 있는 공간",
      activity: "고양이가 안전한 식물을 곁에 두고 바깥 나무를 내다보게 해 주는 것",
    },
  },
  火: {
    color: "붉은색·주황·분홍 계열",
    direction: "남쪽",
    dog: {
      place: "볕이 잘 드는 잔디밭, 사람 구경이 즐거운 공원이나 광장",
      activity: "햇살 아래 뛰어놀거나 다른 사람·강아지와 인사를 나누는 활기찬 나들이",
    },
    cat: {
      place: "햇볕이 길게 드는 창가, 사람과 바깥이 잘 보이는 높은 자리",
      activity: "볕을 쬐며 창밖 구경을 하게 해 주고, 활기차게 사냥놀이를 함께하는 것",
    },
  },
  土: {
    color: "노랑·베이지·황토 계열",
    direction: "중앙(집 안의 가장 아늑한 자리)",
    dog: {
      place: "흙길이 있는 둘레길, 너른 마당, 익숙하고 아늑한 집 안의 자리",
      activity: "같은 시간에 같은 길을 걷는 규칙적인 산책과 느긋한 낮잠",
    },
    cat: {
      place: "집 한가운데의 아늑하고 폭신한 자리, 사방이 감싸인 숨숨집",
      activity: "밥·물·화장실 자리를 일정하게 지켜 주고 규칙적인 리듬으로 지내는 것",
    },
  },
  金: {
    color: "흰색·은색·회색 계열",
    direction: "서쪽",
    dog: {
      place: "탁 트인 강변길, 깔끔하게 정돈된 산책로, 바람이 시원한 언덕",
      activity: "정해진 코스를 또렷하게 완주하는 산책과 규칙이 있는 놀이",
    },
    cat: {
      place: "깔끔하게 정돈된 캣타워 꼭대기, 시야가 탁 트인 높은 선반",
      activity: "정해진 시간에 규칙적으로 놀아 주고, 자리를 늘 청결하게 유지해 주는 것",
    },
  },
  水: {
    color: "검정·짙은 남색 계열",
    direction: "북쪽",
    dog: {
      place: "시원한 물가, 호숫가나 계곡, 바다가 보이는 길",
      activity: "물놀이를 하거나 물소리를 들으며 함께 쉬는 조용한 시간",
    },
    cat: {
      place: "조용하고 서늘한 구석 자리, 물 흐르는 정수기가 놓인 공간",
      activity: "흐르는 물을 마시게 해 주고, 방해받지 않는 혼자만의 휴식을 지켜 주는 것",
    },
  },
};

/** 띠(지지) 관계 → 궁합 뉘앙스 힌트. 충·해도 긍정 프레임. */
export const PET_BRANCH_HINT: Record<PetBranchRelation, string> = {
  육합: "두 사람의 띠가 서로 손을 맞잡는 육합(六合)을 이뤄, 정서적으로 착 붙는 각별한 케미입니다.",
  삼합: "두 사람의 띠가 한 팀을 이루는 삼합(三合)에 들어, 함께 있을수록 시너지가 커지는 잘 맞는 짝입니다.",
  충: "두 사람의 띠가 서로를 자극하는 충(沖)이지만, 티격태격하면서도 미워할 수 없는 활기찬 케미로 나타납니다.",
  해: "두 사람의 띠가 은근히 신경 쓰이는 해(害)의 결이지만, 그만큼 서로를 더 살뜰히 챙기게 되는 사이입니다.",
  평범: "두 사람의 띠는 특별한 합충 없이 무난해, 담백하고 오래가는 편안한 관계입니다.",
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export type PetBranchRelation = "육합" | "삼합" | "충" | "해" | "평범";

/** 주인과 반려동물의 오행 흐름 — "반려동물이 주인을 어떻게 느끼는지"의 근거가 된다. */
export type PetFlow =
  | "owner_generates_pet" // 주인이 동물을 생(生) — 보살핌을 받는 아이. 주인을 보호자·부모처럼
  | "pet_generates_owner" // 동물이 주인을 생 — 기운을 북돋는 아이. 주인을 지켜 주고픈 사람처럼
  | "same"                // 같은 오행 — 닮은꼴 단짝
  | "owner_controls_pet"  // 주인이 동물을 극(克) — 잘 이끄는 관계. 믿고 따르는 대장처럼
  | "pet_controls_owner"  // 동물이 주인을 극 — 애교로 이기는 상전. 내 손안의 집사처럼
  | "neutral";            // 상생·상극 아님 — 편안히 존중하는 사이

export interface PetCompatInput {
  species: PetSpecies;
  petYear: number;
  petMonth: number;
  petDay?: number | null;
  petName?: string;
}

export interface PetCompatFacts {
  species: PetSpecies;
  speciesInfo: (typeof SPECIES_PSYCHOLOGY)[PetSpecies];
  pet: {
    zodiac: string;         // 띠 (년지 한글)
    yearGanji: string;      // 년주 (예: "壬寅")
    monthGanji: string;
    dayGanji: string | null;
    element: string;        // 대표 오행 한글
    hasDay: boolean;
  };
  owner: {
    dayMaster: string;      // 예: "戊(무)"
    element: string;        // 일간 오행 한글
    strength: string;       // 신강/신약 등
  };
  relation: {
    branch: PetBranchRelation;
    flow: PetFlow;
    yongsinFill: string[];  // 동물이 채워 주는 주인의 용신 오행(한글)
  };
  /** 개운 제안 근거 — 주인에게 필요한 기운 / 아이의 타고난 기운. 장소·활동은 종에 맞춰 선택됨 */
  lifestyle: {
    ownerElement: string;   // 주인에게 필요한 오행(한글) — 용신 우선, 없으면 일간 오행
    petElement: string;     // 아이의 대표 오행(한글)
    owner: { place: string; activity: string; color: string; direction: string };
    pet: { place: string; activity: string; color: string; direction: string };
    shared: boolean;        // 둘의 개운 오행이 같은가
  };
}

/** 오행 + 종 → 개운 제안 한 벌 */
function lifestyleOf(el: Element, species: PetSpecies) {
  const base = ELEMENT_LIFESTYLE[el];
  const bySpecies = species === "cat" ? base.cat : base.dog;
  return {
    place: bySpecies.place,
    activity: bySpecies.activity,
    color: base.color,
    direction: base.direction,
  };
}

export function petCompatibility(owner: SajuChart, input: PetCompatInput): PetCompatFacts {
  const { petYear, petMonth } = input;
  const hasDay = input.petDay != null;
  const day = input.petDay ?? 15;
  const iso = `${petYear}-${pad(petMonth)}-${pad(day)}T12:00:00`;
  const pet = buildChart(iso, "M", false);

  // 동물의 대표 지지·오행: 일을 알면 일주 기준, 모르면 띠(년주) 기준.
  const petBranch = hasDay ? pet.pillars.day.branch : pet.pillars.year.branch;
  const petEl: Element = hasDay
    ? pet.day_master_element
    : C.STEM_ELEMENT[pet.pillars.year.stem];

  const ownerBranch = owner.pillars.day.branch;
  const ownerEl = owner.day_master_element;

  // 1) 지지 관계
  let branch: PetBranchRelation = "평범";
  const key = C.branchPairKey(ownerBranch, petBranch);
  if (
    C.BRANCH_SIX_COMBINE.has(ownerBranch + petBranch) ||
    C.BRANCH_SIX_COMBINE.has(petBranch + ownerBranch)
  ) {
    branch = "육합";
  } else if (
    C.BRANCH_THREE_COMBINE.some(
      (t) => t.trio.includes(ownerBranch) && t.trio.includes(petBranch)
    )
  ) {
    branch = "삼합";
  } else if (C.BRANCH_CLASH_PAIRS.has(key)) {
    branch = "충";
  } else if (C.BRANCH_HARM_PAIRS.has(key)) {
    branch = "해";
  }

  // 2) 오행 흐름
  let flow: PetFlow;
  if (ownerEl === petEl) flow = "same";
  else if (C.GENERATES[ownerEl] === petEl) flow = "owner_generates_pet";
  else if (C.GENERATES[petEl] === ownerEl) flow = "pet_generates_owner";
  else if (C.CONTROLS[ownerEl] === petEl) flow = "owner_controls_pet";
  else if (C.CONTROLS[petEl] === ownerEl) flow = "pet_controls_owner";
  else flow = "neutral";

  // 3) 동물이 주인의 용신 오행을 채워 주는가
  const yong = new Set<Element>([
    ...owner.yongsin.eokbu_candidates,
    ...owner.yongsin.johu_candidates,
  ]);
  const petEls = new Set<Element>([
    C.STEM_ELEMENT[pet.pillars.year.stem],
    C.BRANCH_ELEMENT[pet.pillars.year.branch],
    C.STEM_ELEMENT[pet.pillars.month.stem],
    C.BRANCH_ELEMENT[pet.pillars.month.branch],
  ]);
  if (hasDay) {
    petEls.add(C.STEM_ELEMENT[pet.pillars.day.stem]);
    petEls.add(C.BRANCH_ELEMENT[pet.pillars.day.branch]);
  }
  const yongsinFill = [...petEls]
    .filter((e) => yong.has(e))
    .map((e) => C.ELEMENT_KR[e]);

  // 개운 제안: 주인은 필요한 기운(용신 우선), 아이는 타고난 기운을 살리는 쪽으로.
  const ownerNeed: Element = owner.yongsin.eokbu_candidates[0]
    ?? owner.yongsin.johu_candidates[0]
    ?? ownerEl;

  return {
    species: input.species,
    speciesInfo: SPECIES_PSYCHOLOGY[input.species],
    pet: {
      zodiac: C.BRANCH_KR[pet.pillars.year.branch],
      yearGanji: pet.pillars.year.stem + pet.pillars.year.branch,
      monthGanji: pet.pillars.month.stem + pet.pillars.month.branch,
      dayGanji: hasDay ? pet.pillars.day.stem + pet.pillars.day.branch : null,
      element: C.ELEMENT_KR[petEl],
      hasDay,
    },
    owner: {
      dayMaster: `${owner.day_master}(${C.STEM_KR[owner.day_master]})`,
      element: C.ELEMENT_KR[ownerEl],
      strength: owner.strength.verdict,
    },
    relation: { branch, flow, yongsinFill },
    lifestyle: {
      ownerElement: C.ELEMENT_KR[ownerNeed],
      petElement: C.ELEMENT_KR[petEl],
      owner: lifestyleOf(ownerNeed, input.species),
      pet: lifestyleOf(petEl, input.species),
      shared: ownerNeed === petEl,
    },
  };
}
