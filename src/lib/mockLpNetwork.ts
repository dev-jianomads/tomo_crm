/**
 * TOMO LP Network — mock mandate data (Phase 1).
 * Separate from GP CRM `Relationship` in mockData.ts.
 * GPs see anonymized cards only; no names, emails, or institutions on these records.
 */

export const LP_NETWORK_MANDATE_COUNT = 50;

export type FitScore = "High" | "Medium" | "Low";

export type DeploymentStatus =
  | "Actively deploying"
  | "Selectively deploying"
  | "Paused"
  | "Re-up only";

export type ManagerStagePreference =
  | "Emerging <$500M AUM"
  | "Established $500M–$5B"
  | "Large $5B+"
  | "All";

/** Matches mandate-form check buckets (execution plan). */
export type CheckSizeBand = "$1–5M" | "$5–25M" | "$25–100M" | "$100M+";

export const STRATEGY_TAGS_POOL = [
  "HF Long/Short",
  "Global Macro",
  "Quant",
  "PE Buyout",
  "PE Growth",
  "VC",
  "Private Credit",
  "Real Assets",
  "Multi-Strategy",
] as const;

export const CHECK_SIZE_OPTIONS: CheckSizeBand[] = ["$1–5M", "$5–25M", "$25–100M", "$100M+"];

export const DEPLOYMENT_OPTIONS: DeploymentStatus[] = [
  "Actively deploying",
  "Selectively deploying",
  "Paused",
  "Re-up only",
];

export const MANAGER_STAGE_OPTIONS: ManagerStagePreference[] = [
  "Emerging <$500M AUM",
  "Established $500M–$5B",
  "Large $5B+",
  "All",
];

export const LP_GEOGRAPHY_OPTIONS = ["North America", "EMEA", "APAC", "Global", "LATAM"] as const;

export type IntroductionStatus =
  | "eligible"
  | "gp_requested"
  | "lp_pending"
  | "lp_approved"
  | "connected";

export type NetworkLpMandate = {
  id: string;
  /** GP-safe label — no PII */
  displayLabel: string;
  strategyTags: string[];
  checkSizeBand: CheckSizeBand;
  deploymentStatus: DeploymentStatus;
  geographyLabel: string;
  managerStagePreference: ManagerStagePreference;
  hardConstraints: string;
  fitScore: FitScore;
  /** “What makes an introduction worth your time?” — truncate in cards */
  introWorthTime: string;
  /**
   * Funds this mandate can be matched to in the mock. Empty = all workspace funds.
   */
  eligibleFundIds: string[];
};

export type IntroductionThread = {
  mandateId: string;
  fundId: string;
  status: IntroductionStatus;
  updatedAt: string;
};

const GEO_LABELS = ["North America", "EMEA", "APAC", "Global", "LATAM"] as const;

const CONSTRAINT_SNIPPETS = [
  "No crypto or token strategies.",
  "No first-time managers; track record required.",
  "ESG screen mandatory for sleeve.",
  "No emerging markets single-country funds.",
  "Illiquidity max ~7 years.",
  "No activist / hostile positions.",
  "Prefer UCITS or 40-Act where possible.",
] as const;

const WORTH_TIME_SNIPPETS = [
  "Only if strategy and cheque fit our IC rhythm — no general market updates.",
  "Worth it when the manager has a clear edge and capacity at our size.",
  "Happy to meet if diligence pack is tight and references are available.",
  "Introduce when you have seen the book and can vouch for alignment.",
  "Time if it fills a gap in our alt sleeve — we are not touring broadly.",
] as const;

const DEFAULT_FUND_IDS = ["fund-1", "fund-2", "fund-3"] as const;

/** Deterministic PRNG (mulberry32) for stable demo data across reloads and CI. */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function pickSubset<T>(rng: () => number, arr: readonly T[], min: number, max: number): T[] {
  const n = min + Math.floor(rng() * (max - min + 1));
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0]!);
  }
  return out;
}

function buildDisplayLabel(geo: string, tags: string[]): string {
  const primary = tags[0] ?? "Multi-Strategy";
  return `Allocator — ${geo} — ${primary}`;
}

function eligibleFundsForMandate(rng: () => number): string[] {
  const r = rng();
  if (r < 0.35) return [pick(rng, DEFAULT_FUND_IDS)];
  if (r < 0.55) {
    const a = pick(rng, DEFAULT_FUND_IDS);
    let b = pick(rng, DEFAULT_FUND_IDS);
    if (b === a) b = DEFAULT_FUND_IDS[(DEFAULT_FUND_IDS.indexOf(a) + 1) % DEFAULT_FUND_IDS.length];
    return [a, b].sort();
  }
  return [];
}

function generateMandates(rng: () => number): NetworkLpMandate[] {
  const mandates: NetworkLpMandate[] = [];

  for (let i = 0; i < LP_NETWORK_MANDATE_COUNT; i++) {
    let fitScore: FitScore;
    let deploymentStatus: DeploymentStatus;

    if (i < 15) {
      fitScore = "High";
      deploymentStatus = "Actively deploying";
    } else if (i < 35) {
      const dep = pick(rng, [
        "Selectively deploying",
        "Paused",
        "Re-up only",
        "Actively deploying",
      ] as const);
      const fit = pick(rng, ["Medium", "Low", "Medium", "High"] as const);
      if (fit === "High" && dep === "Actively deploying") {
        fitScore = pick(rng, ["Medium", "Low"] as const);
        deploymentStatus = dep;
      } else {
        fitScore = fit;
        deploymentStatus = dep;
      }
    } else {
      fitScore = pick(rng, ["High", "Medium", "Low"] as const);
      deploymentStatus = pick(rng, [
        "Actively deploying",
        "Selectively deploying",
        "Paused",
        "Re-up only",
      ] as const);
    }

    const geo = pick(rng, GEO_LABELS);
    const tags = pickSubset(rng, STRATEGY_TAGS_POOL, 1, 4);
    const checkSizeBand = pick(rng, [
      "$1–5M",
      "$5–25M",
      "$25–100M",
      "$100M+",
    ] as const satisfies readonly CheckSizeBand[]);

    mandates.push({
      id: `lp-net-${String(i + 1).padStart(3, "0")}`,
      displayLabel: buildDisplayLabel(geo, tags),
      strategyTags: [...tags],
      checkSizeBand,
      deploymentStatus,
      geographyLabel: geo,
      managerStagePreference: pick(rng, [
        "Emerging <$500M AUM",
        "Established $500M–$5B",
        "Large $5B+",
        "All",
      ] as const),
      hardConstraints: pick(rng, CONSTRAINT_SNIPPETS),
      fitScore,
      introWorthTime: pick(rng, WORTH_TIME_SNIPPETS),
      eligibleFundIds: eligibleFundsForMandate(rng),
    });
  }

  return mandates;
}

const SEED = 0x4c50_4e45; // 'LPNE'

/** All mock LP network mandates (~50), deterministic. */
export const lpNetworkMandates: NetworkLpMandate[] = generateMandates(mulberry32(SEED));

/** Initial intro threads (empty until Phase 4 persists requests). */
export const lpNetworkIntroductionThreads: IntroductionThread[] = [];

function fundMatchesMandate(fundId: string, m: NetworkLpMandate): boolean {
  if (m.eligibleFundIds.length === 0) return true;
  return m.eligibleFundIds.includes(fundId);
}

/** High fit + actively deploying + optional fund gate (empty eligibleFundIds = all funds). */
export function isQualifiedMandate(m: NetworkLpMandate, fundId: string): boolean {
  return m.fitScore === "High" && m.deploymentStatus === "Actively deploying" && fundMatchesMandate(fundId, m);
}

export function getQualifiedMandatesForFund(fundId: string): NetworkLpMandate[] {
  return lpNetworkMandates.filter((m) => isQualifiedMandate(m, fundId));
}

export function getMandatesForFund(fundId: string): NetworkLpMandate[] {
  return lpNetworkMandates.filter((m) => fundMatchesMandate(fundId, m));
}

export function countQualifiedForFund(fundId: string): number {
  return getQualifiedMandatesForFund(fundId).length;
}

/** Stable row for LP-side mandate demo (`/lp-network/mandate`). */
export const DEMO_LP_MANDATE_ID = "lp-net-001";

export function getMandateById(id: string): NetworkLpMandate | undefined {
  return lpNetworkMandates.find((m) => m.id === id);
}
