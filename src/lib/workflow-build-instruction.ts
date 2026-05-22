/**
 * Build cohort-draft LLM instruction from wizard context (no separate refine step).
 */

export function buildCohortDraftInstruction(params: {
  workflowName: string;
  trigger: string;
  contextText: string;
}): string {
  const lines: string[] = [];
  const name = params.workflowName.trim();
  const trigger = params.trigger.trim();
  const context = params.contextText.trim();

  if (name) lines.push(`Workflow: ${name}`);
  if (trigger) lines.push(`Trigger: ${trigger}`);
  if (context) lines.push(`Context:\n${context}`);

  return lines.join("\n\n") || "Outreach for this list";
}
