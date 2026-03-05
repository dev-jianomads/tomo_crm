/**
 * Mock Tomo assistance data per entity.
 * Maps entity id → blocks (insight, draft, crm_update, workflow, etc.) + suggestedPrompts for Section 3.
 */

export type TomoAssistanceBlock =
  | { kind: "insight"; label: string; content: string }
  | { kind: "draft"; label: string; content: string; type?: "email" | "invite" }
  | { kind: "crm_update"; label: string; rows: { field: string; current: string; update: string; reason: string }[] }
  | { kind: "workflow"; label: string; playbooks: { id: string; name: string; description: string }[] }
  | { kind: "status"; label: string; value: string }
  | { kind: "reminder"; label: string; content: string }
  | {
      kind: "brief";
      label: string;
      summary?: string;
      agenda?: string[];
      commitments?: string[];
    };

export type TomoAssistance = {
  blocks: TomoAssistanceBlock[];
  suggestedPrompts: string[];
};

export const tomoAssistanceByEntity: Record<string, TomoAssistance> = {
  // a3: CRM update (Lumen)
  a3: {
    blocks: [
      { kind: "status", label: "Suggested status", value: "Blocked" },
      { kind: "reminder", label: "Set reminder", content: "Set a 3-day reminder" },
      {
        kind: "crm_update",
        label: "Proposed updates",
        rows: [
          { field: "Stall risk", current: "—", update: "Rising", reason: "No response in 5d" },
          { field: "Status", current: "—", update: "Blocked", reason: "No response in 5d" },
        ],
      },
      {
        kind: "workflow",
        label: "Suggested workflow",
        playbooks: [
          {
            id: "pb-no-response-stall",
            name: "No Response → Re-engage",
            description: "When LP goes silent after 2 touches, flag as blocked, suggest CRM updates, set reminder.",
          },
        ],
      },
    ],
    suggestedPrompts: ["Apply blocked status", "Set reminder", "Apply CRM updates", "Explain why blocked", "Skip reminder"],
  },

  // a1: Outreach (Northwind)
  a1: {
    blocks: [
      {
        kind: "insight",
        label: "Tomo insight",
        content: "Northwind momentum is up; deck ready. Good time to send.",
      },
      {
        kind: "draft",
        label: "Draft email",
        content: "Hi Alex — quick pulse on Q4 performance and next steps for your allocation...",
        type: "email",
      },
      {
        kind: "workflow",
        label: "Suggested workflow",
        playbooks: [
          {
            id: "pb-update-followup",
            name: "Update → Follow-Up",
            description: "After monthly update, segment LPs by engagement and auto-draft follow-ups.",
          },
        ],
      },
    ],
    suggestedPrompts: ["Approve & send", "Reject", "Edit draft", "Tone it down", "Make it shorter", "Add next steps"],
  },

  // a2: Scheduling (Peakline)
  a2: {
    blocks: [
      {
        kind: "insight",
        label: "Tomo insight",
        content: "Peakline opened deck 3x — high intent. Propose concrete slots.",
      },
      {
        kind: "draft",
        label: "Draft invite",
        content: "Hi Jamie — Tomo found a 30m slot next Tuesday. Want me to send the invite with a brief agenda?",
        type: "invite",
      },
      {
        kind: "workflow",
        label: "Suggested workflow",
        playbooks: [
          {
            id: "pb-post-meeting",
            name: "Post-Meeting Execution",
            description: "Pull transcript, draft follow-up, require human approval before sending.",
          },
        ],
      },
    ],
    suggestedPrompts: ["Send invite", "Propose different times", "Explain this playbook", "Skip for now"],
  },

  // c1: Commitment (Northwind Q4 review)
  c1: {
    blocks: [
      {
        kind: "insight",
        label: "Meeting prep",
        content: "Keep the next move tight and confirm owner.",
      },
      {
        kind: "brief",
        label: "Tomo-drafted brief",
        summary: "Northwind is leaning in after strong Q4; wants clarity on pipeline and risk.",
        agenda: ["Performance highlights", "Risk / hedging stance", "Next allocation step"],
        commitments: ["Send follow-up deck", "Confirm allocation window"],
      },
      {
        kind: "workflow",
        label: "Suggested workflow",
        playbooks: [
          {
            id: "pb-post-meeting",
            name: "Post-Meeting Execution",
            description: "Pull transcript, draft follow-up, require human approval before sending.",
          },
        ],
      },
    ],
    suggestedPrompts: ["Open full brief", "Draft follow-up email", "Create action", "Explain this playbook"],
  },

  // c2: Commitment (Peakline)
  c2: {
    blocks: [
      {
        kind: "insight",
        label: "Meeting prep",
        content: "Peakline opened deck multiple times; need to secure a concrete slot.",
      },
      {
        kind: "brief",
        label: "Tomo-drafted brief",
        summary: "Peakline opened deck multiple times; need to secure a concrete slot.",
        agenda: ["Scheduling decision", "Performance Q&A", "Next steps to commit"],
        commitments: ["Lock meeting time", "Share concise 3-bullet update"],
      },
      {
        kind: "workflow",
        label: "Suggested workflow",
        playbooks: [
          {
            id: "pb-post-meeting",
            name: "Post-Meeting Execution",
            description: "Pull transcript, draft follow-up, require human approval before sending.",
          },
        ],
      },
    ],
    suggestedPrompts: ["Open full brief", "Draft follow-up email", "Create action"],
  },

  // c3: Commitment (Lumen) — no brief
  c3: {
    blocks: [
      {
        kind: "insight",
        label: "Meeting prep",
        content: "Lumen async update — keep it concise and actionable.",
      },
      {
        kind: "workflow",
        label: "Suggested workflow",
        playbooks: [
          {
            id: "pb-update-followup",
            name: "Update → Follow-Up",
            description: "After monthly update, segment LPs by engagement and auto-draft follow-ups.",
          },
        ],
      },
    ],
    suggestedPrompts: ["Draft update email", "Create action", "Explain this playbook"],
  },

  // b1: Brief (Northwind)
  b1: {
    blocks: [
      {
        kind: "insight",
        label: "Tomo summary",
        content: "Northwind is leaning in after strong Q4; wants clarity on pipeline and risk.",
      },
      {
        kind: "brief",
        label: "Agenda",
        agenda: ["Performance highlights", "Risk / hedging stance", "Next allocation step"],
      },
      {
        kind: "brief",
        label: "Commitments",
        commitments: ["Send follow-up deck", "Confirm allocation window"],
      },
      {
        kind: "workflow",
        label: "Suggested workflow",
        playbooks: [
          {
            id: "pb-post-meeting",
            name: "Post-Meeting Execution",
            description: "Pull transcript, draft follow-up, require human approval before sending.",
          },
        ],
      },
    ],
    suggestedPrompts: ["Create follow-up action", "Draft email", "Open full brief"],
  },

  // b2: Brief (Peakline)
  b2: {
    blocks: [
      {
        kind: "insight",
        label: "Tomo summary",
        content: "Peakline opened deck multiple times; need to secure a concrete slot.",
      },
      {
        kind: "brief",
        label: "Agenda",
        agenda: ["Scheduling decision", "Performance Q&A", "Next steps to commit"],
      },
      {
        kind: "brief",
        label: "Commitments",
        commitments: ["Lock meeting time", "Share concise 3-bullet update"],
      },
      {
        kind: "workflow",
        label: "Suggested workflow",
        playbooks: [
          {
            id: "pb-post-meeting",
            name: "Post-Meeting Execution",
            description: "Pull transcript, draft follow-up, require human approval before sending.",
          },
        ],
      },
    ],
    suggestedPrompts: ["Create follow-up action", "Draft email", "Open full brief"],
  },
};

export function getTomoAssistance(entityId: string): TomoAssistance | null {
  return tomoAssistanceByEntity[entityId] ?? null;
}
