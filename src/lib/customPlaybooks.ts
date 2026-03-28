/**
 * User-created workflows from the pipeline “workflow creator” flow (Phase 2+).
 * Stored in localStorage only — no server persistence in mock mode.
 */

import { readFromStorage, writeToStorage } from "./storage";

export const CUSTOM_PLAYBOOKS_STORAGE_KEY = "tomo-custom-playbooks-v1";

export type CustomPlaybookStored = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  createdAt: string;
};

export function newCustomPlaybookId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pb-custom-${crypto.randomUUID()}`;
  }
  return `pb-custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function loadCustomPlaybooks(): CustomPlaybookStored[] {
  return readFromStorage<CustomPlaybookStored[]>(CUSTOM_PLAYBOOKS_STORAGE_KEY, []);
}

export function saveCustomPlaybooks(playbooks: CustomPlaybookStored[]): void {
  writeToStorage(CUSTOM_PLAYBOOKS_STORAGE_KEY, playbooks);
}

/**
 * Append one custom playbook after validating non-empty trimmed fields.
 * @returns the stored entry, or null if validation fails
 */
export function appendCustomPlaybook(input: {
  name: string;
  trigger: string;
  action: string;
}): CustomPlaybookStored | null {
  const name = input.name.trim();
  const trigger = input.trigger.trim();
  const action = input.action.trim();
  if (!name || !trigger || !action) return null;

  const entry: CustomPlaybookStored = {
    id: newCustomPlaybookId(),
    name,
    trigger,
    action,
    createdAt: new Date().toISOString(),
  };
  const list = loadCustomPlaybooks();
  list.push(entry);
  saveCustomPlaybooks(list);
  return entry;
}
