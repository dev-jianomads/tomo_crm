/**
 * Mock data for the hedge fund IR “system of motion”.
 * Keep shapes lean and purpose-built for the new IA.
 */

export type MomentumTrend = "up" | "flat" | "down";
export type Velocity = "Fast" | "Moderate" | "Slow";

// ── Relationship enum constants (Tier 1–4 schema) ───────────────────────────
export const STAGE_OPTIONS = ["First contact", "Deck sent", "Met", "Nurturing", "Active diligence", "DD", "Soft circle", "Closed", "Pass"] as const;
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
  Nurturing: "#aed581",
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

/** Today drawer — activity log row (optional detail line for richer layout). */
export type ActivityLogEntry = {
  id: string;
  ts: string;
  actor: "TOMO" | "User";
  summary: string;
  detail?: string;
};

/** Today drawer — optional “why surfaced” + email meta + meeting commitments (mock / static). */
export type DrawerWhySurfaced = {
  body: string;
  stamp?: string;
  /** Meeting prep: e.g. “What changed since you last spoke” (`design/tomo_drawer_meetingprep_light_v3.html`). */
  label?: string;
};
export type DrawerDraftMeta = {
  to?: string;
  ccPlaceholder?: string;
  subject?: string;
  footnote?: string;
};
export type DrawerCommitmentPrepState = "delivered" | "for_today" | "queued" | "open";

export type DrawerCommitmentLine = {
  label: string;
  badge?: string;
  /** Meeting prep — provenance line under the commitment text */
  source?: string;
  prepState?: DrawerCommitmentPrepState;
};

/** `design/tomo_drawer_meetingprep_light_v3.html` — time band under drawer title */
export type DrawerPrepTimeStrip = {
  rangeLabel: string;
  whereLabel?: string;
  joinUrl?: string;
};

export type DrawerPrepAttendee = {
  initials: string;
  name: string;
  role?: string;
  context: string;
  linkedInUrl?: string;
};

export type DrawerLastTouchSegment =
  | { kind: "text"; text: string }
  | { kind: "quote"; text: string };

export type DrawerLastTouchParagraph = { segments: DrawerLastTouchSegment[] };

export type DrawerPrepFocusItem = {
  num: string;
  lead: string;
  rest: string;
  evidence?: string;
};

export type DrawerPrepMaterial = {
  name: string;
  meta: string;
  href: string;
};

export type DrawerPrepSectionLabels = {
  attendees?: string;
  lastTouch?: string;
  openCommitments?: string;
  focus?: string;
  materials?: string;
  activityPreview?: string;
};

/** design/tomo_drawer_draft_light_v3.html — drawer head status + quick links */
export type DrawerSpecHeaderPill = { tone: "red" | "amber" | "teal" | "navy"; label: string };
export type DrawerSpecHeaderLinkIcon = "envelope" | "linkedin" | "calendar" | "clock";
export type DrawerSpecHeaderLink = {
  href: string;
  label: string;
  icon: DrawerSpecHeaderLinkIcon;
};

export type DrawerSpecHeader = {
  /** e.g. Senior IC · Tier 1 · Hedge fund advisory */
  subtitle?: string;
  statusPills: DrawerSpecHeaderPill[];
  links?: DrawerSpecHeaderLink[];
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
  activityLog: ActivityLogEntry[];
  drawerWhySurfaced?: DrawerWhySurfaced;
  drawerDraftMeta?: DrawerDraftMeta;
  /** Shown below draft / Tomo surface; static extraction narrative. */
  drawerCommitments?: DrawerCommitmentLine[];
  /** ISO date string (YYYY-MM-DD) for overdue detection */
  dueDate?: string;
  /** Link to workflow playbook — shows "View workflow" in drawer */
  workflowPlaybookId?: string;
  /** Link to Tomo Default workflow — shows "View workflow" in drawer */
  workflowTomoDefaultId?: string;
  /** Override pill to display as "Tomo" (peach) even when workflowPlaybookId is set */
  workflowPillOverride?: "Tomo";
  /** Source email thread — “Open email” on Today cards and in the action drawer */
  emailSourceUrl?: string;
  /**
   * Mock-only: how many calendar days before “today” this card entered the attention backlog.
   * Omit or 0 = primary “today” column; 1 = yesterday, 2+ = earlier (shown under collapsible “Previous”).
   */
  attentionListDayOffset?: number;
  /** Rich drawer head (v3 spec); links + pills are static mock. */
  drawerSpecHeader?: DrawerSpecHeader;
};

/** `ready` = Tomo has drafted prep; `first_contact` = first live touch, distinct pill; `none` = no prep status pill. */
export type CommitmentPrepStatus = "ready" | "none" | "first_contact";

export type Commitment = {
  id: string;
  title: string;
  datetime: string;
  lp: string;
  /** Primary contact — shown on Today “Coming up” cards as `LP : name` */
  contactName: string;
  briefId?: string;
  window: "next72h" | "today";
  /** Prep state for Coming up / drawer pills (see `CommitmentPrepStatus`). */
  prepStatus: CommitmentPrepStatus;
  /** Phase 1 — overdue promise / missed prep flag */
  commitmentOverdue?: boolean;
  /** When set, deep link to this relationship row on Relationships */
  relationshipId?: string;
  /** Opens from “Open calendar” on Today and in the commitment drawer */
  calendarUrl?: string;
  /** Mock / enrichment: public LinkedIn profile URL for pre-call research */
  linkedInUrl?: string;
  /** Today drawer — same blocks as action drawer where applicable */
  drawerWhySurfaced?: DrawerWhySurfaced;
  activityLog?: ActivityLogEntry[];
  /** Optional badges for prep commitments list; falls back to brief commitments as plain lines. */
  drawerMeetingCommitments?: DrawerCommitmentLine[];
  drawerSpecHeader?: DrawerSpecHeader;
  /**
   * Meeting prep drawer — `design/tomo_drawer_meetingprep_light_v3.html`.
   * Mock-only structured brief; production hydrates from briefs + calendar + interactions.
   */
  drawerPrepEyebrow?: string;
  /** Overrides default `${lp} · ${contactName}` drawer title */
  drawerPrepTitle?: string;
  drawerTimeStrip?: DrawerPrepTimeStrip;
  /** Shown in header link row (e.g. latest email thread) */
  drawerThreadLink?: { href: string; label: string };
  drawerAttendees?: DrawerPrepAttendee[];
  drawerLastTouch?: DrawerLastTouchParagraph[];
  drawerSuggestedFocus?: DrawerPrepFocusItem[];
  drawerPrepMaterials?: DrawerPrepMaterial[];
  drawerPrepLabels?: DrawerPrepSectionLabels;
  /** Total count for “View full history” microcopy (mock) */
  drawerActivityHistoryTotal?: number;
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
  drawerWhySurfaced?: DrawerWhySurfaced;
  activityLog?: ActivityLogEntry[];
  drawerSpecHeader?: DrawerSpecHeader;
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

  // r5–r9: Scenario LPs aligned with Today “What needs your attention” mock cards
  const scenarioLps: Partial<Relationship>[] = [
    {
      name: "Peter Zakowich",
      firm: "PAAMCO Prisma",
      daysSinceLastMeaningfulContact: 1,
      stage: "Active diligence",
      momentumDirection: "Heating up",
      tier: "Tier 1",
      relationshipOwner: "You",
      investorType: "Pension fund",
      strategyFit: "Active mandate",
      strategyType: "Multi-strat",
      lpLocation: "North America",
      investmentRemit: "Global",
      typicalCheckSize: "$50–100M",
      fundSizePreference: "≤10% of fund",
      source: "Direct",
      lastFundHistory: "New prospect",
      decisionTimeline: "Q2",
      fiscalYearEnd: "Dec",
      consultantDependent: "Direct",
      esgRequired: "No",
      nextMove: "Confirm March 18 meeting time",
      openLoops: 1,
      band: "Heating Up",
      lastMeetingDate: "2025-03-10",
      contactSeniority: "CIO",
    },
    {
      name: "Frank Ieraci",
      firm: "CPPIB",
      daysSinceLastMeaningfulContact: 3,
      stage: "Active diligence",
      momentumDirection: "Stable",
      tier: "Tier 1",
      relationshipOwner: "You",
      investorType: "Pension fund",
      strategyFit: "Active mandate",
      strategyType: "Multi-strat",
      lpLocation: "North America",
      investmentRemit: "Global",
      typicalCheckSize: "$100M+",
      fundSizePreference: "No cap",
      source: "Direct",
      lastFundHistory: "New prospect",
      decisionTimeline: "Q2",
      fiscalYearEnd: "Mar",
      consultantDependent: "Direct",
      esgRequired: "No",
      nextMove: "4pm investment update — liquidity, co-invest, path to IC",
      openLoops: 2,
      band: "Active-Stable",
      lastMeetingDate: "2025-03-15",
      contactSeniority: "Director",
    },
    {
      name: "James Staltari",
      firm: "Albourne Partners",
      daysSinceLastMeaningfulContact: 1,
      stage: "Nurturing",
      momentumDirection: "Stable",
      tier: "Tier 1",
      relationshipOwner: "You",
      investorType: "Endowment",
      strategyFit: "Active mandate",
      strategyType: "Multi-strat",
      lpLocation: "EMEA",
      investmentRemit: "Global",
      typicalCheckSize: "$100M+",
      fundSizePreference: "≤5% of fund",
      source: "Direct",
      lastFundHistory: "Invested Fund I",
      decisionTimeline: "Q2",
      fiscalYearEnd: "Jun",
      consultantDependent: "Consultant-dependent",
      consultantName: "Albourne",
      esgRequired: "Yes",
      nextMove: "Post-meeting thank-you + next steps to LP",
      openLoops: 3,
      band: "Active-Stable",
      lastMeetingDate: "2025-03-24",
      contactSeniority: "Director",
    },
    {
      name: "Kwong Hong Huat",
      firm: "GIC",
      daysSinceLastMeaningfulContact: 2,
      stage: "First contact",
      momentumDirection: "Stable",
      tier: "Tier 1",
      relationshipOwner: "IR Person",
      investorType: "Sovereign wealth fund",
      strategyFit: "Active mandate",
      strategyType: "Multi-strat",
      lpLocation: "APAC",
      investmentRemit: "Global",
      typicalCheckSize: "$100M+",
      fundSizePreference: "No cap",
      source: "Direct",
      lastFundHistory: "New prospect",
      decisionTimeline: "Q2",
      fiscalYearEnd: "Mar",
      consultantDependent: "Direct",
      esgRequired: "No",
      nextMove: "Intro call tomorrow — confirm time for fund discussion",
      openLoops: 2,
      band: "Active-Stable",
      lastMeetingDate: undefined,
      contactSeniority: "CIO",
    },
    {
      name: "Camille Durand",
      firm: "Amundi (FoF)",
      daysSinceLastMeaningfulContact: 18,
      stage: "Active diligence",
      momentumDirection: "Cooling",
      tier: "Tier 2",
      relationshipOwner: "You",
      investorType: "Fund-of-funds",
      strategyFit: "Active mandate",
      strategyType: "Multi-strat",
      lpLocation: "EMEA",
      investmentRemit: "Europe only",
      typicalCheckSize: "$25–50M",
      fundSizePreference: "≤10% of fund",
      source: "Conference",
      lastFundHistory: "New prospect",
      decisionTimeline: "Q2",
      fiscalYearEnd: "Dec",
      consultantDependent: "Direct",
      esgRequired: "Yes",
      nextMove: "Brief relationship check-in ahead of Q2 allocation read",
      openLoops: 1,
      band: "Cooling",
      lastMeetingDate: "2025-03-05",
      contactSeniority: "Director",
    },
  ];

  for (let s = 0; s < scenarioLps.length; s++) {
    const p = scenarioLps[s]!;
    rels.push({
      id: `r${s + 5}`,
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

  // r10–r150: Generated with realistic distribution (50 original + 100 extended)
  const stages: Stage[] = ["First contact", "Deck sent", "Met", "Nurturing", "Active diligence", "DD", "Soft circle", "Closed", "Pass"];
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

  for (let i = 9; i < 150; i++) {
    const name = namePool[(i - 9) % namePool.length]!;
    const firm = firmPool[(i - 9) % firmPool.length]!;
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
      stage: pick(stages, [10, 14, 10, 8, 8, 6, 5, 3, 5], rng),
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

/** Generated LP rows (used when `exports/mock-relationships.csv` is missing or invalid). */
export const relationshipsGenerated: Relationship[] = generateRelationships();

export const actions: ActionItem[] = [
  {
    id: "a1",
    title: "PAAMCO Prisma Meeting Request",
    attentionCard: {
      company: "PAAMCO Prisma",
      contactName: "Peter Zakowich",
      verb: "Approve",
      workKind: "Scheduling",
      workSubject: "March 18 meeting — propose slots",
    },
    status: "approval",
    trigger: "Meeting request via email",
    evidence: [
      "Peter Zakowich emailed at 11pm requesting a meeting March 18.",
      "Calendar shows you're free at 9am and 11am ET that day.",
      "TOMO drafted a reply proposing both slots.",
    ],
    type: "scheduling",
    draft:
      "Hi Peter — thanks for reaching out. I'm free March 18 at 9:00am or 11:00am ET for 30 minutes. Please let me know which works best and I'll send a calendar invite.\n\nBest regards,",
    dueDate: "2025-03-17",
    workflowTomoDefaultId: "td-email-scheduling",
    emailSourceUrl:
      "mailto:peter.zakowich@example.com?subject=Re%3A%20March%2018%20meeting%20request",
    drawerWhySurfaced: {
      body: "Peter emailed asking for time on March 18 to discuss allocation timeline and manager-comparison materials. He has been in active diligence 22 days. Your calendar shows 9am and 11am ET free — Tomo drafted a reply proposing both. Reply target is end-of-day to keep the meeting in the same week.",
      stamp: "Computed 07:16 · From inbound + calendar",
    },
    drawerDraftMeta: {
      to: "peter.zakowich@paamcoprisma.com",
      subject: "RE: PAAMCO allocation review — March 18",
      footnote: "94 words · drafted 07:16 today · sending from geoffrey@tomosolutions.ai",
    },
    drawerCommitments: [
      { label: "Bring manager-comparison spread from last week’s discussion", badge: "WITH REPLY" },
      { label: "Include allocation timeline against Q2 close", badge: "WITH REPLY" },
    ],
    drawerSpecHeader: {
      subtitle: "Managing Director · Tier 1 · Fund-of-funds",
      statusPills: [
        { tone: "amber", label: "Reply due today" },
        { tone: "teal", label: "Active diligence · 22d" },
      ],
      links: [
        {
          href: "mailto:peter.zakowich@example.com?subject=Re%3A%20March%2018%20meeting%20request",
          label: "Open thread in Gmail",
          icon: "envelope",
        },
        { href: "https://calendar.google.com/calendar/u/0/r/week", label: "Open calendar", icon: "calendar" },
        { href: "/relationships", label: "Open LP record", icon: "clock" },
      ],
    },
    activityLog: [
      {
        id: "al-a1-1",
        ts: "Today 06:42",
        actor: "User",
        summary: "Email · Asked for March 18 meeting",
        detail: "“Could we find time on March 18 to walk through the allocation timeline and the manager-comparison spread…”",
      },
      {
        id: "al-a1-2",
        ts: "Today 07:16",
        actor: "TOMO",
        summary: "Detected meeting request, drafted reply with two open slots",
        detail: "Checked calendar for March 18 ET. Selected 9am and 11am from four available slots, weighted toward earlier in the day per Peter’s stated preference window.",
      },
      {
        id: "al-a1-3",
        ts: "Wed 15:20",
        actor: "User",
        summary: "Call · Reviewed allocation timeline with PAAMCO Prisma and aligned next steps",
        detail: "30 min · Peter walked through their Q2 review process. Promised manager-comparison spread by today. Logged manually.",
      },
      {
        id: "al-a1-4",
        ts: "Tue 11:00",
        actor: "User",
        summary: "Meeting · Walked through Q4 performance, requested follow-up materials",
        detail: "60 min in person, San Francisco. Peter requested attribution detail and the manager-comparison spread.",
      },
      {
        id: "al-a1-5",
        ts: "Mon 10:30",
        actor: "TOMO",
        summary: "Signal change · Reply velocity tightened",
        detail: "Last 3 exchanges: 22h, 14h, 6h. Typical for this LP is 18h. Pattern starting to emerge — early sign of acceleration.",
      },
    ],
  },
  {
    id: "a2",
    title: "GS Cap Intro: Michel del Buono Edmond de Rothschild Family Office",
    attentionCard: {
      company: "Goldman Sachs (intro)",
      contactName: "Michel del Buono",
      verb: "Approve",
      workKind: "Introduction",
      workSubject: "Edmond de Rothschild Family Office — reply due",
    },
    status: "approval",
    trigger: "Introduction via email",
    evidence: [
      "Liyen Chow connected you to Michel via email 2 days ago.",
      "You have not responded yet.",
      "TOMO drafted a personalised intro reply referencing Liyen and your Q4 performance.",
    ],
    type: "follow_up",
    draft:
      "Hi Michel — great to meet you, and thank you Liyen for the introduction.\n\nBrief context: we had a strong Q4 and are speaking with a small set of aligned allocator relationships. I'd welcome a short intro call at your convenience.\n\nBest regards,",
    dueDate: "2025-03-26",
    workflowPlaybookId: "pb-intro-tracker",
    emailSourceUrl: "mailto:michel.delbuono@example.com?subject=Introduction%20from%20Liyen",
    drawerWhySurfaced: {
      body: "Liyen Chow connected you to Michel two days ago regarding Edmond de Rothschild Family Office. No reply yet — intro responses within 24h protect the warm path. Tomo drafted a reply that thanks Liyen, sets brief context, and proposes a short intro call.",
      stamp: "Computed 08:00 · From intro thread + CRM",
    },
    drawerDraftMeta: {
      to: "michel.delbuono@edrfamilyoffice.com",
      ccPlaceholder: "Liyen Chow",
      subject: "Re: Introduction from Liyen — great to connect",
      footnote: "112 words · drafted 08:00 today · sending from geoffrey@tomosolutions.ai",
    },
    drawerCommitments: [
      { label: "Acknowledge Liyen on the thread", badge: "IN REPLY" },
      { label: "Propose two intro-call windows this month", badge: "THIS WEEK" },
    ],
    drawerSpecHeader: {
      subtitle: "Head of Private Investments · Edmond de Rothschild Family Office",
      statusPills: [
        { tone: "amber", label: "Reply due today" },
        { tone: "navy", label: "Warm intro · 2d" },
      ],
      links: [
        { href: "mailto:michel.delbuono@example.com?subject=Introduction%20from%20Liyen", label: "Open thread in Gmail", icon: "envelope" },
        { href: "/relationships", label: "Open LP record", icon: "clock" },
      ],
    },
    activityLog: [
      {
        id: "al-a2-1",
        ts: "2d ago",
        actor: "User",
        summary: "Email · Intro from Liyen Chow (CC’d)",
        detail: "Michel introduced as head of private investments; interested in allocator reads timing.",
      },
      {
        id: "al-a2-2",
        ts: "Today 08:00",
        actor: "TOMO",
        summary: "Flagged unresponded intro — drafted reply",
        detail: "References Q4 performance line from your investor update; tone matches your default intro template.",
      },
    ],
  },
  {
    id: "a3",
    title: "Albourne Partners post meeting note not sent",
    attentionCard: {
      company: "Albourne Partners",
      contactName: "James Staltari",
      verb: "Approve",
      workKind: "Follow-up",
      workSubject: "Post-meeting note (SLA)",
    },
    status: "blocked",
    trigger: "You did not approve TOMO's email summary and next steps",
    evidence: [
      "The why is explicit: you did not approve TOMO's email summary and next steps — SLA clock is running.",
      "Meeting with James Staltari yesterday; recap covered portfolio positioning, liquidity terms, and path toward Q2 allocator reads.",
      "Post-meeting thank-you required within 2 hours — now overdue. Review draft, add CRM tasks, schedule James + your COO within two weeks.",
    ],
    type: "follow_up",
    suggestedUpdates: [
      "CRM task: capture meeting outcomes + owners from yesterday's Albourne sync",
      "CRM task: schedule internal prep before James + COO call",
      "Commitment: book James Staltari + COO within 14 days",
    ],
    draft:
      "Hi James — thank you for yesterday's time. Quick recap: we covered portfolio positioning, liquidity terms, and next steps toward Q2 allocator reads. I'll follow up with the materials we discussed and propose times for a call with our COO.\n\nBest regards,",
    dueDate: "2025-03-25",
    workflowPlaybookId: "pb-post-meeting",
    workflowPillOverride: "Tomo",
    emailSourceUrl: "mailto:james.staltari@albourne.com?subject=Post-meeting%20follow-up",
    drawerWhySurfaced: {
      body: "Yesterday’s 90-minute meeting ended at 16:00. Your Post-Meeting Follow-Up workflow has a 2-hour SLA on summary notes; the draft has been waiting on your approval since 16:45 yesterday. James asked for portfolio-positioning materials and a call with your COO — both are open commitments and should be acknowledged in the reply.",
      stamp: "Computed 09:00 · From meeting recap + 14d activity",
    },
    drawerDraftMeta: {
      to: "james.staltari@albourne.com",
      ccPlaceholder: "",
      subject: "Yesterday’s discussion — materials and next steps",
      footnote: "217 words · drafted 16:45 yesterday · sending from geoffrey@tomosolutions.ai",
    },
    drawerCommitments: [
      { label: "Send portfolio positioning deck + Q1 attribution", badge: "DUE FRI" },
      { label: "Include Fund III side-letter language as reference", badge: "WITH DECK" },
      { label: "Propose two times for COO call next week", badge: "THIS WEEK" },
    ],
    drawerSpecHeader: {
      subtitle: "Senior Investment Consultant · Tier 1 · Hedge fund advisory",
      statusPills: [
        { tone: "red", label: "SLA past · 26h" },
        { tone: "teal", label: "Active diligence" },
      ],
      links: [
        { href: "mailto:james.staltari@albourne.com?subject=Post-meeting%20follow-up", label: "Open thread in Outlook", icon: "envelope" },
        { href: "https://www.linkedin.com/in/james-staltari-mock", label: "LinkedIn", icon: "linkedin" },
        { href: "/relationships", label: "Open LP record", icon: "clock" },
      ],
    },
    activityLog: [
      {
        id: "al-a3-1",
        ts: "Yesterday 14:30",
        actor: "User",
        summary: "Meeting · Albourne Partners (in person, London)",
        detail: "90 min. Walked through portfolio positioning, liquidity terms, side-letter precedents. James pressed on gate provision rationale; agreed to follow up with reference to Fund III. Scoped a COO call for Q2 allocator reads.",
      },
      {
        id: "al-a3-2",
        ts: "Yesterday 16:45",
        actor: "TOMO",
        summary: "Drafted post-meeting follow-up from Teams transcript + recap",
        detail: "Recap path: Microsoft 365 Copilot. Captured three commitments, drafted reply against your tone profile. “Useful conversation, and I appreciated the directness…”",
      },
      {
        id: "al-a3-3",
        ts: "Today 09:00",
        actor: "TOMO",
        summary: "SLA reminder — still awaiting your approval",
        detail: "Post-Meeting Follow-Up workflow target is 2 hours. Currently past target.",
      },
      {
        id: "al-a3-4",
        ts: "Tue 11:42",
        actor: "User",
        summary: "Email · “Confirming tomorrow at 14:30, looking forward.”",
        detail: "Reply length 14 words. Reply velocity 6h, typical 18h for this LP — pre-meeting engagement was strong.",
      },
      {
        id: "al-a3-5",
        ts: "Mon 09:15",
        actor: "User",
        summary: "Email · Sent meeting agenda + portfolio one-pager",
        detail: "Pre-read materials shared 24h before meeting. James acknowledged within 6 hours.",
      },
    ],
  },
  {
    id: "a4",
    title: "GIC has not confirmed meeting time for new fund launch",
    attentionCard: {
      company: "GIC",
      contactName: "Kwong Hong Huat",
      verb: "Approve",
      workKind: "Follow-up",
      workSubject: "Meeting confirm — new fund",
    },
    status: "approval",
    trigger: "No reply from recipient for 2 days",
    evidence: [
      "You sent an email to Kwong Hong Huat @ GIC 2 days ago proposing times for the new fund launch discussion.",
      "No response yet.",
      "TOMO drafted a polite follow-up to Mr. Kwong and his EA.",
    ],
    type: "follow_up",
    draft:
      "Dear Mr. Kwong — following up on my note from two days ago regarding the new fund launch discussion. Still very keen to find time that works for you. Copying your EA for scheduling convenience.\n\nKind regards,",
    dueDate: "2025-03-27",
    workflowPlaybookId: "pb-no-response-stall",
    emailSourceUrl: "mailto:kwong.hong.huat@gic.com.sg?subject=Re%3A%20New%20fund%20launch%20discussion",
    drawerWhySurfaced: {
      body: "You proposed times for the new fund launch discussion two days ago; Kwong has not confirmed. Copying his EA keeps scheduling friction low. Tomo drafted a polite bump that preserves optionality and references the prior thread.",
      stamp: "Computed 08:30 · From outbound thread + silence window",
    },
    drawerDraftMeta: {
      to: "kwong.hong.huat@gic.com.sg",
      ccPlaceholder: "EA (scheduling)",
      subject: "Re: New fund launch discussion — following up",
      footnote: "86 words · drafted 08:30 today · sending from geoffrey@tomosolutions.ai",
    },
    drawerCommitments: [
      { label: "Offer two alternate weeks if March slots stall", badge: "OPTIONAL" },
      { label: "Attach one-pager link already shared", badge: "IN THREAD" },
    ],
    drawerSpecHeader: {
      subtitle: "Sovereign wealth fund · Singapore",
      statusPills: [
        { tone: "amber", label: "No reply · 2d" },
        { tone: "teal", label: "New fund launch" },
      ],
      links: [
        { href: "mailto:kwong.hong.huat@gic.com.sg?subject=Re%3A%20New%20fund%20launch%20discussion", label: "Open thread in Outlook", icon: "envelope" },
        { href: "/relationships", label: "Open LP record", icon: "clock" },
      ],
    },
    activityLog: [
      {
        id: "al-a4-1",
        ts: "2d ago",
        actor: "User",
        summary: "Email · Proposed three slots for new fund launch discussion",
        detail: "Kwong acknowledged receipt same day; no calendar hold yet.",
      },
      {
        id: "al-a4-2",
        ts: "Today 08:30",
        actor: "TOMO",
        summary: "No reply — drafted follow-up to Kwong + EA",
        detail: "Tone: light touch; references EA for logistics; no new asks beyond scheduling.",
      },
    ],
  },
  {
    id: "a5",
    title: "Monthly Momentum Report is Ready for Review",
    attentionCard: {
      company: "Investor relations",
      contactName: "Monthly newsletter cohort",
      verb: "Review",
      workKind: "Report",
      workSubject: "Engagement vs last 3 months",
    },
    status: "in_progress",
    trigger: "TOMO analysed opens from the monthly newsletter and identified the most active LPs",
    evidence: [
      "Top openers this send: PAAMCO Prisma, GIC, Edelweiss Endowment.",
      "Compare this send to the prior three months: who moved up / down in engagement.",
      "Flag LPs who dropped out of the top-engaged tier for proactive outreach.",
      "Pairs with Daily Brief — Momentum Signals (newsletter view).",
    ],
    type: "outreach",
    dueDate: "2025-03-28",
    workflowPlaybookId: "pb-update-followup",
    emailSourceUrl: "mailto:ir-newsletter@example.com?subject=Monthly%20Momentum%20Report",
    drawerWhySurfaced: {
      body: "This send’s open/click data is ingested; deltas vs the trailing three months are computed. Review highlights before you push follow-ups — top openers and cooling names are called out in the evidence block.",
      stamp: "Computed 06:45 · From newsletter analytics",
    },
    drawerCommitments: [
      { label: "Confirm top 5 risers for proactive outreach", badge: "TODAY" },
      { label: "Queue follow-up drafts for cooling tier-1 LPs", badge: "THIS WEEK" },
      { label: "Sync narrative with Daily Brief — Momentum Signals", badge: "OPTIONAL" },
    ],
    drawerSpecHeader: {
      subtitle: "Newsletter cohort · Engagement analytics",
      statusPills: [
        { tone: "amber", label: "Review" },
        { tone: "navy", label: "In progress" },
      ],
      links: [
        { href: "mailto:ir-newsletter@example.com?subject=Monthly%20Momentum%20Report", label: "Open thread in Gmail", icon: "envelope" },
        { href: "/relationships", label: "Open LP record", icon: "clock" },
      ],
    },
    activityLog: [
      {
        id: "al-a5-1",
        ts: "Today 06:30",
        actor: "TOMO",
        summary: "Ingested latest newsletter open/click data",
        detail: "PAAMCO Prisma, GIC, and Edelweiss Endowment lead open depth; attach rates within normal band.",
      },
      {
        id: "al-a5-2",
        ts: "Today 06:45",
        actor: "TOMO",
        summary: "Built momentum deltas vs trailing 3 months",
        detail: "Segmented risers vs fallers; flagged LPs who dropped out of the top-engaged tier.",
      },
    ],
  },
  {
    id: "a6",
    title: "Amundi FoF — relationship cooling",
    attentionCard: {
      company: "Amundi (FoF)",
      contactName: "Camille Durand",
      verb: "Approve",
      workKind: "Check-in",
      workSubject: "18d since contact — Q2 read",
    },
    status: "approval",
    trigger: "No meaningful contact in 18 days; allocation decision expected Q2",
    evidence: [
      "Last meeting seemed positive; no touchpoints since.",
      "Allocation decision expected Q2 — brief check-in reduces stall risk.",
      "TOMO drafted a short check-in; review before send.",
    ],
    type: "follow_up",
    draft:
      "Hi Camille — hope you're well. Wanted to check in ahead of your Q2 process and see if a short call would be helpful on our side. Happy to work around your schedule.\n\nBest regards,",
    dueDate: "2025-03-29",
    workflowPlaybookId: "pb-no-response-stall",
    emailSourceUrl: "mailto:camille.durand@amundi.com?subject=Check-in%20ahead%20of%20Q2",
    drawerWhySurfaced: {
      body: "Eighteen days without a meaningful touch while Q2 allocation read approaches. Last call tone was positive — a short check-in reduces stall risk without forcing a decision.",
      stamp: "Computed 07:00 · From silence window + stage context",
    },
    drawerDraftMeta: {
      to: "camille.durand@amundi.com",
      subject: "Re: Quick check-in ahead of Q2",
      footnote: "68 words · drafted 07:00 today · sending from geoffrey@tomosolutions.ai",
    },
    drawerCommitments: [
      { label: "Offer two specific call windows", badge: "IN REPLY" },
      { label: "Reference last positive call in one line", badge: "DONE" },
    ],
    drawerSpecHeader: {
      subtitle: "Director · Fund-of-funds · Paris",
      statusPills: [
        { tone: "amber", label: "18d since contact" },
        { tone: "teal", label: "Q2 read window" },
      ],
      links: [
        { href: "mailto:camille.durand@amundi.com?subject=Check-in%20ahead%20of%20Q2", label: "Open thread in Outlook", icon: "envelope" },
        { href: "/relationships", label: "Open LP record", icon: "clock" },
      ],
    },
    activityLog: [
      {
        id: "al-a6-1",
        ts: "18d ago",
        actor: "User",
        summary: "Call · Amundi FoF (positive tone)",
        detail: "Discussed pacing to Q2 IC; Camille asked for materials when the DDQ index updates.",
      },
      {
        id: "al-a6-2",
        ts: "Today 07:00",
        actor: "TOMO",
        summary: "Cooling signal — drafted check-in email",
        detail: "Uses soft ask; no attachment pressure; aligns with Silence → Re-engage playbook.",
      },
    ],
  },
  {
    id: "a7",
    title: "Peakline — Q2 read: deck follow-up not acknowledged",
    attentionListDayOffset: 1,
    attentionCard: {
      company: "Peakline Partners",
      contactName: "Jamie Chen",
      verb: "Approve",
      workKind: "Follow-up",
      workSubject: "DDQ index + risk deck (carried from yesterday)",
    },
    status: "approval",
    trigger: "LP opened deck twice; no reply to your 3-day check-in",
    evidence: [
      "Jamie’s team re-opened the risk stack last week; still no response to the note you sent after the UBS call.",
      "Q2 allocation read is 6 weeks out — a short nudge keeps you in the active set.",
    ],
    type: "follow_up",
    draft:
      "Hi Jamie — quick note following up on the materials from last week. Let me know if you’d like a short call to walk the DDQ index or if anything is blocking on your side.\n\nBest regards,",
    dueDate: "2025-03-20",
    workflowPlaybookId: "pb-no-response-stall",
    emailSourceUrl: "mailto:jamie.chen@example.com?subject=Re%3A%20Q2%20read%20materials",
    drawerWhySurfaced: {
      body: "Carried from yesterday’s queue: Jamie’s team re-opened the risk stack but has not replied to your check-in after the UBS call. Q2 read is six weeks out — a concise nudge keeps Peakline in the active set.",
      stamp: "Computed 4:00 PM · From engagement signals + backlog",
    },
    drawerDraftMeta: {
      to: "jamie.chen@peakline.com",
      subject: "Re: Q2 read materials — quick follow-up",
      footnote: "74 words · drafted yesterday · sending from geoffrey@tomosolutions.ai",
    },
    drawerCommitments: [
      { label: "Offer 20m call to walk DDQ index", badge: "IN REPLY" },
      { label: "Confirm if anything blocks their side", badge: "IN REPLY" },
    ],
    drawerSpecHeader: {
      subtitle: "Director · Fund-of-funds · Peakline",
      statusPills: [
        { tone: "amber", label: "Carried · Prior day" },
        { tone: "navy", label: "Q2 read · 6w" },
      ],
      links: [
        { href: "mailto:jamie.chen@example.com?subject=Re%3A%20Q2%20read%20materials", label: "Open thread in Gmail", icon: "envelope" },
        { href: "/relationships", label: "Open LP record", icon: "clock" },
      ],
    },
    activityLog: [
      {
        id: "al-a7-1",
        ts: "2d ago",
        actor: "User",
        summary: "Email · Sent Q2 read materials + check-in",
        detail: "Attached risk stack + DDQ index; asked for timing on allocator read.",
      },
      {
        id: "al-a7-2",
        ts: "Yesterday 4:00 PM",
        actor: "TOMO",
        summary: "Surfaced for attention — no reply",
        detail: "Deck opened twice since send; no thread response — matches playbook threshold.",
      },
    ],
  },
  {
    id: "a8",
    title: "Lumen LP — engagement cooling, doc request unfulfilled",
    attentionListDayOffset: 1,
    attentionCard: {
      company: "Lumen LP",
      contactName: "Priya Desai",
      verb: "Approve",
      workKind: "Nudge",
      workSubject: "Data room + consultant questions",
    },
    status: "in_progress",
    trigger: "Consultant thread stalled after you shared the index",
    evidence: [
      "Priya’s consultant asked for two clarifications; neither thread has a reply in 4 days.",
      "TOMO drafted a combined reply and suggested one owner on your side.",
    ],
    type: "follow_up",
    draft:
      "Hi Priya — circling back on the open items from the consultant review. I’ve attached the clarifications; happy to find 20 minutes this week if helpful.\n\nBest regards,",
    dueDate: "2025-03-24",
    workflowPlaybookId: "pb-no-response-stall",
    emailSourceUrl: "mailto:priya.desai@example.com?subject=Re%3A%20Consultant%20follow-up",
    drawerWhySurfaced: {
      body: "Consultant asked for two clarifications on the data room index; neither thread has a reply in four days. A single combined reply reduces back-and-forth and assigns one owner on your side.",
      stamp: "Computed 08:00 · From thread stall detection",
    },
    drawerDraftMeta: {
      to: "priya.desai@lumenlp.com",
      subject: "Re: Consultant review — clarifications",
      footnote: "92 words · drafted yesterday · sending from geoffrey@tomosolutions.ai",
    },
    drawerCommitments: [
      { label: "Attach consultant clarifications (pending upload)", badge: "BEFORE SEND" },
      { label: "Propose 20 minutes this week if questions remain", badge: "IN REPLY" },
    ],
    drawerSpecHeader: {
      subtitle: "Principal · Family office · Lumen",
      statusPills: [
        { tone: "amber", label: "Consultant stall · 4d" },
        { tone: "navy", label: "In progress" },
      ],
      links: [
        { href: "mailto:priya.desai@example.com?subject=Re%3A%20Consultant%20follow-up", label: "Open thread in Gmail", icon: "envelope" },
        { href: "/relationships", label: "Open LP record", icon: "clock" },
      ],
    },
    activityLog: [
      {
        id: "al-a8-1",
        ts: "4d ago",
        actor: "User",
        summary: "Email · Shared data room + index",
        detail: "Consultant CC’d; two numbered questions in thread.",
      },
      {
        id: "al-a8-2",
        ts: "Yesterday 8:00 AM",
        actor: "TOMO",
        summary: "Flagged stall — combined reply ready",
        detail: "Merged answers into one draft; suggests single IR owner for continuity.",
      },
    ],
  },
  {
    id: "a9",
    title: "Harborlight — re-engage after pass (optional lift)",
    attentionListDayOffset: 2,
    attentionCard: {
      company: "Harborlight Advisors",
      contactName: "Samir Patel",
      verb: "Review",
      workKind: "Outreach",
      workSubject: "Q4 performance snapshot (older queue)",
    },
    status: "approval",
    trigger: "Relationship marked Pass — optional light touch with performance snapshot",
    evidence: [
      "Their allocator desk indicated they may re-open the file if returns stabilize.",
      "Low-risk one-pager; no commitment implied.",
    ],
    type: "outreach",
    draft:
      "Hi Samir — I’m sharing a short Q4 performance snapshot in case it’s useful for your files. No action needed; here if a conversation becomes timely.\n\nBest regards,",
    dueDate: "2025-03-19",
    workflowPlaybookId: "pb-no-response-stall",
    emailSourceUrl: "mailto:samir.patel@example.com?subject=Performance%20snapshot%20%28Q4%29",
    drawerWhySurfaced: {
      body: "Relationship is marked Pass; allocator desk noted they may re-open if returns stabilize. This is an optional, low-commitment one-pager — dismiss if you prefer no outbound.",
      stamp: "Computed 1w ago · From re-engagement rules (older queue)",
    },
    drawerDraftMeta: {
      to: "samir.patel@harborlight.com",
      subject: "Q4 performance snapshot (for your files)",
      footnote: "58 words · draft on file · sending from geoffrey@tomosolutions.ai",
    },
    drawerCommitments: [
      { label: "No meeting ask unless they reply", badge: "POLICY" },
      { label: "Attach one-pager v1 only", badge: "OPTIONAL" },
    ],
    drawerSpecHeader: {
      subtitle: "Advisor · Harborlight · Optional touch",
      statusPills: [
        { tone: "navy", label: "Pass · optional" },
        { tone: "amber", label: "Older queue" },
      ],
      links: [
        { href: "mailto:samir.patel@example.com?subject=Performance%20snapshot%20%28Q4%29", label: "Open thread in Gmail", icon: "envelope" },
        { href: "/relationships", label: "Open LP record", icon: "clock" },
      ],
    },
    activityLog: [
      {
        id: "al-a9-1",
        ts: "1w ago",
        actor: "TOMO",
        summary: "Suggested re-engagement (optional)",
        detail: "Passes low-confidence revive test; surfaced in older queue per playbook.",
      },
      {
        id: "al-a9-2",
        ts: "3d ago",
        actor: "User",
        summary: "CRM · Confirmed Pass + allocator desk note",
        detail: "File may re-open if returns stabilize — keep touch minimal.",
      },
    ],
  },
];

export const commitments: Commitment[] = [
  {
    id: "c1",
    title: "HF Update",
    datetime: "Today 2:00 PM ET",
    lp: "UBS",
    contactName: "Charly Malek",
    briefId: "b3",
    window: "today",
    prepStatus: "ready",
    calendarUrl: "https://calendar.google.com/calendar/u/0/r/week",
    drawerPrepEyebrow: "Meeting prep · Quarterly HF Update",
    drawerPrepTitle: "UBS Hedge Fund Solutions · Charly Malek",
    drawerTimeStrip: {
      rangeLabel: "Today · 2:00 — 2:45 PM ET",
      whereLabel: "Zoom",
      joinUrl: "https://zoom.us/j/0000000000",
    },
    drawerThreadLink: {
      href: "mailto:charly.malek@ubs.com?subject=Re%3A%20HF%20Update",
      label: "Latest thread (3d ago)",
    },
    drawerWhySurfaced: {
      label: "What changed since you last spoke",
      body: "Charly's team re-opened the risk attribution and capacity sections of your January investor pack twice this week — the second visit was at 11pm Zurich time, longer than 12 minutes. UBS is in active diligence on three other managers in your strategy bucket. The re-up window for Fund III closes Q3; Charly has not yet confirmed Fund III interest in writing, but allocator behaviour suggests they are pricing it.",
      stamp: "Computed 09:00 · From email metadata + portal access logs (mock)",
    },
    drawerAttendees: [
      {
        initials: "CM",
        name: "Charly Malek",
        role: "Head of Manager Research, UBS HFS",
        context:
          "Decision-maker on UBS HFS hedge fund allocations. Typically does not commit on a single call. Last met in person at the Zurich roadshow 4 months ago. Her note from that meeting flagged \"attribution clarity\" as the open question.",
        linkedInUrl: "https://www.linkedin.com/in/charly-malek-mock",
      },
      {
        initials: "DR",
        name: "Daniel Roth",
        role: "Senior Investment Analyst",
        context:
          "New on the UBS HFS team since January. Authored the internal capacity memo that accessed your portal last week. Likely to drive the technical questions today.",
        linkedInUrl: "https://www.linkedin.com/in/daniel-roth-mock",
      },
    ],
    drawerLastTouch: [
      {
        segments: [
          {
            kind: "text",
            text: "Last call with Charly was the Q4 update on January 21 (45 min, Zoom). You walked through 2025 attribution and the capacity outlook. Charly asked two pointed questions: how the strategy performed in the August vol spike specifically, and whether the soft-close timeline allowed for a Fund III increase from existing LPs.",
          },
        ],
      },
      {
        segments: [
          {
            kind: "text",
            text: "You committed to two things: ",
          },
          {
            kind: "quote",
            text: "send the August attribution detail by end of week",
          },
          {
            kind: "text",
            text: " (delivered Jan 24) and ",
          },
          {
            kind: "quote",
            text: "come back with a capacity view for existing LPs ahead of Q2 close",
          },
          {
            kind: "text",
            text: " — that's what today is for.",
          },
        ],
      },
      {
        segments: [
          {
            kind: "text",
            text: "Tone of last meeting: warm, technical, no concerns flagged on people or process. The diligence question is sizing, not whether.",
          },
        ],
      },
    ],
    drawerMeetingCommitments: [
      {
        label: "August vol-spike attribution detail",
        source: "Promised on Jan 21 call · sent Jan 24",
        prepState: "delivered",
      },
      {
        label: "Fund III capacity view for existing LPs",
        source: "Promised on Jan 21 call · today's discussion",
        prepState: "for_today",
      },
      {
        label: "Side-letter terms summary (Fund II precedent)",
        source: "Charly raised in Mar 4 email · not yet sent",
        prepState: "queued",
      },
    ],
    drawerSuggestedFocus: [
      {
        num: "01",
        lead: "Get Fund III on the record.",
        rest: "Charly has not committed in writing. Today is the call to ask directly:",
        evidence: "\"Are you tracking a Fund III ticket from UBS HFS, and if so, in what range?\" The capacity ask is the natural opening — they need a number from you to size theirs.",
      },
      {
        num: "02",
        lead: "Address the attribution sections directly.",
        rest: "Daniel Roth re-opened risk attribution and capacity twice in the last week. Pre-empt the technical questions; don't wait for them.",
      },
      {
        num: "03",
        lead: "Be explicit on the Q3 close timeline.",
        rest: "If UBS wants to size up, they need to know the gating dates.",
        evidence: "Fund III soft-close: July 31. Hard close: September 30.",
      },
      {
        num: "04",
        lead: "Note the side-letter ask is open.",
        rest: "If it doesn't come up naturally, surface it before they do — getting ahead of it signals diligence on your side.",
      },
    ],
    drawerPrepMaterials: [
      {
        name: "Q1 Investor Pack — UBS edition",
        meta: "PDF · sent to Charly Apr 15 · she opened twice this week",
        href: "/materials",
      },
      {
        name: "August vol-spike attribution memo",
        meta: "PDF · sent Jan 24 in response to Charly's question",
        href: "/materials",
      },
      {
        name: "Fund III capacity model — existing LPs",
        meta: "XLSX · prepared for today · not yet sent",
        href: "/materials",
      },
    ],
    drawerPrepLabels: {
      attendees: "Who's on the call",
      lastTouch: "Where you left things",
      openCommitments: "Open commitments to UBS",
      focus: "What to push on",
      materials: "Materials at hand",
      activityPreview: "Recent activity (last 30 days)",
    },
    drawerActivityHistoryTotal: 84,
    drawerSpecHeader: {
      subtitle: "Head of Manager Research · Tier 1 · Existing investor since Fund II",
      statusPills: [
        { tone: "teal", label: "Existing investor" },
        { tone: "amber", label: "Re-up window — Fund III closing Q3" },
      ],
      links: [{ href: "/relationships", label: "Open LP record", icon: "clock" }],
    },
    activityLog: [
      {
        id: "al-c1-1",
        ts: "This week",
        actor: "TOMO",
        summary: "Investor pack re-opened twice this week",
        detail: "Sections accessed: risk attribution, capacity. Second visit 11pm Zurich time.",
      },
      {
        id: "al-c1-2",
        ts: "3d ago",
        actor: "User",
        summary: "Email · Confirmed today's call agenda focus on capacity",
        detail: "\"Looking forward to the conversation Thursday — particularly the capacity view…\"",
      },
      {
        id: "al-c1-3",
        ts: "3w ago",
        actor: "User",
        summary: "Email · Sent Q1 investor pack with capacity preview",
        detail: "Sent Apr 15. Charly acknowledged within 4 hours.",
      },
      {
        id: "al-c1-4",
        ts: "Mar 4",
        actor: "User",
        summary: "Email · Side-letter terms ask raised by Charly",
        detail: "\"On Fund III, would the Fund II side-letter terms carry over for existing LPs?\" Awaiting response — flagged as open commitment.",
      },
      {
        id: "al-c1-5",
        ts: "Jan 21",
        actor: "User",
        summary: "Q4 Update call · 45 min, Zoom",
        detail: "Walked through 2025 attribution, August vol-spike Q&A, Fund III timeline. Two open commitments captured.",
      },
    ],
  },
  {
    id: "c2",
    title: "Investment Update",
    datetime: "Today 4:00 PM ET",
    lp: "CPPIB",
    contactName: "Frank Ieraci",
    briefId: "b4",
    window: "today",
    prepStatus: "ready",
    relationshipId: "r6",
    calendarUrl: "https://calendar.google.com/calendar/u/0/r/week",
    drawerPrepEyebrow: "Meeting prep · Investment Update",
    drawerTimeStrip: {
      rangeLabel: "Today · 4:00 — 4:45 PM ET",
      whereLabel: "Zoom",
      joinUrl: "https://zoom.us/j/0000000001",
    },
    drawerThreadLink: {
      href: "mailto:frank.ieraci@cppib.com?subject=Re%3A%20Investment%20Update",
      label: "Latest thread (yesterday)",
    },
    drawerWhySurfaced: {
      label: "What changed since you last spoke",
      body: "Frank's reply time shortened from ~5 days to ~1 day across the last three exchanges — relationship accelerating. Co-invest deck is still outstanding from last week's commitment; DDQ index refresh is on today's ask list.",
      stamp: "Computed this morning · From brief b4 + signals (stub)",
    },
    drawerAttendees: [
      {
        initials: "FI",
        name: "Frank Ieraci",
        role: "Managing Director, Investment Management",
        context:
          "Leads allocator-side diligence for your sleeve. Last touch focused on liquidity terms and co-invest mechanics; expects concrete follow-through on materials.",
      },
    ],
    drawerLastTouch: [
      {
        segments: [
          {
            kind: "text",
            text: "Last week you aligned on IC path and timing for Fund III reads. Frank asked for the co-invest pack and an updated DDQ index — the deck is the overdue item on your side.",
          },
        ],
      },
    ],
    drawerMeetingCommitments: [
      {
        label: "Co-invest deck + path to IC",
        source: "Promised last week · not yet sent",
        prepState: "open",
      },
      {
        label: "Updated DDQ index",
        source: "Raised in materials request thread",
        prepState: "for_today",
      },
    ],
    drawerSuggestedFocus: [
      {
        num: "01",
        lead: "Close the co-invest loop first.",
        rest: "Acknowledge the delay, send or schedule send today, and offer a 10-minute walkthrough if helpful.",
      },
      {
        num: "02",
        lead: "Anchor liquidity terms.",
        rest: "Confirm whether last week's framing still holds for their IC narrative.",
      },
      {
        num: "03",
        lead: "Ask for the next gating date.",
        rest: "CPPIB runs process-heavy committees — get the realistic decision window on the record.",
      },
    ],
    drawerPrepMaterials: [
      {
        name: "DDQ index — CPPIB (draft v2)",
        meta: "PDF · refreshed yesterday · not sent",
        href: "/materials",
      },
    ],
    drawerPrepLabels: {
      lastTouch: "Where you left things",
      openCommitments: "Open commitments to CPPIB",
      focus: "What to push on",
      materials: "Materials at hand",
      activityPreview: "Recent activity",
    },
    drawerActivityHistoryTotal: 36,
    drawerSpecHeader: {
      subtitle: "Investment management · CPPIB",
      statusPills: [
        { tone: "teal", label: "Prep ready" },
        { tone: "amber", label: "Open loops · 2" },
      ],
      links: [{ href: "/relationships?focus=r6", label: "Open LP record", icon: "clock" }],
    },
    activityLog: [
      {
        id: "al-c2-1",
        ts: "Yesterday 16:20",
        actor: "User",
        summary: "Email · Frank confirmed 4pm + forwarded materials request",
        detail: "Asked for co-invest deck path and DDQ index refresh.",
      },
      {
        id: "al-c2-2",
        ts: "Yesterday 09:00",
        actor: "TOMO",
        summary: "Signal change · Reply velocity tightened (stub)",
        detail: "Last 3 exchanges: 5d → 3d → 1d vs 5d baseline for this LP.",
      },
      {
        id: "al-c2-3",
        ts: "Last week",
        actor: "User",
        summary: "Meeting · Liquidity terms + co-invest scope",
        detail: "Notes captured to brief; open loop on co-invest pack.",
      },
    ],
  },
  {
    id: "c3",
    title: "Intro Call",
    datetime: "Tomorrow 10:00 AM ET",
    lp: "GIC",
    contactName: "Kwong Hong Huat",
    briefId: "b5",
    window: "next72h",
    prepStatus: "first_contact",
    relationshipId: "r8",
    calendarUrl: "https://calendar.google.com/calendar/u/0/r/week",
    linkedInUrl: "https://www.linkedin.com/in/kwong-hong-huat-mock",
    drawerPrepEyebrow: "Meeting prep · First contact · Intro call",
    drawerPrepTitle: "GIC · Kwong Hong Huat",
    drawerTimeStrip: {
      rangeLabel: "Tomorrow · 10:00 — 10:30 AM ET",
      whereLabel: "Zoom",
      joinUrl: "https://zoom.us/j/0000000002",
    },
    drawerThreadLink: {
      href: "mailto:kwong@gic.com.sg?subject=Intro%20call%20%E2%80%94%20follow-up",
      label: "Intro thread",
    },
    drawerWhySurfaced: {
      label: "What you're walking into",
      body: "First live conversation with Kwong, introduced by Stuart Reid at Cambridge Associates last Wednesday. GIC is a Tier 1 sovereign — long evaluation cycles, structured process. Kwong is on the External Managers team specifically; intro context was about your strategy fit, not a specific allocation. Tomorrow is qualification: are they actively looking at this strategy, what's their process, who else gets involved, and what's a realistic timeline.",
      stamp: "Computed 09:00 · From intro thread + public sources (mock)",
    },
    drawerAttendees: [
      {
        initials: "KH",
        name: "Kwong Hong Huat",
        role: "SVP, External Managers, GIC",
        context:
          "Singapore-based. 11 years at GIC, prior to that at Temasek. External Managers team covers all third-party manager relationships across asset classes. Stuart's intro line: \"Geoff — Kwong is one of the sharpest people on the GIC bench. Worth the time.\"",
        linkedInUrl: "https://www.linkedin.com/in/kwong-hong-huat-mock",
      },
    ],
    drawerLastTouch: [
      {
        segments: [
          {
            kind: "text",
            text: "GIC manages over $700bn for the Singapore government. External Managers are part of their public markets and alternatives allocation framework. Their hedge fund book sits within the alternatives sleeve and tends toward larger, established managers — but the External Managers team has historically taken meetings with emerging managers at the strategy-fit stage.",
          },
        ],
      },
      {
        segments: [
          {
            kind: "text",
            text: "GIC's process is multi-stage and slow by design: initial conversation, then internal sponsor identification, then a formal RFI, then due diligence, then committee. From first call to close is typically 9–14 months for managers they end up sizing.",
          },
        ],
      },
      {
        segments: [
          {
            kind: "text",
            text: "Stuart's intro suggested strategy fit but did not specify a fund or allocation pool. Don't assume Fund III; ask which fund cycle they'd be evaluating.",
          },
        ],
      },
    ],
    drawerMeetingCommitments: [
      { label: "Circulate short deck after call", badge: "POST CALL" },
      { label: "Propose two follow-up slots", badge: "POST CALL" },
    ],
    drawerSuggestedFocus: [
      {
        num: "01",
        lead: "Earn nurturing.",
        rest: "First calls with sovereigns are not allocation conversations. They are",
        evidence: "\"do you want to learn more about us, and do we have a reason to keep talking.\"",
      },
      {
        num: "02",
        lead: "Map their process and timeline.",
        rest: "Where does External Managers sit in the GIC org chart? Who sponsors a manager internally? What does the early diligence look like?",
      },
      {
        num: "03",
        lead: "Test mandate fit honestly.",
        rest: "Don't oversell. If their strategy bucket isn't a fit, surface that directly — sovereigns remember managers who waste their time and managers who don't.",
      },
      {
        num: "04",
        lead: "Close with a specific next step.",
        rest: "Either (a) a follow-up with a written fund overview and a proposed second call window, or (b) an honest park if the fit isn't there.",
      },
    ],
    drawerPrepLabels: {
      attendees: "Who's on the call",
      lastTouch: "What we know going in",
      openCommitments: "Post-call commitments (template)",
      focus: "Goals for the 30 minutes",
      activityPreview: "Recent activity",
    },
    drawerActivityHistoryTotal: 12,
    drawerSpecHeader: {
      subtitle: "Senior Vice President, External Managers · Tier 1 · No prior contact",
      statusPills: [
        { tone: "navy", label: "First contact" },
        { tone: "teal", label: "Intro from Stuart Reid (Cambridge Associates) (mock)" },
      ],
      links: [
        { href: "/relationships?focus=r8", label: "Open LP record", icon: "clock" },
      ],
    },
    activityLog: [
      {
        id: "al-c3-1",
        ts: "Today 08:00",
        actor: "TOMO",
        summary: "Prep pack assembled — first-contact template",
        detail: "Credentials, strategy summary, and sizing guardrails included.",
      },
      {
        id: "al-c3-2",
        ts: "2d ago",
        actor: "User",
        summary: "Email · Kwong accepted intro window",
        detail: "Tomorrow 10am ET confirmed; EA on copy.",
      },
    ],
  },
  {
    id: "c4",
    title: "Intro Call",
    datetime: "Thu 3:00 PM ET",
    lp: "BNF Capital",
    contactName: "Nic Fallows",
    window: "next72h",
    prepStatus: "first_contact",
    commitmentOverdue: true,
    calendarUrl: "https://calendar.google.com/calendar/u/0/r/week",
    linkedInUrl: "https://www.linkedin.com/in/nic-fallows-mock",
    drawerPrepEyebrow: "Meeting prep · First contact · Intro call",
    drawerTimeStrip: {
      rangeLabel: "Thu · 3:00 — 3:30 PM ET",
      whereLabel: "Zoom",
      joinUrl: "https://zoom.us/j/0000000003",
    },
    drawerThreadLink: {
      href: "mailto:nic.fallows@bnf.example?subject=Intro%20%E2%80%94%20BNF",
      label: "Scheduling thread",
    },
    drawerWhySurfaced: {
      label: "What you're walking into",
      body: "First intro with BNF Capital — light CRM context. One prep deliverable is overdue; use the chip bar to mark progress after you send the short deck and propose follow-up slots.",
      stamp: "Computed today · From commitment state + stub checklist",
    },
    drawerAttendees: [
      {
        initials: "NF",
        name: "Nic Fallows",
        role: "Principal, BNF Capital",
        context: "Family office allocator covering alternatives sleeve. Meeting confirmed for Thursday; expects a tight credentials + mandate-fit arc.",
        linkedInUrl: "https://www.linkedin.com/in/nic-fallows-mock",
      },
    ],
    drawerLastTouch: [
      {
        segments: [
          {
            kind: "text",
            text: "No prior meeting history in TOMO — treat as a clean first touch. Keep one proof point, one clear ask, and two proposed times only.",
          },
        ],
      },
    ],
    drawerMeetingCommitments: [
      { label: "Circulate short deck after scheduling confirmed", badge: "OVERDUE" },
      { label: "Propose two follow-up slots", badge: "DUE" },
    ],
    drawerSuggestedFocus: [
      {
        num: "01",
        lead: "Ship the overdue deck today.",
        rest: "Short PDF or link is enough — don't wait for perfect polish.",
      },
      {
        num: "02",
        lead: "Offer two windows only.",
        rest: "Reduces back-and-forth and signals respect for their time.",
      },
    ],
    drawerPrepLabels: {
      focus: "What to push on",
      activityPreview: "Recent activity",
    },
    drawerActivityHistoryTotal: 8,
    drawerSpecHeader: {
      subtitle: "Family office · BNF Capital",
      statusPills: [
        { tone: "red", label: "Commitment overdue" },
        { tone: "navy", label: "First contact" },
      ],
      links: [
        { href: "https://www.linkedin.com/in/nic-fallows-mock", label: "LinkedIn", icon: "linkedin" },
        { href: "/relationships", label: "Open LP record", icon: "clock" },
      ],
    },
    activityLog: [
      {
        id: "al-c4-1",
        ts: "Yesterday",
        actor: "TOMO",
        summary: "Reminder — prep deliverables incomplete",
        detail: "Deck circulation not logged; follow-up slots not proposed.",
      },
      {
        id: "al-c4-2",
        ts: "3d ago",
        actor: "User",
        summary: "Call · Nic confirmed Thu 3pm ET",
        detail: "Intro scope: mandate fit and pacing only.",
      },
    ],
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
    drawerWhySurfaced: {
      body: "Tomorrow’s Q4 review with Northwind — brief is locked from last touchpoints. One open loop on allocation window; deck follow-up is the main prep output.",
      stamp: "Computed · From CRM + prior meeting notes",
    },
    drawerSpecHeader: {
      subtitle: "Family office · Tier 1 momentum",
      statusPills: [
        { tone: "teal", label: "Brief ready" },
        { tone: "amber", label: "1 open loop" },
      ],
      links: [
        { href: "/relationships", label: "Open LP record", icon: "clock" },
        { href: "https://calendar.google.com/calendar/u/0/r/week", label: "Open calendar", icon: "calendar" },
      ],
    },
    activityLog: [
      {
        id: "al-b1-1",
        ts: "Yesterday",
        actor: "TOMO",
        summary: "Brief assembled from last call notes + deck opens",
        detail: "Risk and pipeline themes flagged from allocator email thread.",
      },
      {
        id: "al-b1-2",
        ts: "Mon",
        actor: "User",
        summary: "Call · Aligned on Q4 narrative",
        detail: "Northwind asked for clearer pipeline view for IC.",
      },
    ],
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
    drawerWhySurfaced: {
      body: "Friday check-in: engagement signals show repeated deck opens — brief emphasizes scheduling and a tight three-bullet update to unblock their IC path.",
      stamp: "Computed · From materials engagement (stub)",
    },
    drawerSpecHeader: {
      subtitle: "Fund-of-funds · Q2 read path",
      statusPills: [
        { tone: "navy", label: "Brief updated" },
        { tone: "amber", label: "2 open loops" },
      ],
      links: [
        { href: "/relationships", label: "Open LP record", icon: "clock" },
        { href: "https://calendar.google.com/calendar/u/0/r/week", label: "Open calendar", icon: "calendar" },
      ],
    },
    activityLog: [
      {
        id: "al-b2-1",
        ts: "Today 08:00",
        actor: "TOMO",
        summary: "Engagement spike · Risk deck section",
        detail: "Third open in 48h — surfaced for Friday agenda.",
      },
      {
        id: "al-b2-2",
        ts: "Wed",
        actor: "User",
        summary: "Email · Proposed Fri 2pm slot",
        detail: "Awaiting Jamie’s confirmation.",
      },
    ],
  },
  {
    id: "b3",
    meetingTitle: "HF Update — UBS",
    lp: "UBS",
    datetime: "Today 2:00 PM ET",
    status: "Ready",
    openLoops: 1,
    summary:
      "Signal: Allocator engagement on your January pack is tracking above the peer median — Charly's team re-opened the risk and attribution sections twice in the last week.\n\nContext: Quarterly hedge fund update; focus on attribution, capacity, and allocator-desk questions from Charly's last email. Brief is locked.",
    agenda: ["Performance vs peers", "Risk & exposure snapshot", "Questions from their allocator desk"],
    commitments: ["Send one-pager after call", "Confirm data room access renewal"],
    drawerWhySurfaced: {
      body: "Today’s HF update ties to Coming up (UBS · Charly). Brief mirrors the same prep pack — use this row when you land from Daily Brief or radar.",
      stamp: "Computed · Linked to commitment c1",
    },
    drawerSpecHeader: {
      subtitle: "Allocator desk · UBS · Today 2:00 PM ET",
      statusPills: [
        { tone: "teal", label: "Brief ready" },
        { tone: "amber", label: "1 open loop" },
      ],
      links: [
        { href: "https://calendar.google.com/calendar/u/0/r/week", label: "Open calendar", icon: "calendar" },
        { href: "/relationships", label: "Open LP record", icon: "clock" },
      ],
    },
    activityLog: [
      {
        id: "al-b3-1",
        ts: "Today 07:00",
        actor: "TOMO",
        summary: "Brief locked — allocator questions pulled from thread",
        detail: "Capacity + attribution lines match Charly’s last email.",
      },
      {
        id: "al-b3-2",
        ts: "Yesterday",
        actor: "User",
        summary: "Email · Charly confirmed attendance",
        detail: "One capacity question flagged for top of call.",
      },
    ],
  },
  {
    id: "b4",
    meetingTitle: "Investment Update — CPPIB",
    lp: "CPPIB",
    datetime: "Today 4:00 PM ET",
    status: "Ready",
    openLoops: 2,
    summary:
      "Signal: Frank's reply time shortened from 5 days to 1 day over the last three exchanges — relationship accelerating.\n\nContext: Frank asked about liquidity terms and co-invest last time. Brief is locked from the last meeting transcript.",
    agenda: ["Portfolio update", "Liquidity & terms", "Path to next IC"],
    commitments: [
      "Follow up on co-invest deck — ⚠️ promised 8 days ago, not yet sent",
      "Share updated DDQ index",
    ],
    drawerWhySurfaced: {
      body: "Matches Coming up (CPPIB · Frank) today at 4pm. Co-invest deck overdue — called out in commitments for visibility in the drawer.",
      stamp: "Computed · Linked to commitment c2",
    },
    drawerSpecHeader: {
      subtitle: "Investment management · CPPIB",
      statusPills: [
        { tone: "teal", label: "Brief ready" },
        { tone: "red", label: "Overdue promise" },
      ],
      links: [
        { href: "https://calendar.google.com/calendar/u/0/r/week", label: "Open calendar", icon: "calendar" },
        { href: "/relationships?focus=r6", label: "Open LP record", icon: "clock" },
      ],
    },
    activityLog: [
      {
        id: "al-b4-1",
        ts: "Yesterday",
        actor: "TOMO",
        summary: "Stub signal · Reply velocity tightening",
        detail: "Narrative for demo — not from live mail.",
      },
      {
        id: "al-b4-2",
        ts: "Last week",
        actor: "User",
        summary: "Meeting · Liquidity + co-invest",
        detail: "Notes feed this brief’s agenda ordering.",
      },
    ],
  },
  {
    id: "b5",
    meetingTitle: "Intro Call — GIC",
    lp: "GIC",
    datetime: "Tomorrow 10:00 AM ET",
    status: "Updated",
    openLoops: 1,
    summary:
      "New contact — no prior meeting history. First live intro with Kwong; light CRM context and prep pack still building. Focus on mandate fit, pacing, and what GIC needs before deeper diligence.",
    agenda: ["Credentials & strategy", "Sizing and timeline", "Next steps to allocator reads"],
    commitments: ["Circulate short deck after call", "Propose two follow-up slots"],
    drawerWhySurfaced: {
      body: "Aligns with Coming up intro (GIC · Kwong) tomorrow. First-contact template — credentials-led, single clear ask.",
      stamp: "Computed · Linked to commitment c3",
    },
    drawerSpecHeader: {
      subtitle: "Sovereign wealth fund · First contact",
      statusPills: [
        { tone: "navy", label: "Brief updated" },
        { tone: "amber", label: "1 open loop" },
      ],
      links: [
        { href: "https://calendar.google.com/calendar/u/0/r/week", label: "Open calendar", icon: "calendar" },
        { href: "https://www.linkedin.com/in/kwong-hong-huat-mock", label: "LinkedIn", icon: "linkedin" },
        { href: "/relationships?focus=r8", label: "Open LP record", icon: "clock" },
      ],
    },
    activityLog: [
      {
        id: "al-b5-1",
        ts: "Today 08:00",
        actor: "TOMO",
        summary: "First-contact brief scaffold complete",
        detail: "Mandate fit + pacing bullets from onboarding stub.",
      },
      {
        id: "al-b5-2",
        ts: "2d ago",
        actor: "User",
        summary: "Email · Intro window accepted",
        detail: "Tomorrow 10am ET confirmed.",
      },
    ],
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







