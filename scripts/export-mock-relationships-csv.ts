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

const COLUMNS: (keyof Relationship)[] = [
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
];

function row(r: Relationship): string {
  return COLUMNS.map((k) => csvCell(r[k] as string | number | undefined)).join(",");
}

const header = COLUMNS.join(",");
const body = relationshipsGenerated.map(row).join("\r\n");
const out = `${header}\r\n${body}\r\n`;

const outPath = join(process.cwd(), "exports", "mock-relationships.csv");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, out, "utf8");

console.log(`Wrote ${relationshipsGenerated.length} rows to ${outPath}`);
