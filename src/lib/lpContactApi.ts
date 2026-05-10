import type { Relationship } from "@/lib/mockData";
import { derivePipelineFlagMock, type PipelineFlagGar } from "@/lib/todayRaiseStands";
import {
  buildSignalEvidence,
  mockDaysInCurrentStage,
  mockDaysInPriorStage,
} from "@/lib/relationshipDrawerMocks";

/** API-aligned envelope for `/api/lp-contacts` — maps toward SRS `lp_state` / AC-3.10.x */
export type LpStatePayload = {
  pipeline_stage: Relationship["stage"];
  pipeline_flag: PipelineFlagGar;
  pipeline_flag_reason: string;
  days_since_meaningful_touch: number;
  days_in_stage: number;
  days_in_prior_stage: number;
  prior_stage_hint: string;
};

export type FieldProvenance = {
  source: "CRM" | "Tomo" | "CSV" | "Import";
  updatedAt: string;
};

export type LpContactRecord = {
  id: string;
  fund_id?: string;
  display_name: string;
  firm_name: string;
  lp_state: LpStatePayload;
  investor_type: Relationship["investorType"];
  provenance: {
    pipeline_stage?: FieldProvenance;
    pipeline_flag?: FieldProvenance;
    mandate_fit?: FieldProvenance;
    typical_check?: FieldProvenance;
  };
};

export function relationshipToLpContactRecord(rel: Relationship): LpContactRecord {
  const evidence = buildSignalEvidence(rel);
  const prior = mockDaysInPriorStage(rel);
  const pf = derivePipelineFlagMock(rel);

  return {
    id: rel.id,
    fund_id: rel.fundId,
    display_name: rel.name,
    firm_name: rel.firm,
    investor_type: rel.investorType,
    lp_state: {
      pipeline_stage: rel.stage,
      pipeline_flag: pf,
      pipeline_flag_reason: `${evidence.label}: ${evidence.body}`,
      days_since_meaningful_touch: rel.daysSinceLastMeaningfulContact,
      days_in_stage: mockDaysInCurrentStage(rel),
      days_in_prior_stage: prior.days,
      prior_stage_hint: prior.stageHint,
    },
    provenance: {
      pipeline_stage: { source: "CRM", updatedAt: "2026-05-01T08:00:00.000Z" },
      pipeline_flag: { source: "Tomo", updatedAt: "2026-05-10T07:00:00.000Z" },
      mandate_fit: { source: "CRM", updatedAt: "2026-03-12T15:30:00.000Z" },
      typical_check: { source: "CRM", updatedAt: "2026-04-24T11:05:00.000Z" },
    },
  };
}
