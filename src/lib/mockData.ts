/**
 * Mock data for the hedge fund IR “system of motion”.
 * Keep shapes lean and purpose-built for the new IA.
 */

export type MomentumTrend = "up" | "flat" | "down";
export type Velocity = "Fast" | "Moderate" | "Slow";

// ── Relationship enum constants (Tier 1–4 schema) ───────────────────────────
export const STAGE_OPTIONS = ["First contact", "Deck sent", "Met", "Active diligence", "DD", "Soft circle", "Closed", "Pass"] as const;
export const MOMENTUM_DIRECTION_OPTIONS = ["Heating up", "Stable", "Cooling"] as const;
export const TIER_OPTIONS = ["Tier 1", "Tier 2", "Tier 3"] as const;
export const RELATIONSHIP_OWNER_OPTIONS = ["You", "IR Person", "Placement Agent", "Unassigned"] as const;
export const INVESTOR_TYPE_OPTIONS = ["Family office", "Endowment", "Pension fund", "Sovereign wealth fund", "Fund-of-funds", "UHNW", "Insurance", "Foundation"] as const;
export const STRATEGY_FIT_OPTIONS = ["Active mandate", "Fully allocated", "No mandate", "Unknown"] as const;
export const STRATEGY_TYPE_OPTIONS = ["Global macro", "Long/short equity", "Multi-strat", "Credit", "Quant", "Other"] as const;
export const LP_LOCATION_OPTIONS = ["North America", "EMEA", "APAC", "LATAM", "Other"] as const;
export const INVESTMENT_REMIT_OPTIONS = ["Global", "US only", "Europe only", "Asia only", "Emerging markets", "Other"] as const;
export const TYPICAL_CHECK_SIZE_OPTIONS = ["<$5M", "$5–25M", "$25–50M", "$50–100M", "$100M+", "Unknown"] as const;
export const FUND_SIZE_PREFERENCE_OPTIONS = ["No cap", "≤5% of fund", "≤10% of fund", "Unknown"] as const;
export const SOURCE_OPTIONS = ["Direct", "Placement agent", "Conference", "Warm intro", "Other"] as const;
export const LAST_FUND_HISTORY_OPTIONS = ["New prospect", "Invested Fund I", "Invested Fund II", "Re-upped", "Passed", "Unknown"] as const;
export const DECISION_TIMELINE_OPTIONS = ["Q1", "Q2", "Q3", "Q4", "Ad hoc", "Unknown"] as const;
export const FISCAL_YEAR_END_OPTIONS = ["Jan", "Mar", "Jun", "Sep", "Dec", "Unknown"] as const;
export const CONSULTANT_DEPENDENT_OPTIONS = ["Direct", "Consultant-dependent", "Unknown"] as const;
export const ESG_REQUIRED_OPTIONS = ["Yes", "No", "Unknown"] as const;
export const BAND_OPTIONS = ["Heating Up", "Active-Stable", "Cooling", "Stalled"] as const;
export const CONTACT_SENIORITY_OPTIONS = ["CIO", "Director", "Analyst", "Other"] as const;

export type Stage = (typeof STAGE_OPTIONS)[number];

/** Funnel / Kanban — pale green → red spectrum; Pass = black (matches pipeline UI) */
export const STAGE_COLORS: Record<Stage, string> = {
  "First contact": "#c8e6c9",
  "Deck sent": "#a5d6a7",
  Met: "#81c784",
  "Active diligence": "#ffeb3b",
  DD: "#ffb74d",
  "Soft circle": "#ff8a65",
  Closed: "#f44336",
  Pass: "#000000",
};

/** Readable text + border on solid STAGE_COLORS backgrounds */
export function stageLabelOnColorClasses(stage: Stage): {
  title: string;
  count: string;
  border: string;
} {
  if (stage === "Pass" || stage === "Closed") {
    return {
      title: "text-white",
      count: "text-white/80",
      border: "border-b border-white/25",
    };
  }
  return {
    title: "text-gray-900",
    count: "text-gray-700",
    border: "border-b border-black/10",
  };
}

export type MomentumDirection = (typeof MOMENTUM_DIRECTION_OPTIONS)[number];
export type RelationshipTier = (typeof TIER_OPTIONS)[number];
export type RelationshipOwner = (typeof RELATIONSHIP_OWNER_OPTIONS)[number];
export type InvestorType = (typeof INVESTOR_TYPE_OPTIONS)[number];
export type StrategyFit = (typeof STRATEGY_FIT_OPTIONS)[number];
export type StrategyType = (typeof STRATEGY_TYPE_OPTIONS)[number];
export type LpLocation = (typeof LP_LOCATION_OPTIONS)[number];
export type InvestmentRemit = (typeof INVESTMENT_REMIT_OPTIONS)[number];
export type TypicalCheckSize = (typeof TYPICAL_CHECK_SIZE_OPTIONS)[number];
export type FundSizePreference = (typeof FUND_SIZE_PREFERENCE_OPTIONS)[number];
export type Source = (typeof SOURCE_OPTIONS)[number];
export type LastFundHistory = (typeof LAST_FUND_HISTORY_OPTIONS)[number];
export type DecisionTimeline = (typeof DECISION_TIMELINE_OPTIONS)[number];
export type FiscalYearEnd = (typeof FISCAL_YEAR_END_OPTIONS)[number];
export type ConsultantDependent = (typeof CONSULTANT_DEPENDENT_OPTIONS)[number];
export type EsgRequired = (typeof ESG_REQUIRED_OPTIONS)[number];
export type Band = (typeof BAND_OPTIONS)[number];
export type ContactSeniority = (typeof CONTACT_SENIORITY_OPTIONS)[number];

/**
 * Relationship — full IR prioritisation schema (26 fields).
 * Tier 1: Prioritisation | Tier 2: Targeting | Tier 3: Sequencing | Tier 4: Nice-to-have
 */
export type Relationship = {
  id: string;
  name: string;
  firm: string;
  // Tier 1 — Prioritisation
  daysSinceLastMeaningfulContact: number;
  stage: Stage;
  momentumDirection: MomentumDirection;
  tier: RelationshipTier;
  relationshipOwner: RelationshipOwner;
  // Tier 2 — Targeting
  investorType: InvestorType;
  strategyFit: StrategyFit;
  strategyType: StrategyType;
  lpLocation: LpLocation;
  investmentRemit: InvestmentRemit;
  typicalCheckSize: TypicalCheckSize;
  fundSizePreference: FundSizePreference;
  // Tier 3 — Sequencing
  source: Source;
  sourceDetail?: string;
  lastFundHistory: LastFundHistory;
  lastFundCheckSize?: TypicalCheckSize;
  decisionTimeline: DecisionTimeline;
  fiscalYearEnd: FiscalYearEnd;
  consultantDependent: ConsultantDependent;
  consultantName?: string;
  esgRequired: EsgRequired;
  // Tier 4 — Nice-to-have
  lastMeetingDate?: string;
  contactSeniority?: ContactSeniority;
  // Common
  nextMove: string;
  openLoops: number;
  /** Derived from momentumDirection + days for filter/display */
  band: Band;
};

/** Format days since contact for display (e.g. "3d ago", "14d ago") */
export function formatDaysSinceContact(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 14) return "1w ago";
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 60) return "1mo ago";
  return `${Math.floor(days / 30)}mo ago`;
}

export type ActionStatus = "approval" | "in_progress" | "blocked";

export type MomentumShift = {
  band: "Heating" | "Cooling" | "Stalled" | "Stable";
  delta: number;
};

export type FlowBand = "Heating" | "Active" | "Cooling" | "Stalled";

export type FlowSummary = {
  band: FlowBand;
  delta: number; // net change vs yesterday
  names: string[]; // top LPs in this band
};

export type HealthMetricTier = "A" | "B";

export type HealthMetric = {
  id: string;
  label: string;
  value: string;
  trend?: string;
  description: string;
  tier: HealthMetricTier;
  showIfStageData?: boolean;
};

/** Structured lines for Today “What needs your attention” cards (avoids long template titles in the list). */
export type ActionAttentionCard = {
  company: string;
  contactName: string;
  /** Right pill only (e.g. Approve, Update, Review, Respond). */
  verb: string;
  /** Row 2 work line before “ : subject” (e.g. Follow-up, CRM update). */
  workKind: string;
  workSubject: string;
};

export type ActionItem = {
  id: string;
  title: string;
  status: ActionStatus;
  trigger: string;
  evidence: string[];
  type: "outreach" | "scheduling" | "crm_update" | "follow_up";
  /** When set, Today list uses company/contact/work lines instead of a single headline title. */
  attentionCard?: ActionAttentionCard;
  suggestedUpdates?: string[];
  draft?: string;
  autoApproveType?: boolean; // UI preference only (mock)
  activityLog: { id: string; ts: string; actor: "TOMO" | "User"; summary: string }[];
  /** ISO date string (YYYY-MM-DD) for overdue detection */
  dueDate?: string;
  /** Link to workflow playbook — shows "View workflow" in drawer */
  workflowPlaybookId?: string;
  /** Link to Tomo Default workflow — shows "View workflow" in drawer */
  workflowTomoDefaultId?: string;
  /** Override pill to display as "Tomo" (peach) even when workflowPlaybookId is set */
  workflowPillOverride?: "Tomo";
};

export type Commitment = {
  id: string;
  title: string;
  datetime: string;
  lp: string;
  /** Primary contact — shown on Today “Coming up” cards as `LP : name` */
  contactName: string;
  briefId?: string;
  window: "next72h" | "today";
};

export type Brief = {
  id: string;
  meetingTitle: string;
  lp: string;
  datetime: string;
  status: "Ready" | "Updated";
  openLoops: number;
  summary: string;
  agenda: string[];
  commitments: string[];
};

export type Material = {
  id: string;
  name: string;
  type: "Deck" | "Update" | "Report" | "Data Room";
  version: string;
  date: string;
  engagement: "High" | "Mixed" | "Ignored";
  momentumImpact: MomentumTrend;
  followUpSignal: string;
};

export type ActivityLogEntry = {
  id: string;
  ts: string;
  actor: "TOMO" | "User";
  summary: string;
};

/** Seed data for relationship generator */
const RELATIONSHIP_NAMES = [
  "Alex Morgan", "Jamie Chen", "Priya Desai", "Samir Patel", "Elena Vasquez", "Marcus Webb", "Yuki Tanaka",
  "David Kim", "Sarah Mitchell", "James O'Brien", "Ana Costa", "Michael Zhang", "Rachel Foster", "Thomas Wright",
  "Nina Patel", "Christopher Lee", "Olivia Martinez", "Daniel Brown", "Sophie Laurent", "Robert Chen",
  "Emma Wilson", "William Davis", "Isabella Garcia", "Benjamin Taylor", "Mia Anderson", "Lucas Thompson",
  "Charlotte White", "Henry Clark", "Amelia Lewis", "Alexander Hall", "Harper Young", "Sebastian King",
  "Evelyn Scott", "Jack Green", "Abigail Adams", "Owen Baker", "Emily Nelson", "Liam Carter", "Elizabeth Hill",
  "Noah Mitchell", "Chloe Roberts", "Mason Turner", "Grace Phillips", "Ethan Campbell", "Victoria Parker",
  "Aiden Evans", "Zoey Edwards", "Logan Collins", "Lily Stewart", "Jackson Morris",
  // Extended pool (r51–r150) — enough unique rows without recycling pairs
  "Ada Worthington", "Finn Gallagher", "Iris Nakamura", "Jonah Meyer", "Kai Andersen", "Lara Fontaine", "Miles Okonkwo", "Nora Fitzpatrick", "Omar Rahman", "Pia Lindstrom",
  "Quinn Abernathy", "Ronan O'Dwyer", "Sasha Volkov", "Tessa Whitmore", "Uriel Santos", "Vera Sato", "Wade Holloway", "Xenia Popov", "Yusuf Abbasi", "Zara Brennan",
  "Aria Kulkarni", "Bruno Ricci", "Celine Dufresne", "Dante Morales", "Elise Thorsen", "Felix Brandt", "Gia Ramirez", "Hugo van Dijk", "Ines Khatib", "Javier Molina",
  "Katya Petrov", "Leo Santoro", "Mira Haddad", "Nico Barros", "Orla McKenna", "Paolo Rossi", "Qi Liu", "Ravi Menon", "Sofia Andersson", "Theo Papadopoulos",
  "Una Okoye", "Viktor Stoyanov", "Wren Caldwell", "Xin Zhao", "Yara El-Sayed", "Zeke Thornton", "Alba Cortes", "Bjorn Lindgren", "Chiara Romano", "Darius Kemp",
  "Esme Blackwood", "Flynn Murray", "Greta Svendsen", "Hana Fujiwara", "Idris Adeyemi", "Jana Novak", "Kofi Mensah", "Lena Björklund", "Matteo Conti", "Nadia Karim",
  "Oskar Helgesson", "Priya Raman", "Riku Yamamoto", "Sienna Torres", "Tariq Bashir", "Uma Srinivasan", "Vigo Carvalho", "Willa Thatcher", "Yoshi Taniguchi", "Zahra Farouk",
  "Arjun Mehta", "Bianca Rossetti", "Cyrus Danforth", "Dahlia Nguyen", "Emilio Vasquez", "Freya Olsen", "Gideon Pryce", "Helena Costa", "Ivan Petrovic", "Jun Park",
  "Katarina Steiner", "Luka Horvat", "Mei Lin", "Nikhil Kapoor", "Ophelia Grant", "Pedro Alvarez", "Rowena Shaw", "Sanjay Gupta", "Astrid Lindholm", "Beau Harrington",
  "Carmen Ibarra", "Dina Hakim", "Ellis Moura", "Fabian Weber", "Giselle Mercado", "Hakim Farid", "Ingrid Larsson", "Jiro Watanabe", "Kaida Chen", "Lucien Moreau",
];
const RELATIONSHIP_FIRMS = [
  "Northwind Capital", "Peakline Partners", "Lumen LP", "Harborlight Advisors", "Apex Family Office",
  "Meridian Endowment", "Pacific Pension Fund", "Cascade Sovereign", "Summit Fund of Funds", "Horizon UHNW",
  "Atlas Insurance", "Cedar Foundation", "Ridge Family Office", "Valley Endowment", "Stone Pension",
  "Brook Sovereign", "Pine FoF", "Maple UHNW", "Oak Insurance", "Willow Foundation",
  "Sage Family Office", "Ivy Endowment", "Fern Pension", "Moss Sovereign", "Reed FoF",
  "Clover UHNW", "Hazel Insurance", "Birch Foundation", "Ash Family Office", "Elm Endowment",
  "Spruce Pension", "Juniper Sovereign", "Laurel FoF", "Hawthorn UHNW", "Rowan Insurance",
  "Alder Foundation", "Beech Family Office", "Chestnut Endowment", "Dogwood Pension", "Elder Sovereign",
  "Fig FoF", "Ginkgo UHNW", "Hemlock Insurance", "Hickory Foundation", "Ironwood Family Office",
  "Jacaranda Endowment", "Koa Pension", "Larch Sovereign", "Magnolia FoF", "Nettle UHNW",
  // Extended pool (r51–r150)
  "Osprey Alternatives", "Redwood Institutional", "Granite Ridge Capital", "Silverpine Partners", "Bluefin Asset Management", "Copperfield Family Office", "Marble Arch LP", "Obsidian Trust", "Quartz Endowment", "Titanium Advisors",
  "Velvet Oak Capital", "Wintermute Partners", "Amberlight Ventures", "Cobalt River LP", "Emerald Coast FoF", "Flint Hill Pension", "Garnet Gate Sovereign", "Indigo Line Capital", "Jade Harbor LP", "Onyx Peak Advisors",
  "Pearl Street Endowment", "Ruby Lane Family Office", "Sapphire Bay LP", "Topaz Field Partners", "Turquoise Trail Capital", "Violet Crown LP", "Arctic Fox Advisors", "Borealis Pension", "Cirrus Sky Capital", "Driftwood LP",
  "Echo Ridge Endowment", "Falcon Wing FoF", "Glacier Point LP", "Harbor Stone Capital", "Ivory Coast LP", "Juniper Bay Trust", "Keystone Arc Partners", "Lighthouse Reef LP", "Monarch Crest Capital", "Nimbus Peak LP",
  "Oracle Rock Advisors", "Pinnacle Stream LP", "Questline Endowment", "Ravenwood Family Office", "Sterling Crest LP", "Summit Crest Capital", "Timberline Trust", "Upland Grove LP", "Vanguardia LP", "Whispering Pine Capital",
  "Yellowstone Ridge LP", "Zenith Harbor Partners", "Acacia Point LP", "Balsam Root Capital", "Cypress Dome LP", "Dogwood Hollow LP", "Eucalyptus Lane LP", "Foxglove Partners", "Goldenrod Trust", "Heliotrope LP",
  "Iris Field Endowment", "Jasmine Row LP", "Kingfisher Cove Capital", "Larkspur Hill LP", "Marigold Trust", "Nightshade Ridge LP", "Oleander Bay LP", "Primrose Path LP", "Quince Orchard LP", "Ranunculus LP",
  "Sunflower Peak LP", "Trillium Brook Capital", "Umbrella Pine LP", "Verbena Point LP", "Wisteria Lane LP", "Xerophyte LP", "Yarrow Creek Capital", "Zinnia Fields LP", "Alpine Crest Endowment", "Basin Rock LP",
  "Canyon View Partners", "Delta Flow Capital", "Estuary LP", "Fjord Point Advisors", "Glacier Bay Trust", "Highland Moor LP", "Inlet Partners", "Jetty Capital LP", "Kelp Forest LP", "Lagoon Endowment",
  "Marshland LP", "Narrows Family Office", "Oasis Ridge LP", "Peninsula Trust", "Quarry Hill LP", "Reefstone Capital", "Sandbar LP", "Tidewater Partners", "Undertow LP", "Voyageur Capital",
];

/** Seeded random for deterministic mock data */
function seededRandom(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function pick<T>(arr: readonly T[], weights?: number[], rng = Math.random): T {
  if (!weights) return arr[Math.floor(rng() * arr.length)]!;
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i] ?? 0;
    if (r <= 0) return arr[i]!;
  }
  return arr[arr.length - 1]!;
}

function generateRelationships(): Relationship[] {
  const rels: Relationship[] = [];
  const usedNames = new Set<string>();
  const usedFirms = new Set<string>();

  // r1–r4: Preserve original firms for cross-entity consistency (actions, briefs, commitments)
  const preserved: Partial<Relationship>[] = [
    { name: "Alex Morgan", firm: "Northwind Capital", daysSinceLastMeaningfulContact: 3, stage: "Active diligence", momentumDirection: "Heating up", tier: "Tier 1", relationshipOwner: "You", investorType: "Family office", strategyFit: "Active mandate", strategyType: "Long/short equity", lpLocation: "North America", investmentRemit: "Global", typicalCheckSize: "$25–50M", fundSizePreference: "No cap", source: "Direct", lastFundHistory: "Invested Fund II", decisionTimeline: "Q1", fiscalYearEnd: "Dec", consultantDependent: "Direct", esgRequired: "No", nextMove: "Share Q4 performance deck", openLoops: 2, band: "Heating Up", lastMeetingDate: "2025-02-15" },
    { name: "Jamie Chen", firm: "Peakline Partners", daysSinceLastMeaningfulContact: 9, stage: "Deck sent", momentumDirection: "Stable", tier: "Tier 1", relationshipOwner: "IR Person", investorType: "Fund-of-funds", strategyFit: "Active mandate", strategyType: "Multi-strat", lpLocation: "North America", investmentRemit: "Global", typicalCheckSize: "$50–100M", fundSizePreference: "≤5% of fund", source: "Placement agent", lastFundHistory: "New prospect", decisionTimeline: "Q2", fiscalYearEnd: "Jun", consultantDependent: "Direct", esgRequired: "No", nextMove: "Schedule allocation review", openLoops: 1, band: "Active-Stable", lastMeetingDate: "2025-02-01" },
    { name: "Priya Desai", firm: "Lumen LP", daysSinceLastMeaningfulContact: 14, stage: "Deck sent", momentumDirection: "Cooling", tier: "Tier 2", relationshipOwner: "You", investorType: "Family office", strategyFit: "Active mandate", strategyType: "Long/short equity", lpLocation: "EMEA", investmentRemit: "Europe only", typicalCheckSize: "$5–25M", fundSizePreference: "≤10% of fund", source: "Warm intro", sourceDetail: "Goldman cap intro", lastFundHistory: "New prospect", decisionTimeline: "Q3", fiscalYearEnd: "Mar", consultantDependent: "Direct", esgRequired: "Yes", nextMove: "Send concise update + ask for feedback", openLoops: 3, band: "Cooling" },
    { name: "Samir Patel", firm: "Harborlight Advisors", daysSinceLastMeaningfulContact: 21, stage: "First contact", momentumDirection: "Cooling", tier: "Tier 2", relationshipOwner: "Placement Agent", investorType: "Endowment", strategyFit: "Fully allocated", strategyType: "Credit", lpLocation: "North America", investmentRemit: "US only", typicalCheckSize: "$25–50M", fundSizePreference: "No cap", source: "Conference", lastFundHistory: "Passed", decisionTimeline: "Q4", fiscalYearEnd: "Jun", consultantDependent: "Consultant-dependent", consultantName: "Mercer", esgRequired: "Yes", nextMove: "Re-engage with performance snapshot", openLoops: 0, band: "Stalled" },
  ];

  for (let i = 0; i < 4; i++) {
    const p = preserved[i]!;
    rels.push({
      id: `r${i + 1}`,
      name: p.name!,
      firm: p.firm!,
      daysSinceLastMeaningfulContact: p.daysSinceLastMeaningfulContact!,
      stage: p.stage!,
      momentumDirection: p.momentumDirection!,
      tier: p.tier!,
      relationshipOwner: p.relationshipOwner!,
      investorType: p.investorType!,
      strategyFit: p.strategyFit!,
      strategyType: p.strategyType!,
      lpLocation: p.lpLocation!,
      investmentRemit: p.investmentRemit!,
      typicalCheckSize: p.typicalCheckSize!,
      fundSizePreference: p.fundSizePreference!,
      source: p.source!,
      sourceDetail: p.sourceDetail,
      lastFundHistory: p.lastFundHistory!,
      lastFundCheckSize: p.lastFundCheckSize,
      decisionTimeline: p.decisionTimeline!,
      fiscalYearEnd: p.fiscalYearEnd!,
      consultantDependent: p.consultantDependent!,
      consultantName: p.consultantName,
      esgRequired: p.esgRequired!,
      lastMeetingDate: p.lastMeetingDate,
      contactSeniority: p.contactSeniority,
      nextMove: p.nextMove!,
      openLoops: p.openLoops!,
      band: p.band!,
    });
    usedNames.add(p.name!);
    usedFirms.add(p.firm!);
  }

  // r5–r150: Generated with realistic distribution (50 original + 100 extended)
  const stages: Stage[] = ["First contact", "Deck sent", "Met", "Active diligence", "DD", "Soft circle", "Closed", "Pass"];
  const momentumDirs: MomentumDirection[] = ["Heating up", "Stable", "Cooling"];
  const tiers: RelationshipTier[] = ["Tier 1", "Tier 2", "Tier 3"];
  const owners: RelationshipOwner[] = ["You", "IR Person", "Placement Agent", "Unassigned"];
  const investorTypes: InvestorType[] = ["Family office", "Endowment", "Pension fund", "Sovereign wealth fund", "Fund-of-funds", "UHNW", "Insurance", "Foundation"];
  const strategyFits: StrategyFit[] = ["Active mandate", "Fully allocated", "No mandate", "Unknown"];
  const strategyTypes: StrategyType[] = ["Global macro", "Long/short equity", "Multi-strat", "Credit", "Quant", "Other"];
  const lpLocs: LpLocation[] = ["North America", "EMEA", "APAC", "LATAM", "Other"];
  const investmentRemits: InvestmentRemit[] = ["Global", "US only", "Europe only", "Asia only", "Emerging markets", "Other"];
  const checkSizes: TypicalCheckSize[] = ["<$5M", "$5–25M", "$25–50M", "$50–100M", "$100M+", "Unknown"];
  const fundPrefs: FundSizePreference[] = ["No cap", "≤5% of fund", "≤10% of fund", "Unknown"];
  const sources: Source[] = ["Direct", "Placement agent", "Conference", "Warm intro", "Other"];
  const fundHistories: LastFundHistory[] = ["New prospect", "Invested Fund I", "Invested Fund II", "Re-upped", "Passed", "Unknown"];
  const decisionTimelines: DecisionTimeline[] = ["Q1", "Q2", "Q3", "Q4", "Ad hoc", "Unknown"];
  const fiscalEnds: FiscalYearEnd[] = ["Jan", "Mar", "Jun", "Sep", "Dec", "Unknown"];
  const consultantDeps: ConsultantDependent[] = ["Direct", "Consultant-dependent", "Unknown"];
  const esgReqs: EsgRequired[] = ["Yes", "No", "Unknown"];
  const bands: Band[] = ["Heating Up", "Active-Stable", "Cooling", "Stalled"];
  const nextMoves = [
    "Share Q4 performance deck", "Schedule allocation review", "Send concise update", "Re-engage with snapshot",
    "Propose DD kickoff", "Send term sheet", "Follow up on deck", "Book intro call", "Share data room access",
    "Confirm allocation window", "Send monthly update", "Schedule IC presentation", "Draft side letter",
  ];

  const namePool = RELATIONSHIP_NAMES.filter((n) => !usedNames.has(n));
  const firmPool = RELATIONSHIP_FIRMS.filter((f) => !usedFirms.has(f));
  const rng = seededRandom(12345);

  for (let i = 4; i < 150; i++) {
    const name = namePool[(i - 4) % namePool.length]!;
    const firm = firmPool[(i - 4) % firmPool.length]!;
    const momentumDir = pick(momentumDirs, [30, 40, 30], rng);
    const days = pick(
      [2, 5, 7, 9, 12, 14, 18, 21, 28, 35, 42, 56, 70, 90],
      [8, 6, 5, 4, 4, 3, 3, 3, 2, 2, 1, 1, 1, 1],
      rng
    );
    const band = days >= 45 && momentumDir === "Cooling" ? "Stalled" : momentumDir === "Heating up" ? "Heating Up" : momentumDir === "Cooling" ? "Cooling" : "Active-Stable";

    rels.push({
      id: `r${i + 1}`,
      name,
      firm,
      daysSinceLastMeaningfulContact: days,
      stage: pick(stages, [10, 15, 12, 8, 6, 5, 3, 5], rng),
      momentumDirection: momentumDir,
      tier: pick(tiers, [20, 50, 30], rng),
      relationshipOwner: pick(owners, [40, 30, 20, 10], rng),
      investorType: pick(investorTypes, undefined, rng),
      strategyFit: pick(strategyFits, [50, 25, 15, 10], rng),
      strategyType: pick(strategyTypes, [25, 30, 20, 15, 5, 5], rng),
      lpLocation: pick(lpLocs, [45, 30, 15, 5, 5], rng),
      investmentRemit: pick(investmentRemits, [60, 15, 10, 8, 5, 2], rng),
      typicalCheckSize: pick(checkSizes, [15, 25, 25, 20, 10, 5], rng),
      fundSizePreference: pick(fundPrefs, [50, 25, 15, 10], rng),
      source: pick(sources, [30, 25, 15, 25, 5], rng),
      sourceDetail: rng() < 0.15 ? "Goldman cap intro" : undefined,
      lastFundHistory: pick(fundHistories, [35, 15, 15, 10, 15, 10], rng),
      lastFundCheckSize: rng() < 0.4 ? pick(checkSizes, undefined, rng) : undefined,
      decisionTimeline: pick(decisionTimelines, undefined, rng),
      fiscalYearEnd: pick(fiscalEnds, undefined, rng),
      consultantDependent: pick(consultantDeps, [60, 30, 10], rng),
      consultantName: rng() < 0.2 ? pick(["Mercer", "Albourne", "Aon", "Callan", "NEPC"], undefined, rng) : undefined,
      esgRequired: pick(esgReqs, [20, 60, 20], rng),
      lastMeetingDate: rng() < 0.5 ? `2025-0${1 + (i % 3)}-${10 + (i % 18)}` : undefined,
      contactSeniority: rng() < 0.6 ? pick(CONTACT_SENIORITY_OPTIONS, undefined, rng) : undefined,
      nextMove: pick(nextMoves, undefined, rng),
      openLoops: Math.floor(rng() * 4),
      band,
    });
  }

  return rels;
}

export const relationships: Relationship[] = generateRelationships();

export const actions: ActionItem[] = [
  {
    id: "a2",
    title: "Approve follow-up: Northwind Q4 review",
    attentionCard: {
      company: "Northwind Capital",
      contactName: "Alex Morgan",
      verb: "Approve",
      workKind: "Follow-up",
      workSubject: "Northwind Q4 review",
    },
    status: "approval",
    trigger: "Meeting ended 2h ago — transcript processed",
    evidence: [
      "Transcript extracted, 3 action items identified",
      "Allocation window discussed — follow-up draft ready",
      "Alex mentioned timeline pressure for Q1",
    ],
    type: "follow_up",
    draft: "Hi Alex — great connecting today. As discussed, here's the updated deck and our Q1 timeline...",
    dueDate: "2025-03-04",
    activityLog: [
      { id: "al3", ts: "Today 11:05", actor: "TOMO", summary: "Extracted transcript and action items" },
      { id: "al4", ts: "Today 11:08", actor: "TOMO", summary: "Drafted post-meeting follow-up" },
    ],
    workflowPlaybookId: "pb-post-meeting",
    workflowPillOverride: "Tomo",
  },
  {
    id: "a3",
    title: "Review follow-ups: 5 LPs silent on January update",
    attentionCard: {
      company: "Tier 1–2 LPs",
      contactName: "January update cohort",
      verb: "Review",
      workKind: "Outreach",
      workSubject: "5 silent after monthly update",
    },
    status: "in_progress",
    trigger: "5d since monthly update — low engagement from Tier 1–2",
    evidence: [
      "5 Tier 1–2 LPs with zero opens after 5 days",
      "Personalized follow-ups auto-drafted per LP",
      "Highest priority: Ridge Family Office (Tier 1, Cooling)",
    ],
    type: "outreach",
    dueDate: "2025-03-03",
    activityLog: [
      { id: "al5", ts: "Yesterday", actor: "TOMO", summary: "Segmented 24 LPs by engagement" },
      { id: "al6", ts: "Today 07:00", actor: "TOMO", summary: "Drafted 5 follow-ups for non-openers" },
    ],
    workflowPlaybookId: "pb-update-followup",
  },
  {
    id: "a4",
    title: "Update CRM: Lumen stalling — re-engage or mark blocked",
    attentionCard: {
      company: "Lumen LP",
      contactName: "Priya Desai",
      verb: "Update",
      workKind: "CRM update",
      workSubject: "Lumen stalling — re-engage or mark blocked",
    },
    status: "blocked",
    trigger: "No response in 5d after 2 follow-ups",
    evidence: [
      "No reply after 2 follow-ups",
      "Opened performance note once, no action",
      "Stall risk rising — workflow suggests CRM update + reminder",
    ],
    type: "crm_update",
    suggestedUpdates: ["Momentum: Cooling", "Stage: Blocked", "Reminder: 7d"],
    dueDate: "2025-03-01",
    activityLog: [
      { id: "al7", ts: "5d ago", actor: "User", summary: "Initial outreach to Lumen" },
      { id: "al8", ts: "2d ago", actor: "User", summary: "Follow-up sent" },
      { id: "al9", ts: "Today 08:00", actor: "TOMO", summary: "Flagged as blocked — suggested CRM updates" },
    ],
    workflowPlaybookId: "pb-no-response-stall",
  },
  {
    id: "a5",
    title: "Respond to scheduling request from Peakline",
    attentionCard: {
      company: "Peakline Partners",
      contactName: "Jamie Chen",
      verb: "Respond",
      workKind: "Scheduling",
      workSubject: "Jamie — 3 proposed times",
    },
    status: "approval",
    trigger: "Jamie Chen asked for available times — 3 slots found",
    evidence: [
      "Email from Jamie Chen: 'Can we find 30 min next week?'",
      "3 open slots found: Tue 10am, Wed 2pm, Thu 11am",
      "Draft response with availability ready",
    ],
    type: "scheduling",
    draft: "Hi Jamie — absolutely, here are a few times that work on our end: Tue 10am, Wed 2pm, Thu 11am ET. Which works best?",
    dueDate: "2025-03-04",
    activityLog: [
      { id: "al10", ts: "Today 09:30", actor: "TOMO", summary: "Detected scheduling request in email" },
      { id: "al11", ts: "Today 09:31", actor: "TOMO", summary: "Matched availability, drafted response" },
    ],
    workflowTomoDefaultId: "td-email-scheduling",
  },
  {
    id: "a6",
    title: "Review extracted actions from Harborlight call",
    attentionCard: {
      company: "Harborlight Advisors",
      contactName: "Samir Patel",
      verb: "Review",
      workKind: "CRM update",
      workSubject: "Harborlight call — notes → actions",
    },
    status: "in_progress",
    trigger: "Meeting notes processed — 2 CRM updates + 1 follow-up",
    evidence: [
      "Samir mentioned they passed on Fund I — re-engagement window opening",
      "Contact seniority changed: now reports to CIO directly",
      "Follow-up commitment: send performance snapshot by Friday",
    ],
    type: "crm_update",
    suggestedUpdates: ["Contact seniority: C-Suite", "Stage: Met"],
    dueDate: "2025-03-05",
    activityLog: [
      { id: "al12", ts: "Today 10:00", actor: "TOMO", summary: "Processed meeting notes from Harborlight call" },
      { id: "al13", ts: "Today 10:01", actor: "TOMO", summary: "Extracted 2 CRM updates and 1 commitment" },
    ],
    workflowTomoDefaultId: "td-meeting-notes",
  },
  {
    id: "a7",
    title: "Review CRM sync: Meridian Endowment role change",
    attentionCard: {
      company: "Meridian Endowment",
      contactName: "David Kim",
      verb: "Review",
      workKind: "CRM update",
      workSubject: "Contact role change (VP → CIO)",
    },
    status: "approval",
    trigger: "Website scan detected contact title change",
    evidence: [
      "David Kim's title changed: VP Investments → CIO",
      "Meridian Endowment website updated 2 days ago",
      "Suggested CRM update: contact seniority → C-Suite",
    ],
    type: "crm_update",
    suggestedUpdates: ["Contact seniority: C-Suite"],
    dueDate: "2025-03-06",
    activityLog: [
      { id: "al14", ts: "Today 06:00", actor: "TOMO", summary: "Scanned Meridian Endowment website" },
      { id: "al15", ts: "Today 06:01", actor: "TOMO", summary: "Detected role change for David Kim" },
    ],
    workflowTomoDefaultId: "td-website-scan",
  },
];

export const commitments: Commitment[] = [
  {
    id: "c1",
    title: "Northwind Q4 review",
    datetime: "Tomorrow 10:30 AM ET",
    lp: "Northwind Capital",
    contactName: "Alex Morgan",
    briefId: "b1",
    window: "next72h",
  },
  {
    id: "c2",
    title: "Peakline allocation check-in",
    datetime: "Fri 2:00 PM ET",
    lp: "Peakline Partners",
    contactName: "Jamie Chen",
    briefId: "b2",
    window: "next72h",
  },
  {
    id: "c3",
    title: "Lumen async update send",
    datetime: "Today 5:00 PM ET",
    lp: "Lumen LP",
    contactName: "Priya Desai",
    window: "today",
  },
];

export const momentumShifts: MomentumShift[] = [
  { band: "Stalled", delta: 1 },
  { band: "Heating", delta: 3 },
  { band: "Cooling", delta: 2 },
  { band: "Stable", delta: 0 },
];

export const briefs: Brief[] = [
  {
    id: "b1",
    meetingTitle: "Northwind Q4 review",
    lp: "Northwind Capital",
    datetime: "Tomorrow 10:30 AM ET",
    status: "Ready",
    openLoops: 1,
    summary: "Northwind is leaning in after strong Q4; wants clarity on pipeline and risk.",
    agenda: ["Performance highlights", "Risk / hedging stance", "Next allocation step"],
    commitments: ["Send follow-up deck", "Confirm allocation window"],
  },
  {
    id: "b2",
    meetingTitle: "Peakline allocation check-in",
    lp: "Peakline Partners",
    datetime: "Fri 2:00 PM ET",
    status: "Updated",
    openLoops: 2,
    summary: "Peakline opened deck multiple times; need to secure a concrete slot.",
    agenda: ["Scheduling decision", "Performance Q&A", "Next steps to commit"],
    commitments: ["Lock meeting time", "Share concise 3-bullet update"],
  },
];

export const materials: Material[] = [
  { id: "m1", name: "Q4 Performance Deck", type: "Deck", version: "v4", date: "Jan 12", engagement: "High", momentumImpact: "up", followUpSignal: "12 opens, 3 replies pending" },
  { id: "m2", name: "January Investor Update", type: "Update", version: "v2", date: "Jan 8", engagement: "Mixed", momentumImpact: "flat", followUpSignal: "8 opened, no replies" },
  { id: "m3", name: "Data Room Access", type: "Data Room", version: "v1", date: "Jan 3", engagement: "Ignored", momentumImpact: "down", followUpSignal: "No activity in 10d" },
];

export const momentumFlowSummary: FlowSummary[] = [
  { band: "Heating", delta: 2, names: ["Alex Morgan", "Jamie Chen", "Priya Desai"] },
  { band: "Active", delta: 1, names: ["Jamie Chen", "Alex Morgan", "Samir Patel"] },
  { band: "Cooling", delta: -1, names: ["Priya Desai", "Samir Patel"] },
  { band: "Stalled", delta: 1, names: ["Samir Patel"] },
];

export const healthMetrics: HealthMetric[] = [
  {
    id: "hm1",
    tier: "A",
    label: "High value meetings held",
    value: "4",
    trend: "+1",
    description: "Tier 1–2 LP meetings scheduled and completed.",
  },
  {
    id: "hm2",
    tier: "A",
    label: "Tier 1 coverage",
    value: "68%",
    trend: "+6%",
    description: "Percentage of Tier 1 LPs with a meaningful touch in the last 7 days.",
  },
  {
    id: "hm3",
    tier: "A",
    label: "Momentum distribution",
    value: "12 • 18 • 9",
    description: "Current spread across Heating / Active / Cooling.",
  },
  {
    id: "hm4",
    tier: "A",
    label: "Momentum movement",
    value: "+4 net",
    description: "Net LPs heating up vs cooling since yesterday.",
  },
  {
    id: "hm5",
    tier: "A",
    label: "Decay risk",
    value: "6",
    trend: "+1",
    description: "LPs at risk due to silence, missed follow-ups, or stalled flow.",
  },
  {
    id: "hm6",
    tier: "A",
    label: "Unanswered inbound",
    value: "3",
    description: "LP inbound messages beyond response SLA.",
  },
  {
    id: "hm7",
    tier: "A",
    label: "Stage velocity & stall rate",
    value: "3.4d / 9%",
    trend: "-0.2d",
    description: "Time spent per stage and percent stalled.",
    showIfStageData: true,
  },
  {
    id: "hm8",
    tier: "B",
    label: "Active LPs",
    value: "26",
    description: "LPs with an active conversation thread (LMRR-style).",
  },
  {
    id: "hm9",
    tier: "B",
    label: "High-value LPs cooling",
    value: "3",
    trend: "+1",
    description: "Tier 1 LPs with declining momentum.",
  },
];

export const activityLog: ActivityLogEntry[] = [
  { id: "log1", ts: "Today 09:10", actor: "TOMO", summary: "Drafted outreach to Northwind" },
  { id: "log2", ts: "Today 08:20", actor: "TOMO", summary: "Checked engagement for Peakline" },
  { id: "log3", ts: "Yesterday 18:05", actor: "User", summary: "Approved follow-up to Peakline" },
  { id: "log4", ts: "Yesterday 14:33", actor: "TOMO", summary: "Updated brief for Northwind" },
  { id: "log5", ts: "Yesterday 10:12", actor: "User", summary: "Snoozed Lumen outreach" },
];







