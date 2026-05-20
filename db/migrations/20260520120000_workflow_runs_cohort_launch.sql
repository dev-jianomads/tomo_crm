-- Workflow runs: per-LP execution rows + cohort_launch_id for grouped run history (SRS §3.12, §6.2.6).
-- Reply attribution: workflow_run_id on lp_interactions.metadata (and optional FK later).

-- ---------------------------------------------------------------------------
-- workflow_runs — one row per LP per workflow execution
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  workflow_id uuid NOT NULL,
  lp_contact_id uuid NOT NULL,
  cohort_launch_id uuid NOT NULL,
  list_id uuid NULL,
  started_by_user_id uuid NULL,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'paused', 'completed', 'cancelled', 'failed')),
  current_step_index int NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  outcome text NULL
    CHECK (outcome IS NULL OR outcome IN (
      'warmer_than_expected',
      'maintaining_non_committal',
      'genuinely_dormant',
      'other'
    )),
  launch_parameters_jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE workflow_runs IS 'One row per LP per workflow execution (SRS §3.12).';
COMMENT ON COLUMN workflow_runs.id IS 'Opaque UUID (gen_random_uuid). Tagged on outbound lp_interactions for reply attribution — not sequential or encoded.';
COMMENT ON COLUMN workflow_runs.cohort_launch_id IS 'Shared UUID for all LP rows created by one Launch / trigger batch; powers run history and outcomes funnel UI.';

CREATE INDEX IF NOT EXISTS workflow_runs_workspace_workflow_status_idx
  ON workflow_runs (workspace_id, workflow_id, status);

CREATE INDEX IF NOT EXISTS workflow_runs_cohort_launch_id_idx
  ON workflow_runs (cohort_launch_id);

CREATE UNIQUE INDEX IF NOT EXISTS workflow_runs_one_active_per_lp_workflow_idx
  ON workflow_runs (workspace_id, workflow_id, lp_contact_id)
  WHERE status IN ('running', 'paused');

-- ---------------------------------------------------------------------------
-- workflow_step_runs — per-step execution; reply state via status + output_jsonb
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflow_step_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  workflow_run_id uuid NOT NULL REFERENCES workflow_runs (id) ON DELETE CASCADE,
  workflow_step_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'in_progress',
      'awaiting_approval',
      'approved',
      'sent',
      'replied',
      'skipped',
      'failed'
    )),
  tomo_action_log_id uuid NULL,
  started_at timestamptz NULL,
  completed_at timestamptz NULL,
  output_jsonb jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN workflow_step_runs.output_jsonb IS
  'E.g. sent_interaction_id, provider_internet_message_id, lp_email_thread_id, sent_at, replied_at, inbound_interaction_id.';

CREATE INDEX IF NOT EXISTS workflow_step_runs_workflow_run_status_idx
  ON workflow_step_runs (workflow_run_id, status);

-- ---------------------------------------------------------------------------
-- lp_interactions — workflow attribution metadata (full table may pre-exist)
-- ---------------------------------------------------------------------------
-- Production ingest writes:
--   metadata->>'workflow_run_id'
--   metadata->>'workflow_step_run_id'
--   metadata->>'cohort_launch_id' (denormalized from workflow_runs for analytics)
-- Optional future: workflow_step_run_id uuid NULL REFERENCES workflow_step_runs(id)
