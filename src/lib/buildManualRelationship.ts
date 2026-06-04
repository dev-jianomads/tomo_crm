import type {
  Band,
  ConsultantDependent,
  ContactSeniority,
  DecisionTimeline,
  EsgRequired,
  FiscalYearEnd,
  FundSizePreference,
  InvestmentRemit,
  InvestorType,
  LastFundHistory,
  LpLocation,
  MomentumDirection,
  Relationship,
  RelationshipOwner,
  RelationshipTier,
  Source,
  Stage,
  StrategyFit,
  StrategyType,
  TypicalCheckSize,
} from "@/lib/mockData";
import { CONTACT_SENIORITY_OPTIONS, DEFAULT_RELATIONSHIP_FUND_ID } from "@/lib/mockData";

export function deriveBand(daysSince: number, momentum: MomentumDirection): Band {
  if (daysSince >= 45 && momentum === "Cooling") return "Stalled";
  if (momentum === "Heating up") return "Heating Up";
  if (momentum === "Cooling") return "Cooling";
  return "Active-Stable";
}

export type ManualContactStep1 = {
  name: string;
  firm: string;
  primaryEmail: string;
  tier: RelationshipTier;
  stage: Stage;
  relationshipOwner: RelationshipOwner;
};

export type ManualContactStep2 = {
  momentumDirection: MomentumDirection;
  daysSinceLastMeaningfulContact: number;
  investorType: InvestorType;
  strategyFit: StrategyFit;
  strategyType: StrategyType;
  lpLocation: LpLocation;
  investmentRemit: InvestmentRemit;
  typicalCheckSize: TypicalCheckSize;
  fundSizePreference: FundSizePreference;
  source: Source;
  lastFundHistory: LastFundHistory;
  decisionTimeline: DecisionTimeline;
  fiscalYearEnd: FiscalYearEnd;
  consultantDependent: ConsultantDependent;
  esgRequired: EsgRequired;
  contactSeniority: ContactSeniority | "";
  nextMove: string;
  openLoops: number;
};

export function defaultStep2(): ManualContactStep2 {
  return {
    momentumDirection: "Stable",
    daysSinceLastMeaningfulContact: 30,
    investorType: "Family office",
    strategyFit: "Unknown",
    strategyType: "Other",
    lpLocation: "North America",
    investmentRemit: "Global",
    typicalCheckSize: "Unknown",
    fundSizePreference: "Unknown",
    source: "Direct",
    lastFundHistory: "New prospect",
    decisionTimeline: "Unknown",
    fiscalYearEnd: "Unknown",
    consultantDependent: "Unknown",
    esgRequired: "Unknown",
    contactSeniority: "",
    nextMove: "",
    openLoops: 0,
  };
}

export function buildRelationshipFromManualContact(
  step1: ManualContactStep1,
  step2: ManualContactStep2,
  options?: { fundId?: string }
): Relationship {
  const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const days = Math.max(0, Math.floor(step2.daysSinceLastMeaningfulContact));
  const band = deriveBand(days, step2.momentumDirection);
  const loops = Math.max(0, Math.min(99, Math.floor(step2.openLoops)));

  return {
    id,
    name: step1.name.trim(),
    firm: step1.firm.trim(),
    primaryEmail: step1.primaryEmail.trim().toLowerCase(),
    fundId: options?.fundId ?? DEFAULT_RELATIONSHIP_FUND_ID,
    daysSinceLastMeaningfulContact: days,
    stage: step1.stage,
    momentumDirection: step2.momentumDirection,
    tier: step1.tier,
    relationshipOwner: step1.relationshipOwner,
    investorType: step2.investorType,
    strategyFit: step2.strategyFit,
    strategyType: step2.strategyType,
    lpLocation: step2.lpLocation,
    investmentRemit: step2.investmentRemit,
    typicalCheckSize: step2.typicalCheckSize,
    fundSizePreference: step2.fundSizePreference,
    source: step2.source,
    lastFundHistory: step2.lastFundHistory,
    decisionTimeline: step2.decisionTimeline,
    fiscalYearEnd: step2.fiscalYearEnd,
    consultantDependent: step2.consultantDependent,
    esgRequired: step2.esgRequired,
    nextMove: step2.nextMove.trim() || "Set next move",
    openLoops: loops,
    band,
    contactSeniority: (CONTACT_SENIORITY_OPTIONS as readonly string[]).includes(step2.contactSeniority)
      ? (step2.contactSeniority as ContactSeniority)
      : undefined,
  };
}

/** Demo CSV import: one LP row derived from the uploaded file name (no server parse). */
export function buildMockRelationshipFromCsvImport(
  fileName: string,
  mappingNotes?: string,
  fundId?: string
): Relationship {
  const stem = fileName.replace(/\.[^/.]+$/, "").trim() || "import";
  const firm = stem.slice(0, 120);
  return buildRelationshipFromManualContact(
    {
      name: "Imported contact",
      firm,
      primaryEmail: "",
      tier: "Tier 2",
      stage: "Sourced",
      relationshipOwner: "You",
    },
    {
      ...defaultStep2(),
      source: "Direct",
      lastFundHistory: "New prospect",
      nextMove: mappingNotes ? `Review import (${mappingNotes.slice(0, 80)}${mappingNotes.length > 80 ? "…" : ""})` : "Review CSV import",
    },
    { fundId }
  );
}
