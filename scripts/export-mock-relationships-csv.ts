/**
 * Writes mock LP relationships to CSV for sharing / offline editing.
 * Run: npx --yes tsx scripts/export-mock-relationships-csv.ts
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Relationship } from "../src/lib/mockData";
import { relationshipsGenerated } from "../src/lib/mockData";

function csvCell(value: string | number | undefined | null): string {
  const s = value === undefined || value === null ? "" : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const COLUMNS: (keyof Relationship | "city" | "country" | "region")[] = [
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
  "city",
  "country",
  "region",
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
];

function cellFor(r: Relationship, k: (typeof COLUMNS)[number]): string | number | undefined | null {
  if (k === "city" || k === "country" || k === "region") return r.organization?.[k] ?? "";
  return r[k] as string | number | undefined;
}

function row(r: Relationship): string {
  return COLUMNS.map((k) => csvCell(cellFor(r, k))).join(",");
}

const header = COLUMNS.join(",");
const body = relationshipsGenerated.map(row).join("\r\n");
const out = `${header}\r\n${body}\r\n`;

const outPath = join(process.cwd(), "exports", "mock-relationships.csv");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, out, "utf8");

console.log(`Wrote ${relationshipsGenerated.length} rows to ${outPath}`);
