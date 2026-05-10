import type { Relationship, Stage } from "@/lib/mockData";

/** V1 partition buckets for Today “Where the raise stands” (SRS §3.8, Section 9 supplement). */
export type RaiseStandsBreakdown = {
  genuinelyMoveable: number;
  healthyOnTrack: number;
  coolingWatch: number;
  driftingAct: number;
};

export type PipelineFlagGar = "green" | "amber" | "red";

const TERMINAL_STAGES: ReadonlySet<Stage> = new Set(["Closed", "Pass"]);

/** CRM stages that count toward raise health (excludes terminal). */
export function isActiveRaiseStage(stage: Stage): boolean {
  return !TERMINAL_STAGES.has(stage);
}

/**
 * Maps UI stage labels to V1 `pipeline_stage` groupings from Section 9 (Metric 3 cohort).
 * first_meeting / nurturing / active_diligence / soft_commit participate in moveability.
 */
function moveabilityStageGroup(
  stage: Stage
): "first_meeting" | "nurturing" | "active_diligence" | "soft_commit" | null {
  switch (stage) {
    case "First contact":
    case "Deck sent":
    case "Met":
      return "first_meeting";
    case "Nurturing":
      return "nurturing";
    case "Active diligence":
    case "DD":
      return "active_diligence";
    case "Soft circle":
      return "soft_commit";
    default:
      return null;
  }
}

/** Amber touch thresholds (days since meaningful touch) — SRS stage_cadence_benchmarks / Section 9. */
function amberTouchThresholdDays(stage: Stage): number | null {
  const g = moveabilityStageGroup(stage);
  if (!g) return null;
  const map = {
    first_meeting: 21,
    nurturing: 14,
    active_diligence: 10,
    soft_commit: 21,
  } as const;
  return map[g];
}

/**
 * Production uses `lp_state.pipeline_flag` (Section 8 §8.7). Mock CRM rows approximate G/A/R from `band`
 * + momentum so the Today tile moves with the same Relationship list as Pipeline / Kanban.
 */
export function derivePipelineFlagMock(r: Relationship): PipelineFlagGar {
  if (r.band === "Stalled") return "red";
  if (r.band === "Cooling" || r.momentumDirection === "Cooling") return "amber";
  return "green";
}

/**
 * Stand-in for “directional warming signal in last 30d” (Metric 3, `lp_signal_log`).
 * Demo: heating band or explicit heating momentum.
 */
function hasWarmingDirectionalSignalMock(r: Relationship): boolean {
  return r.band === "Heating Up" || r.momentumDirection === "Heating up";
}

/** Section 9 Metric 3 — count LP if in moveability stages, G/A (not red), warming signal, within touch SLA. */
export function isGenuinelyMoveableMock(r: Relationship): boolean {
  if (!isActiveRaiseStage(r.stage)) return false;
  if (moveabilityStageGroup(r.stage) == null) return false;
  const flag = derivePipelineFlagMock(r);
  if (flag === "red") return false;
  if (!hasWarmingDirectionalSignalMock(r)) return false;
  const threshold = amberTouchThresholdDays(r.stage);
  if (threshold == null) return false;
  return r.daysSinceLastMeaningfulContact <= threshold;
}

/**
 * Mutually exclusive buckets over **active** (non-terminal) LPs:
 * 1. Drifting — act → `pipeline_flag === 'red'`
 * 2. Genuinely moveable → Metric 3 (mock inputs)
 * 3. Cooling — watch → `pipeline_flag === 'amber'` and not moveable
 * 4. Healthy & on track → `pipeline_flag === 'green'` and not moveable
 */
export function computeRaiseStandsFromRelationships(relationships: Relationship[]): RaiseStandsBreakdown {
  const out: RaiseStandsBreakdown = {
    genuinelyMoveable: 0,
    healthyOnTrack: 0,
    coolingWatch: 0,
    driftingAct: 0,
  };

  for (const r of relationships) {
    if (!isActiveRaiseStage(r.stage)) continue;
    const flag = derivePipelineFlagMock(r);
    if (flag === "red") {
      out.driftingAct += 1;
      continue;
    }
    if (isGenuinelyMoveableMock(r)) {
      out.genuinelyMoveable += 1;
      continue;
    }
    if (flag === "amber") out.coolingWatch += 1;
    else out.healthyOnTrack += 1;
  }

  return out;
}
