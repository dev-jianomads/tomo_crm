/**
 * Off-channel suppression rules (SRS §3.5 BR-3.5.8–3.5.12).
 * Import from the nightly signals batch worker when `DATABASE_URL` is wired.
 */

import type { PipelineFlagGar } from "@/lib/todayRaiseStands";

/** Signal 1, 6, 9 — nightly-written types suppressed when off-channel is active. */
export const SILENCE_CLASS_SIGNAL_TYPES = ["silence", "stage_stagnation", "one_way_contact"] as const;

export type SilenceClassSignalType = (typeof SILENCE_CLASS_SIGNAL_TYPES)[number];

export function isSilenceClassSignalType(signalType: string): signalType is SilenceClassSignalType {
  return (SILENCE_CLASS_SIGNAL_TYPES as readonly string[]).includes(signalType);
}

/** True when `off_channel_active_until` is strictly after `batchAsOf` (BR-3.5.8). */
export function isOffChannelActiveAt(offChannelActiveUntilIso: string | null, batchAsOf: Date): boolean {
  if (!offChannelActiveUntilIso) return false;
  const t = Date.parse(offChannelActiveUntilIso);
  if (Number.isNaN(t)) return false;
  return t > batchAsOf.getTime();
}

/** BR-3.5.8: skip new rows for these types when off-channel window covers `batchAsOf`. */
export function shouldSkipSilenceClassSignalWrite(params: {
  signalType: string;
  offChannelActiveUntilIso: string | null;
  batchAsOf: Date;
}): boolean {
  if (!isSilenceClassSignalType(params.signalType)) return false;
  return isOffChannelActiveAt(params.offChannelActiveUntilIso, params.batchAsOf);
}

/**
 * BR-3.5.10 / AC-3.5.9 — simplified pipeline adjustment when the *only* reason for amber/red
 * would have been silence-derived. Production must use full §8.7; this helper encodes the
 * off-channel carve-out for workers that already computed a provisional flag + reason string.
 *
 * @param silenceOnlyCause - true when evaluators determined amber/red would not apply without silence inputs
 * @param directionalCoolingActive - when true with suppression, prefer `amber` over `green` (AC-3.5.9)
 */
export function applyOffChannelToPipelineFlag(params: {
  provisionalFlag: PipelineFlagGar;
  provisionalReason: string;
  offChannelActiveUntilIso: string | null;
  batchAsOf: Date;
  /** When true, re-engagement urgent path already set red — do not downgrade. */
  reEngagementUrgent: boolean;
  silenceOnlyCause: boolean;
  directionalCoolingActive?: boolean;
}): { pipeline_flag: PipelineFlagGar; pipeline_flag_reason: string } {
  if (params.reEngagementUrgent) {
    return { pipeline_flag: params.provisionalFlag, pipeline_flag_reason: params.provisionalReason };
  }

  const active = isOffChannelActiveAt(params.offChannelActiveUntilIso, params.batchAsOf);

  if (!active || !params.silenceOnlyCause) {
    return { pipeline_flag: params.provisionalFlag, pipeline_flag_reason: params.provisionalReason };
  }

  if (params.provisionalFlag === "red" || params.provisionalFlag === "amber") {
    let reason = params.provisionalReason;
    if (!reason.includes("off_channel_suppressed")) {
      reason = reason ? `${reason} · off_channel_suppressed` : "off_channel_suppressed";
    }
    const nextFlag: PipelineFlagGar = params.directionalCoolingActive ? "amber" : "green";
    return { pipeline_flag: nextFlag, pipeline_flag_reason: reason };
  }

  return { pipeline_flag: params.provisionalFlag, pipeline_flag_reason: params.provisionalReason };
}

/** Radar / cohort builders: omit LP from Gone quiet when off-channel active (BR-3.5.8). */
export function shouldOmitFromGoneQuietCohort(offChannelActiveUntilIso: string | null, batchAsOf: Date): boolean {
  return isOffChannelActiveAt(offChannelActiveUntilIso, batchAsOf);
}
