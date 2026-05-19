/**
 * User-created workflows from the pipeline “workflow creator” flow (Phase 2+).
 * Stored in localStorage only — no server persistence in mock mode.
 */

import type { WorkflowDefinition } from "./workflow-templates";
import { readFromStorage, writeToStorage } from "./storage";
import {
  CUSTOM_PLAYBOOKS_STORAGE_KEY,
  type CreateUserWorkflowInput,
  type CustomPlaybookStored,
  actionStepName,
  formatActionSpecForWorkflowDescription,
  isUserWorkflowActionComplete,
  migrateLegacyCustomPlaybooksList,
  newCustomPlaybookId,
  summarizeUserWorkflowAction,
  trimUserWorkflowAction,
} from "./custom-playbook-schema";

export * from "./custom-playbook-schema";

export function loadCustomPlaybooks(): CustomPlaybookStored[] {
  const raw = readFromStorage<CustomPlaybookStored[]>(CUSTOM_PLAYBOOKS_STORAGE_KEY, []);
  const { list, changed } = migrateLegacyCustomPlaybooksList(raw);
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

/** Minimal process definition for the workflows UI (trigger + single action step). */
export function workflowDefinitionFromCustomStored(c: CustomPlaybookStored): WorkflowDefinition {
  if (c.actionSpec) {
    return {
      title: c.name,
      triggerKind: "EVENT",
      trigger: c.trigger,
      steps: [
        {
          name: actionStepName(c.actionSpec),
          type: "action",
          description: formatActionSpecForWorkflowDescription(c.actionSpec),
        },
      ],
    };
  }
  return {
    title: c.name,
    triggerKind: "EVENT",
    trigger: c.trigger,
    steps: [{ name: "Action", type: "action", description: c.action }],
  };
}
