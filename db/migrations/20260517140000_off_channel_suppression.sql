-- Off-channel suppression (SRS §3.5 BR-3.5.8–3.5.10, §6.2)
-- A1: GP-authoritative timestamp on lp_state (nightly batch reads only; clears/extends via API only).
-- A2: Append-only audit signal type on lp_signal_log.

-- ---------------------------------------------------------------------------
-- A1 — lp_state.off_channel_active_until
-- ---------------------------------------------------------------------------
ALTER TABLE lp_state
  ADD COLUMN IF NOT EXISTS off_channel_active_until timestamptz NULL;

COMMENT ON COLUMN lp_state.off_channel_active_until IS
  'GP-set via Relationships LP record (SRS §3.10). When > batch as-of, silence-class signals (1,6,9) and Gone quiet / silence-only Cooling cohorts are suppressed (BR-3.5.8). Rolling 30d from set/extend. Nightly job must not overwrite except via GP API.';

-- ---------------------------------------------------------------------------
-- A2 — lp_signal_log.signal_type includes off_channel_marked
-- ---------------------------------------------------------------------------
-- Replace check constraint: constraint name may differ per environment — adjust if migrate fails.
ALTER TABLE lp_signal_log DROP CONSTRAINT IF EXISTS lp_signal_log_signal_type_check;

ALTER TABLE lp_signal_log
  ADD CONSTRAINT lp_signal_log_signal_type_check CHECK (signal_type IN (
    'silence',
    're_engagement',
    'reply_velocity',
    'reply_length',
    'reply_initiation',
    'stage_stagnation',
    'calendar_friction',
    'cc_expansion',
    'one_way_contact',
    'warm_ghost_capture',
    'close_proximity_capture',
    'flag_transition',
    'override_applied',
    'off_channel_marked'
  ));
