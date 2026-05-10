/**
 * Fund cohort for Relationships — aligns mock `Relationship.fundId` with `useFunds()` / SRS `lp_contacts.fund_id`.
 */

import type { Relationship } from "./mockData";
import { DEFAULT_RELATIONSHIP_FUND_ID } from "./mockData";

export type FundOption = { id: string; name?: string };

/** When workspace selector is "all", consumers that need a single fund ID (new contact, imports) use the first fund (see `resolveEffectiveFundId`). The Relationships list no longer filters to that fund when "all" is selected — see `relationships/page.tsx`. */
export function resolveEffectiveFundId(activeFundId: string, funds: FundOption[]): string {
  if (activeFundId !== "all") return activeFundId;
  return funds[0]?.id ?? "fund-1";
}

export function filterRelationshipsByFund<T extends Relationship>(
  rows: T[],
  effectiveFundId: string
): T[] {
  return rows.filter((r) => (r.fundId ?? DEFAULT_RELATIONSHIP_FUND_ID) === effectiveFundId);
}
