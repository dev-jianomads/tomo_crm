/**
 * Mock Tomo assistance data per entity.
 * Maps entity id → initialMessage (Tomo speaks first) + suggestedPrompts.
 */

export type TomoMessageBlock =
  | { kind: "crm_table"; rows: { field: string; current: string; update: string; reason: string }[] }
  | { kind: "draft"; content: string; type?: "email" | "invite" }
  | { kind: "brief"; summary?: string; agenda?: string[]; commitments?: string[] }
  | { kind: "workflow_link"; playbookId: string; name: string; description: string };

export type TomoInitialMessage = {
  text: string;
  blocks?: TomoMessageBlock[];
};

export type TomoAssistance = {
  initialMessage: TomoInitialMessage;
  suggestedPrompts: string[];
};

export const tomoAssistanceByEntity: Record<string, TomoAssistance> = {
  // a3: CRM update (Lumen)
  a3: {
    initialMessage: {
      text: "No response in 5 days — stall risk rising. Can I update CRM as follows?",
      blocks: [
        {
          kind: "crm_table",
          rows: [
            { field: "Stall risk", current: "—", update: "Rising", reason: "No response in 5d" },
            { field: "Status", current: "—", update: "Blocked", reason: "No response in 5d" },
          ],
        },
        { kind: "workflow_link", playbookId: "pb-no-response-stall", name: "No Response → Re-engage", description: "When LP goes silent after 2 touches, flag as blocked, suggest CRM updates, set reminder." },
      ],
    },
    suggestedPrompts: ["Apply blocked status", "Set reminder", "Apply CRM updates", "Explain why blocked", "Skip reminder"],
  },

  // a1: Outreach (Northwind)
  a1: {
    initialMessage: {
      text: "Northwind momentum is up; deck ready. Good time to send. Here's a draft:",
      blocks: [
        { kind: "draft", content: "Hi Alex — quick pulse on Q4 performance and next steps for your allocation...", type: "email" },
        { kind: "workflow_link", playbookId: "pb-update-followup", name: "Update → Follow-Up", description: "After monthly update, segment LPs by engagement and auto-draft follow-ups." },
      ],
    },
    suggestedPrompts: ["Approve & send", "Reject", "Edit draft", "Tone it down", "Make it shorter", "Add next steps"],
  },

  // a2: Scheduling (Peakline)
  a2: {
    initialMessage: {
      text: "Peakline opened deck 3x — high intent. Propose concrete slots.",
      blocks: [
        { kind: "draft", content: "Hi Jamie — Tomo found a 30m slot next Tuesday. Want me to send the invite with a brief agenda?", type: "invite" },
        { kind: "workflow_link", playbookId: "pb-post-meeting", name: "Post-Meeting Execution", description: "Pull transcript, draft follow-up, require human approval before sending." },
      ],
    },
    suggestedPrompts: ["Send invite", "Propose different times", "Explain this playbook", "Skip for now"],
  },

  // c1: Commitment (Northwind Q4 review)
  c1: {
    initialMessage: {
      text: "Keep the next move tight and confirm owner. Here's a Tomo-drafted brief:",
      blocks: [
        { kind: "brief", summary: "Northwind is leaning in after strong Q4; wants clarity on pipeline and risk.", agenda: ["Performance highlights", "Risk / hedging stance", "Next allocation step"], commitments: ["Send follow-up deck", "Confirm allocation window"] },
        { kind: "workflow_link", playbookId: "pb-post-meeting", name: "Post-Meeting Execution", description: "Pull transcript, draft follow-up, require human approval before sending." },
      ],
    },
    suggestedPrompts: ["Open full brief", "Draft follow-up email", "Create action", "Explain this playbook"],
  },

  // c2: Commitment (Peakline)
  c2: {
    initialMessage: {
      text: "Peakline opened deck multiple times — need to secure a concrete slot.",
      blocks: [
        { kind: "brief", summary: "Peakline opened deck multiple times; need to secure a concrete slot.", agenda: ["Scheduling decision", "Performance Q&A", "Next steps to commit"], commitments: ["Lock meeting time", "Share concise 3-bullet update"] },
        { kind: "workflow_link", playbookId: "pb-post-meeting", name: "Post-Meeting Execution", description: "Pull transcript, draft follow-up, require human approval before sending." },
      ],
    },
    suggestedPrompts: ["Open full brief", "Draft follow-up email", "Create action"],
  },

  // c3: Commitment (Lumen) — no brief
  c3: {
    initialMessage: {
      text: "Lumen async update — keep it concise and actionable.",
      blocks: [
        { kind: "workflow_link", playbookId: "pb-update-followup", name: "Update → Follow-Up", description: "After monthly update, segment LPs by engagement and auto-draft follow-ups." },
      ],
    },
    suggestedPrompts: ["Draft update email", "Create action", "Explain this playbook"],
  },

  // b1: Brief (Northwind)
  b1: {
    initialMessage: {
      text: "Northwind is leaning in after strong Q4; wants clarity on pipeline and risk.",
      blocks: [
        { kind: "brief", agenda: ["Performance highlights", "Risk / hedging stance", "Next allocation step"], commitments: ["Send follow-up deck", "Confirm allocation window"] },
        { kind: "workflow_link", playbookId: "pb-post-meeting", name: "Post-Meeting Execution", description: "Pull transcript, draft follow-up, require human approval before sending." },
      ],
    },
    suggestedPrompts: ["Create follow-up action", "Draft email", "Open full brief"],
  },

  // b2: Brief (Peakline)
  b2: {
    initialMessage: {
      text: "Peakline opened deck multiple times; need to secure a concrete slot.",
      blocks: [
        { kind: "brief", agenda: ["Scheduling decision", "Performance Q&A", "Next steps to commit"], commitments: ["Lock meeting time", "Share concise 3-bullet update"] },
        { kind: "workflow_link", playbookId: "pb-post-meeting", name: "Post-Meeting Execution", description: "Pull transcript, draft follow-up, require human approval before sending." },
      ],
    },
    suggestedPrompts: ["Create follow-up action", "Draft email", "Open full brief"],
  },
};

export function getTomoAssistance(entityId: string): TomoAssistance | null {
  return tomoAssistanceByEntity[entityId] ?? null;
}
