// ──────────────────────────────────────────────
// canonical saju_json schema v1
// All character AI and reports consume this type.
// Engine produces it once; never recalculate mid-session.
// ──────────────────────────────────────────────

export interface SajuPillar {
  stem: string; // 천간
  branch: string; // 지지
}

export interface SajuPillars {
  year: SajuPillar;
  month: SajuPillar;
  day: SajuPillar;
  hour: SajuPillar | null; // null = 시간 모름
}

export interface CoreTag {
  tag: string;
  label: string;
  why: string;
}

export interface LuckCycle {
  start_age: number;
  end_age: number;
  ganji: string;
  favorability: "우호" | "중립" | "불리";
}

export interface SajuIdentity {
  day_master: string;
  day_master_element: "木" | "火" | "土" | "金" | "水";
  core_description: string;
  strength_level: -3 | -2 | -1 | 0 | 1 | 2 | 3;
  strength_label: "극신약" | "신약" | "약" | "중화" | "강" | "신강" | "극신강";
  archetype?: string;
  growth_direction?: string;
}

export interface SajuPersonality {
  independence: number; // 0-100
  sensitivity: number;
  sociality: number;
  competitiveness: number;
  consistency: number;
  adaptability?: number;
  emotional_stability?: number;
  strengths: string[];
  weaknesses: string[];
}

export interface SajuCareer {
  score: number; // 0-100
  recommended_fields: string[];
  work_style: string[];
  leadership?: number;
  entrepreneurship?: number;
  risk_factors: string[];
  growth_strategy?: string[];
}

export interface SajuLove {
  score: number;
  attachment_style?: string;
  communication_style?: string;
  relationship_strengths: string[];
  relationship_risks: string[];
  ideal_partner_traits?: string[];
}

export interface SajuMoney {
  score: number;
  earning_power: number;
  saving_power: number;
  investment_tendency?: string;
  wealth_pattern: string;
  financial_risks?: string[];
}

export interface SajuHealth {
  score: number;
  stress_vulnerability?: number;
  energy_level?: number;
  watch_list: string[];
  lifestyle_recommendations?: string[];
}

export interface SajuLifePatterns {
  repeating_themes: string[];
  recurring_challenges?: string[];
  major_life_lessons: string[];
  hidden_strengths?: string[];
}

export interface SajuCurrentPhase {
  age_range: string;
  theme: string;
  opportunities: string[];
  warnings: string[];
  recommended_focus?: string[];
}

export interface SajuYongsin {
  eokbu: string[]; // 억부 용신
  johu: string[]; // 조후 용신
  climate: string;
}

// Layer B — AI-Friendly Canonical Profile
export interface SajuJson {
  schema_version: number;
  identity: SajuIdentity;
  pillars: SajuPillars;
  elements: Record<"木" | "火" | "土" | "金" | "水", number>;
  ten_god_summary: Record<string, number>; // % 분포
  core_tags: CoreTag[];
  personality: SajuPersonality;
  career: SajuCareer;
  love: SajuLove;
  money: SajuMoney;
  health: SajuHealth;
  life_patterns: SajuLifePatterns;
  current_phase: SajuCurrentPhase;
  luck_cycles: LuckCycle[];
  yongsin: SajuYongsin;
}

// Compact version for chat context (200-400 tokens)
export interface SajuCompact {
  day_master: string;
  strength: string;
  core_tags: string[];
  top_strengths: string[];
  top_weaknesses: string[];
  current_phase: string;
}

export interface CompatibilityResult {
  context: "romance" | "work" | "friend";
  score: number;
  highlights: string[];
  cautions: string[];
  my_compact: SajuCompact;
  other_compact: SajuCompact;
}

// Character memory schema
export interface MemoryCategory {
  facts: string[];
  concerns: string[];
  goals: string[];
}

export interface GoodNews {
  what: string;      // "로또 5만원 당첨"
  date: string;      // ISO date
  shared_by: string; // 처음 들은 캐릭터 id
}

export interface UserMemory {
  career: MemoryCategory;
  love: MemoryCategory;
  family: MemoryCategory;
  finance: MemoryCategory;
  personality: { traits: string[] };
  people?: Array<{
    name: string;
    relation: string;
    summary: string;
    compatibility_score?: number;
  }>;
  events?: Array<{
    date: string;
    what: string;
    tags: string[];
  }>;
  good_news?: GoodNews[];
}
