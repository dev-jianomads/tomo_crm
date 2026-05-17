/**
 * Machine-readable mapping from workflow surface DTOs to SRS §6.2.6 workflow tables
 * and `tomo_action_log`. Use when implementing `GET/PATCH` routes so field ownership
 * stays obvious alongside the UI fixtures.
 *
 * Narrative, examples, and checklist: `docs/WORKFLOW_SURFACE_API_MAPPING_2026-05-17.md`
 * Types + fixtures: `./workflow-surface-mock`
 */

/** Canonical table names from TOMO V1 SRS §6.2.6 / §6.2 (action log). */
export const WORKFLOW_SURFACE_SRS_TABLES = [
  "workflows",
  "workflow_steps",
  "workflow_runs",
  "workflow_step_runs",
  "outbound_safety_log",
  "tomo_action_log",
] as const;

export type WorkflowSurfaceFieldSource = {
  dtoPath: string;
  tables: readonly (typeof WORKFLOW_SURFACE_SRS_TABLES)[number][];
  columnsOrPaths: readonly string[];
  notes?: string;
};

/** Top-level `WorkflowSurfaceEntry` fields → primary persistence. */
export const WORKFLOW_SURFACE_ENTRY_SOURCES: readonly WorkflowSurfaceFieldSource[] = [
  { dtoPath: "id", tables: ["workflows"], columnsOrPaths: ["id"], notes: "Mock uses slug strings; DB uses UUID." },
  { dtoPath: "name", tables: ["workflows"], columnsOrPaths: ["name"] },
  { dtoPath: "kind", tables: ["workflows"], columnsOrPaths: ["workflow_kind"] },
  { dtoPath: "status", tables: ["workflows"], columnsOrPaths: ["is_active"], notes: "Map active/inactive ↔ boolean." },
  {
    dtoPath: "badgeLabel",
    tables: ["workflows"],
    columnsOrPaths: ["workflow_kind", "slug", "parameters_jsonb"],
    notes: "UI label; may be server-computed.",
  },
  { dtoPath: "summary", tables: ["workflows"], columnsOrPaths: ["description"] },
  {
    dtoPath: "triggerLabel",
    tables: ["workflows"],
    columnsOrPaths: ["trigger_type", "trigger_config_jsonb"],
    notes: "Humanized for display.",
  },
  {
    dtoPath: "stats",
    tables: ["workflow_runs", "workflow_step_runs"],
    columnsOrPaths: ["aggregates"],
    notes: "Scoped by selected list / pipeline; not a workflows row.",
  },
  {
    dtoPath: "meta",
    tables: ["workflow_runs", "workflow_step_runs", "tomo_action_log"],
    columnsOrPaths: ["recent activity"],
    notes: "Denormalized read model for strip.",
  },
  { dtoPath: "steps", tables: ["workflow_steps"], columnsOrPaths: ["step_index", "name", "config_jsonb"] },
  {
    dtoPath: "attentionItems",
    tables: ["workflow_step_runs", "tomo_action_log"],
    columnsOrPaths: ["status", "outcome", "workflow_step_id"],
    notes: "stepId ↔ workflow_steps.id",
  },
  {
    dtoPath: "stateSummary",
    tables: ["workflow_step_runs"],
    columnsOrPaths: ["rollup by step / segment"],
  },
  {
    dtoPath: "runHistory",
    tables: ["workflow_runs"],
    columnsOrPaths: ["started_at", "status", "outcome", "lp_contact_id"],
    notes: "Mock uses cohort-style rows; product may group per cohort.",
  },
  { dtoPath: "baseTemplateId", tables: ["workflows"], columnsOrPaths: ["template_id"] },
  {
    dtoPath: "runConfig",
    tables: ["workflows"],
    columnsOrPaths: ["parameters_jsonb", "workflow_kind"],
    notes: "Server builds WorkflowRunConfig for drawer; editable ↔ kind/policy.",
  },
];

/** `WorkflowStepNode` (process card) → step definition row + JSON config. */
export const WORKFLOW_STEP_NODE_SOURCES: readonly WorkflowSurfaceFieldSource[] = [
  { dtoPath: "id", tables: ["workflow_steps"], columnsOrPaths: ["id"] },
  { dtoPath: "nodeType", tables: ["workflow_steps"], columnsOrPaths: ["config_jsonb.ui.nodeType", "step_type"] },
  { dtoPath: "actionType", tables: ["workflow_steps"], columnsOrPaths: ["config_jsonb.ui.actionType"] },
  { dtoPath: "title", tables: ["workflow_steps"], columnsOrPaths: ["name"] },
  { dtoPath: "description", tables: ["workflow_steps"], columnsOrPaths: ["config_jsonb.ui.description"] },
  {
    dtoPath: "timingLabel",
    tables: ["workflow_steps"],
    columnsOrPaths: ["config_jsonb.ui.timingLabel", "wait_duration_hours"],
  },
  { dtoPath: "statusLabel", tables: ["workflow_steps"], columnsOrPaths: ["config_jsonb.ui.statusLabel"] },
  {
    dtoPath: "locked",
    tables: ["workflows", "workflow_steps"],
    columnsOrPaths: ["workflow_kind", "config_jsonb.ui.locked"],
  },
  {
    dtoPath: "draftBatchId",
    tables: ["workflow_step_runs", "tomo_action_log"],
    columnsOrPaths: ["resolver"],
    notes: "Not stored on step; API resolves pending batch / wave id for drawer.",
  },
];

/** Batch drawer envelope. */
export const WORKFLOW_DRAFT_BATCH_SOURCES: readonly WorkflowSurfaceFieldSource[] = [
  { dtoPath: "id", tables: ["workflow_step_runs"], columnsOrPaths: ["id"], notes: "Or synthetic batch key from server." },
  { dtoPath: "workflowId", tables: ["workflows"], columnsOrPaths: ["id"] },
  { dtoPath: "stepId", tables: ["workflow_steps"], columnsOrPaths: ["id"] },
  {
    dtoPath: "eyebrow | title | context",
    tables: ["workflows", "workflow_steps"],
    columnsOrPaths: ["computed"],
    notes: "Server-composed labels.",
  },
  {
    dtoPath: "drafts[]",
    tables: ["tomo_action_log", "workflow_step_runs"],
    columnsOrPaths: ["metadata", "output_jsonb", "lp_contact_id"],
  },
];

/** Single LP draft row inside a batch. */
export const WORKFLOW_DRAFT_ROW_SOURCES: readonly WorkflowSurfaceFieldSource[] = [
  { dtoPath: "id", tables: ["tomo_action_log"], columnsOrPaths: ["id"] },
  {
    dtoPath: "lpName | firmName | email | roleLabel | tierLabel",
    tables: ["tomo_action_log"],
    columnsOrPaths: ["lp_contact_id → lp_contacts join"],
  },
  { dtoPath: "subject | body", tables: ["tomo_action_log"], columnsOrPaths: ["metadata", "output_jsonb"] },
  {
    dtoPath: "status",
    tables: ["tomo_action_log", "workflow_step_runs"],
    columnsOrPaths: ["outcome", "status", "character_change_pct"],
  },
  { dtoPath: "attachment", tables: ["tomo_action_log"], columnsOrPaths: ["metadata.attachments"] },
];

/** Outcome capture drawer (F7). */
export const WORKFLOW_OUTCOME_CAPTURE_SOURCES: readonly WorkflowSurfaceFieldSource[] = [
  { dtoPath: "workflowId", tables: ["workflows"], columnsOrPaths: ["id"] },
  { dtoPath: "pendingLpNames", tables: ["workflow_runs"], columnsOrPaths: ["lp_contact_id", "status", "outcome"] },
  {
    dtoPath: "options",
    tables: ["workflows"],
    columnsOrPaths: ["parameters_jsonb.outcome_options"],
    notes: "Or product constants for F7 enum.",
  },
];

/** Run history row. */
export const WORKFLOW_RUN_SUMMARY_SOURCES: readonly WorkflowSurfaceFieldSource[] = [
  { dtoPath: "id", tables: ["workflow_runs"], columnsOrPaths: ["id"] },
  { dtoPath: "listName", tables: ["workflow_runs"], columnsOrPaths: ["cohort label via list / filter join"] },
  { dtoPath: "startedAtLabel", tables: ["workflow_runs"], columnsOrPaths: ["started_at"] },
  { dtoPath: "lpCount", tables: ["workflow_runs"], columnsOrPaths: ["count(*) per cohort"] },
  { dtoPath: "statusLabel | outcomeSummary", tables: ["workflow_runs"], columnsOrPaths: ["status", "outcome", "aggregates"] },
];

/** Run config modal (Phase 6). */
export const WORKFLOW_RUN_CONFIG_SOURCES: readonly WorkflowSurfaceFieldSource[] = [
  { dtoPath: "workflowId", tables: ["workflows"], columnsOrPaths: ["id"] },
  { dtoPath: "editable", tables: ["workflows"], columnsOrPaths: ["workflow_kind"] },
  { dtoPath: "headline | supportingText", tables: ["workflows"], columnsOrPaths: ["parameters_jsonb.ui"] },
  {
    dtoPath: "fields[]",
    tables: ["workflows"],
    columnsOrPaths: ["parameters_jsonb"],
    notes: "List ids resolve via pipelines / lists API.",
  },
];
