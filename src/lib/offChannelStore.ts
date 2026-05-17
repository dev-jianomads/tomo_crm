/**
 * Demo / pre-Postgres persistence for `lp_state.off_channel_active_until`.
 * Production: replace with UPDATE lp_state … via Supabase + real `lp_signal_log` inserts.
 */

export type OffChannelMutationAction = "set" | "extend" | "clear";

const activeUntilIsoByLpId = new Map<string, string | null>();

export function getOffChannelActiveUntilIso(lpContactId: string): string | null {
  if (!activeUntilIsoByLpId.has(lpContactId)) return null;
  return activeUntilIsoByLpId.get(lpContactId) ?? null;
}

const EXTENSION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Set/extend: `now + 30 days` from mutation time. Clear: null.
 * Returns prior/new ISO strings for `lp_signal_log.signal_value_jsonb`.
 */
export function mutateOffChannelActiveUntil(
  lpContactId: string,
  action: OffChannelMutationAction,
  opts: { now?: Date } = {},
): { prior_until: string | null; new_until: string | null } {
  const now = opts.now ?? new Date();
  const prior = activeUntilIsoByLpId.has(lpContactId) ? activeUntilIsoByLpId.get(lpContactId) ?? null : null;

  if (action === "clear") {
    activeUntilIsoByLpId.set(lpContactId, null);
    return { prior_until: prior, new_until: null };
  }

  const until = new Date(now.getTime() + EXTENSION_MS);
  const iso = until.toISOString();
  activeUntilIsoByLpId.set(lpContactId, iso);
  return { prior_until: prior, new_until: iso };
}

/** Test / dev reset only */
export function __resetOffChannelStoreForTests(): void {
  activeUntilIsoByLpId.clear();
}
