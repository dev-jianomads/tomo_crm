import { NextRequest, NextResponse } from "next/server";
import { relationshipsGenerated } from "@/lib/mockData";
import { filterRelationshipsByFund } from "@/lib/relationshipFundScope";
import { relationshipToLpContactRecord } from "@/lib/lpContactApi";
import { getOffChannelActiveUntilIso } from "@/lib/offChannelStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/lp-contacts
 * Mock SRS-aligned LP cohort feed (`lp_state`, provenance) — backs AC-3.10.x demos until Postgres wiring.
 * Query: `fundId` (optional), `id` (single contact).
 * Performance: short private cache (AC-3.10.1-friendly for list payloads).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const fundId = url.searchParams.get("fundId");
  const id = url.searchParams.get("id");

  let rows = relationshipsGenerated;
  if (fundId && fundId !== "all") {
    rows = filterRelationshipsByFund(rows, fundId);
  }

  if (id) {
    const rel = rows.find((r) => r.id === id) ?? relationshipsGenerated.find((r) => r.id === id);
    if (!rel) {
      return NextResponse.json({ error: "LP contact not found", id }, { status: 404 });
    }
    return NextResponse.json(
      {
        contact: relationshipToLpContactRecord(rel, {
          offChannelActiveUntilIso: getOffChannelActiveUntilIso(rel.id),
        }),
      },
      { status: 200, headers: { "Cache-Control": "private, max-age=30" } }
    );
  }

  return NextResponse.json(
    {
      contacts: rows.map((r) =>
        relationshipToLpContactRecord(r, { offChannelActiveUntilIso: getOffChannelActiveUntilIso(r.id) }),
      ),
      meta: {
        count: rows.length,
        fundFilter: fundId,
        generatedAt: new Date().toISOString(),
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    }
  );
}
