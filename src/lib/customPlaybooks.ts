/**
 * User-created workflows from the pipeline “workflow creator” flow (Phase 2+).
 * Stored in localStorage only — no server persistence in mock mode.
 */

import type { WorkflowDefinition, WorkflowStep } from "./workflow-templates";
import { readFromStorage, writeToStorage } from "./storage";
import type { WorkflowActionBuildConfig } from "./workflow-action-build";
import {
  CUSTOM_PLAYBOOKS_STORAGE_KEY,
  type CreateUserWorkflowInput,
  type CustomPlaybookStored,
  type WorkflowLeg,
  actionStepName,
  formatActionSpecForWorkflowDescription,
  isUserWorkflowActionComplete,
  migrateLegacyCustomPlaybooksList,
  newCustomPlaybookId,
  summarizeUserWorkflowAction,
  trimUserWorkflowAction,
  validateStoredFollowUp,
} from "./custom-playbook-schema";

export * from "./custom-playbook-schema";

/** Drop invalid partial follow-up legs from stored rows. */
export function migratePartialFollowUpLegs(list: CustomPlaybookStored[]): {
  list: CustomPlaybookStored[];
  changed: boolean;
} {
  let changed = false;
  const next = list.map((pb) => {
    if (!pb.followUp) return pb;
    const result = validateStoredFollowUp(pb.followUp);
    if (result.ok) return pb;
    changed = true;
    const { followUp: _removed, ...rest } = pb;
    return rest;
  });
  return { list: next, changed };
}

export function migrateCustomPlaybooksList(list: CustomPlaybookStored[]): {
  list: CustomPlaybookStored[];
  changed: boolean;
} {
  const legacy = migrateLegacyCustomPlaybooksList(list);
  const followUp = migratePartialFollowUpLegs(legacy.list);
  return { list: followUp.list, changed: legacy.changed || followUp.changed };
}

export function loadCustomPlaybooks(): CustomPlaybookStored[] {
  const raw = readFromStorage<CustomPlaybookStored[]>(CUSTOM_PLAYBOOKS_STORAGE_KEY, []);
  const { list, changed } = migrateCustomPlaybooksList(raw);
  if (changed) saveCustomPlaybooks(list);
  return list;
}

export function saveCustomPlaybooks(playbooks: CustomPlaybookStored[]): void {
  writeToStorage(CUSTOM_PLAYBOOKS_STORAGE_KEY, playbooks);
}

/** Remove a user-built workflow from local storage (mock persistence). */
export function removeCustomPlaybook(id: string): boolean {
  const list = loadCustomPlaybooks();
  const next = list.filter((pb) => pb.id !== id);
  if (next.length === list.length) return false;
  saveCustomPlaybooks(next);
  return true;
}

/**
 * Append one custom playbook after validating non-empty name/trigger and complete action spec.
 * @returns the stored entry, or null if validation fails
 */
export function appendCustomPlaybook(input: CreateUserWorkflowInput): CustomPlaybookStored | null {
  const name = input.name.trim();
  const trigger = input.trigger.trim();
  const actionSpec = trimUserWorkflowAction(input.action);
  if (!name || !trigger || !isUserWorkflowActionComplete(actionSpec)) return null;

  const action = summarizeUserWorkflowAction(actionSpec);
  const entry: CustomPlaybookStored = {
    id: newCustomPlaybookId(),
    name,
    trigger,
    action,
    actionSpec,
    createdAt: new Date().toISOString(),
  };
  const list = loadCustomPlaybooks();
  list.push(entry);
  saveCustomPlaybooks(list);
  return entry;
}

export type SaveCustomPlaybookOptions = {
  /** Set, replace, or omit follow-up. Pass `null` to remove an existing follow-up leg. */
  followUp?: WorkflowLeg | null;
};

function applyFollowUpToEntry(
  entry: CustomPlaybookStored,
  followUp: WorkflowLeg | null | undefined
): CustomPlaybookStored {
  if (followUp === undefined) return entry;
  if (followUp === null) {
    const { followUp: _removed, ...rest } = entry;
    return rest;
  }
  const validation = validateStoredFollowUp(followUp);
  if (!validation.ok) return entry;
  return { ...entry, followUp };
}

/** Persist workflow after Action build wizard completes. */
export function appendCustomPlaybookWithActionBuild(
  input: CreateUserWorkflowInput,
  actionBuild: WorkflowActionBuildConfig,
  options?: SaveCustomPlaybookOptions
): CustomPlaybookStored | null {
  const entry = appendCustomPlaybook(input);
  if (!entry) return null;
  const list = loadCustomPlaybooks();
  const idx = list.findIndex((p) => p.id === entry.id);
  if (idx === -1) return entry;
  list[idx] = applyFollowUpToEntry({ ...list[idx], actionBuild }, options?.followUp);
  saveCustomPlaybooks(list);
  return list[idx];
}

/** Update an existing custom workflow after re-opening the create wizard. */
export function updateCustomPlaybookWithActionBuild(
  id: string,
  input: CreateUserWorkflowInput,
  actionBuild: WorkflowActionBuildConfig,
  options?: SaveCustomPlaybookOptions
): CustomPlaybookStored | null {
  const name = input.name.trim();
  const trigger = input.trigger.trim();
  const actionSpec = trimUserWorkflowAction(input.action);
  if (!name || !trigger || !isUserWorkflowActionComplete(actionSpec)) return null;

  const list = loadCustomPlaybooks();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  const action = summarizeUserWorkflowAction(actionSpec);
  list[idx] = applyFollowUpToEntry(
    {
      ...list[idx],
      name,
      trigger,
      action,
      actionSpec,
      actionBuild,
    },
    options?.followUp
  );
  saveCustomPlaybooks(list);
  return list[idx];
}

function primaryWorkflowStep(c: CustomPlaybookStored): WorkflowStep {
  if (c.actionSpec) {
    return {
      name: actionStepName(c.actionSpec),
      type: "action",
      description: formatActionSpecForWorkflowDescription(c.actionSpec),
    };
  }
  return { name: "Action", type: "action", description: c.action };
}

function followUpWorkflowSteps(followUp: NonNullable<CustomPlaybookStored["followUp"]>): WorkflowStep[] {
  const steps: WorkflowStep[] = [];
  const spec = followUp.triggerSpec;
  if (spec?.kind === "wait") {
    steps.push({
      name: "Wait",
      type: "wait",
      duration: `${spec.days} day${spec.days === 1 ? "" : "s"}`,
      description: "No reply after primary send",
      condition: "No reply",
    });
  }
  if (followUp.actionSpec?.kind === "send_email") {
    steps.push({
      name: followUp.actionBuild?.actionDescription?.trim() || "Follow-up email",
      type: "action",
      description: formatActionSpecForWorkflowDescription(followUp.actionSpec),
      condition: spec?.kind === "on_inbound_reply" ? "When LP replies" : "No reply after wait",
    });
  } else {
    steps.push({
      name: "Follow-up",
      type: "action",
      description: followUp.action,
      condition: spec?.kind === "on_inbound_reply" ? "When LP replies" : undefined,
    });
  }
  return steps;
}

/** Process definition for markdown / detail views (primary + optional wait + follow-up). */
export function workflowDefinitionFromCustomStored(c: CustomPlaybookStored): WorkflowDefinition {
  const steps: WorkflowStep[] = [primaryWorkflowStep(c)];
  if (c.followUp && validateStoredFollowUp(c.followUp).ok) {
    steps.push(...followUpWorkflowSteps(c.followUp));
  }
  return {
    title: c.name,
    triggerKind: "EVENT",
    trigger: c.trigger,
    steps,
  };
}
