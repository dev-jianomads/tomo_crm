import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { relationshipsGenerated } from "@/lib/mockData";
import { relationshipToLpContactRecord } from "@/lib/lpContactApi";
import { mutateOffChannelActiveUntil } from "@/lib/offChannelStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const patchBodySchema = z.object({
  action: z.enum(["set", "extend", "clear"]),
  /** Production: server session user id. Demo default when omitted. */
  gp_user_id: z.string().uuid().optional(),
});

const DEMO_GP_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * PATCH /api/lp-contacts/[id]/off-channel
 * SRS BR-3.5.9 — set / extend (+30d) / clear `off_channel_active_until` + echo `lp_signal_log`-shaped payload.
 * Demo: persists in `offChannelStore` until Postgres wiring.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const rel = relationshipsGenerated.find((r) => r.id === id);
  if (!rel) {
    return NextResponse.json({ error: "LP contact not found", id }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { action, gp_user_id: gpUserId } = parsed.data;
  const gp_user_id = gpUserId ?? DEMO_GP_USER_ID;

  const { prior_until, new_until } = mutateOffChannelActiveUntil(id, action);
  const observed_at = new Date().toISOString();

  const signal_value_jsonb = {
    action,
    prior_until,
    new_until,
    gp_user_id,
  };

  const contact = relationshipToLpContactRecord(rel, { offChannelActiveUntilIso: new_until });

  return NextResponse.json(
    {
      contact,
      signal_log: {
        signal_type: "off_channel_marked" as const,
        signal_value_jsonb,
        observed_at,
      },
    },
    { status: 200 },
  );
}
