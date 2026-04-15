import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { relationshipsGenerated } from "@/lib/mockData";
import { parseRelationshipsCsv } from "@/lib/relationshipsCsv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/crm/relationships
 * Reads `exports/mock-relationships.csv` from the project root (overwrite to update mock CRM).
 * Falls back to generated data if the file is missing or invalid.
 */
export async function GET() {
  const path = join(process.cwd(), "exports", "mock-relationships.csv");
  try {
    const text = await readFile(path, "utf8");
    const rels = parseRelationshipsCsv(text);
    if (rels.length === 0) {
      return NextResponse.json(relationshipsGenerated);
    }
    return NextResponse.json(rels);
  } catch {
    return NextResponse.json(relationshipsGenerated);
  }
}
