/**
 * Parse `exports/mock-relationships.csv` into Relationship rows.
 * Shared by GET /api/crm/relationships and the export script.
 */

import type { LpLocation, Relationship } from "./mockData";
import { enrichTouchesInStage } from "./touchesInStage";
import {
  BAND_OPTIONS,
  CONSULTANT_DEPENDENT_OPTIONS,
  CONTACT_SENIORITY_OPTIONS,
  DECISION_TIMELINE_OPTIONS,
  DEFAULT_RELATIONSHIP_FUND_ID,
  ESG_REQUIRED_OPTIONS,
  FISCAL_YEAR_END_OPTIONS,
  FUND_SIZE_PREFERENCE_OPTIONS,
  INVESTMENT_REMIT_OPTIONS,
  INVESTOR_TYPE_OPTIONS,
  LAST_FUND_HISTORY_OPTIONS,
  LP_LOCATION_OPTIONS,
  MOMENTUM_DIRECTION_OPTIONS,
  RELATIONSHIP_OWNER_OPTIONS,
  SOURCE_OPTIONS,
  STAGE_OPTIONS,
  STRATEGY_FIT_OPTIONS,
  STRATEGY_TYPE_OPTIONS,
  TIER_OPTIONS,
  TYPICAL_CHECK_SIZE_OPTIONS,
} from "./mockData";

function parseCsvRows(text: string): string[][] {
  const t = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let i = 0;
  let inQuotes = false;
  while (i < t.length) {
    const c = t[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cur += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(cur);
      cur = "";
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  row.push(cur);
  if (row.some((cell) => cell !== "")) rows.push(row);
  return rows;
}

function pick<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  const v = value.trim();
  if (allowed.includes(v as T)) return v as T;
  return fallback;
}

function optEnum<T extends string>(value: string, allowed: readonly T[]): T | undefined {
  const v = value.trim();
  if (v === "") return undefined;
  if (allowed.includes(v as T)) return v as T;
  return undefined;
}

function parseNum(value: string, fallback: number): number {
  const n = Number.parseInt(value.trim(), 10);
  return Number.isFinite(n) ? n : fallback;
}

const COL_KEYS = [
  "id",
  "name",
  "firm",
  "daysSinceLastMeaningfulContact",
  "stage",
  "momentumDirection",
  "tier",
  "relationshipOwner",
  "investorType",
  "strategyFit",
  "strategyType",
  "lpLocation",
  "investmentRemit",
  "typicalCheckSize",
  "fundSizePreference",
  "source",
  "sourceDetail",
  "lastFundHistory",
  "lastFundCheckSize",
  "decisionTimeline",
  "fiscalYearEnd",
  "consultantDependent",
  "consultantName",
  "esgRequired",
  "lastMeetingDate",
  "contactSeniority",
  "nextMove",
  "openLoops",
  "band",
  "fundId",
] as const;

type ColKey = (typeof COL_KEYS)[number];
type ExtraCsvField = "city" | "country" | "region" | "location";
type CsvField = ColKey | ExtraCsvField;

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Canonical + UAT / Affinity aliases (case-insensitive). */
const HEADER_ALIASES: Record<string, CsvField> = {
  id: "id",
  "affinity row id": "id",
  name: "name",
  displayname: "name",
  "display name": "name",
  "full name": "name",
  firm: "firm",
  firmname: "firm",
  "firm name": "firm",
  "organization name": "firm",
  city: "city",
  country: "country",
  region: "region",
  location: "location",
};

function resolveHeader(raw: string): CsvField | undefined {
  const trimmed = raw.trim();
  if ((COL_KEYS as readonly string[]).includes(trimmed)) return trimmed as ColKey;
  const extra: ExtraCsvField[] = ["city", "country", "region", "location"];
  if ((extra as readonly string[]).includes(trimmed)) return trimmed as ExtraCsvField;
  const spaced = normalizeHeader(trimmed);
  if (HEADER_ALIASES[spaced]) return HEADER_ALIASES[spaced];
  const compact = spaced.replace(/\s+/g, "");
  if (HEADER_ALIASES[compact]) return HEADER_ALIASES[compact];
  const col = COL_KEYS.find((k) => k.toLowerCase() === compact);
  if (col) return col;
  return undefined;
}

function buildHeaderIndex(headerRow: string[]): Map<CsvField, number> {
  const map = new Map<CsvField, number>();
  headerRow.forEach((h, i) => {
    const key = resolveHeader(h);
    if (key && !map.has(key)) map.set(key, i);
  });
  return map;
}

function parseLocationParts(location: string): { city?: string; country?: string } {
  const loc = location.trim();
  if (!loc) return {};
  const comma = loc.indexOf(",");
  if (comma === -1) return { city: loc };
  const city = loc.slice(0, comma).trim();
  const country = loc.slice(comma + 1).trim();
  return {
    ...(city ? { city } : {}),
    ...(country ? { country } : {}),
  };
}

function mapRegionToLpLocation(region: string): LpLocation | undefined {
  const raw = region.trim();
  if (!raw) return undefined;
  if ((LP_LOCATION_OPTIONS as readonly string[]).includes(raw)) return raw as LpLocation;
  const r = raw.toLowerCase();
  if (["na", "north america", "us", "usa"].includes(r)) return "North America";
  if (["eu", "europe", "emea", "mena"].includes(r)) return "EMEA";
  if (["apac", "asia", "asia-pacific", "asia pacific"].includes(r)) return "APAC";
  if (["latam", "latin america"].includes(r)) return "LATAM";
  return undefined;
}

function blankToUndef(value: string): string | undefined {
  const v = value.trim();
  return v === "" ? undefined : v;
}

function rowToRelationship(idx: Map<CsvField, number>, cells: string[]): Relationship {
  const g = (k: CsvField) => {
    const i = idx.get(k);
    if (i === undefined) return "";
    return (cells[i] ?? "").trim();
  };

  const id = g("id") || "r0";
  const name = g("name") || "Unknown";
  const firm = g("firm") || "Unknown";
  const daysSinceLastMeaningfulContact = parseNum(g("daysSinceLastMeaningfulContact"), 0);
  const stage = pick(g("stage"), STAGE_OPTIONS, "Sourced");
  const momentumDirection = pick(g("momentumDirection"), MOMENTUM_DIRECTION_OPTIONS, "Stable");
  const tier = pick(g("tier"), TIER_OPTIONS, "Tier 2");
  const relationshipOwner = pick(g("relationshipOwner"), RELATIONSHIP_OWNER_OPTIONS, "Unassigned");
  const investorType = pick(g("investorType"), INVESTOR_TYPE_OPTIONS, "Family office");
  const strategyFit = pick(g("strategyFit"), STRATEGY_FIT_OPTIONS, "Unknown");
  const strategyType = pick(g("strategyType"), STRATEGY_TYPE_OPTIONS, "Other");
  const lpLocation =
    optEnum(g("lpLocation"), LP_LOCATION_OPTIONS) ??
    mapRegionToLpLocation(g("region")) ??
    "Other";
  const investmentRemit = pick(g("investmentRemit"), INVESTMENT_REMIT_OPTIONS, "Other");
  const typicalCheckSize = pick(g("typicalCheckSize"), TYPICAL_CHECK_SIZE_OPTIONS, "Unknown");
  const fundSizePreference = pick(g("fundSizePreference"), FUND_SIZE_PREFERENCE_OPTIONS, "Unknown");
  const source = pick(g("source"), SOURCE_OPTIONS, "Other");
  const sourceDetail = g("sourceDetail") || undefined;
  const lastFundHistory = pick(g("lastFundHistory"), LAST_FUND_HISTORY_OPTIONS, "Unknown");
  const lastFundCheckSizeRaw = g("lastFundCheckSize");
  const lastFundCheckSize = lastFundCheckSizeRaw
    ? pick(lastFundCheckSizeRaw, TYPICAL_CHECK_SIZE_OPTIONS, "Unknown")
    : undefined;
  const decisionTimeline = pick(g("decisionTimeline"), DECISION_TIMELINE_OPTIONS, "Unknown");
  const fiscalYearEnd = pick(g("fiscalYearEnd"), FISCAL_YEAR_END_OPTIONS, "Unknown");
  const consultantDependent = pick(g("consultantDependent"), CONSULTANT_DEPENDENT_OPTIONS, "Unknown");
  const consultantName = g("consultantName") || undefined;
  const esgRequired = pick(g("esgRequired"), ESG_REQUIRED_OPTIONS, "Unknown");
  const lastMeetingDate = g("lastMeetingDate") || undefined;
  const contactSeniority = optEnum(g("contactSeniority"), CONTACT_SENIORITY_OPTIONS);
  const nextMove = g("nextMove") || "";
  const openLoops = parseNum(g("openLoops"), 0);
  const band = pick(g("band"), BAND_OPTIONS, "Active-Stable");
  const fundIdRaw = g("fundId").trim();
  const fundId = fundIdRaw || DEFAULT_RELATIONSHIP_FUND_ID;

  const fromLocation = parseLocationParts(g("location"));
  const city = blankToUndef(g("city")) ?? fromLocation.city;
  const country = blankToUndef(g("country")) ?? fromLocation.country;
  const region = blankToUndef(g("region"));
  const organization =
    city || country || region ? { city: city ?? null, country: country ?? null, region: region ?? null } : undefined;

  return {
    id,
    name,
    firm,
    fundId,
    daysSinceLastMeaningfulContact,
    stage,
    momentumDirection,
    tier,
    relationshipOwner,
    investorType,
    strategyFit,
    strategyType,
    lpLocation,
    investmentRemit,
    typicalCheckSize,
    fundSizePreference,
    source,
    sourceDetail,
    lastFundHistory,
    lastFundCheckSize,
    decisionTimeline,
    fiscalYearEnd,
    consultantDependent,
    consultantName,
    esgRequired,
    lastMeetingDate,
    contactSeniority,
    nextMove,
    openLoops,
    band,
    organization,
  };
}

/**
 * Parse CSV text (UTF-8) into Relationship rows.
 */
export function parseRelationshipsCsv(text: string): Relationship[] {
  const rows = parseCsvRows(text.trim());
  if (rows.length < 2) return [];

  const idx = buildHeaderIndex(rows[0]!);
  if (!idx.has("id") || !idx.has("name")) {
    throw new Error("relationships CSV: missing required columns (id, name)");
  }

  const out: Relationship[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]!;
    if (cells.every((c) => c.trim() === "")) continue;
    const rel = rowToRelationship(idx, cells);
    if (!rel.id || !rel.name) continue;
    out.push(enrichTouchesInStage(rel));
  }
  return out;
}
