/**
 * Mock Tomo assistance data per entity.
 * Maps entity id → initialMessage (Tomo speaks first) + suggestedPrompts.
 */

export type TomoMessageBlock =
  | { kind: "crm_table"; rows: { field: string; current: string; update: string; reason: string }[] }
  | { kind: "draft"; content: string; type?: "email" | "invite" }
  | { kind: "brief"; summary?: string; agenda?: string[]; commitments?: string[] }
  | { kind: "workflow_link"; playbookId: string; name: string; description: string }
  | { kind: "snapshot"; text: string };

export type TomoInitialMessage = {
  text: string;
  blocks?: TomoMessageBlock[];
};

export type TomoAssistance = {
  initialMessage: TomoInitialMessage;
  suggestedPrompts: string[];
};

export const tomoAssistanceByEntity: Record<string, TomoAssistance> = {
  // a2: Post-Meeting Execution
  a2: {
    initialMessage: {
      text: "Northwind Q4 review meeting ended 2h ago. Transcript extracted — follow-up draft ready.",
      blocks: [
        { kind: "draft", content: "Hi Alex — great connecting today. As discussed, here's the updated deck and our Q1 timeline...", type: "email" },
        { kind: "workflow_link", playbookId: "pb-post-meeting", name: "Post-Meeting Execution", description: "Pull transcript, draft follow-up, require human approval before sending." },
      ],
    },
    suggestedPrompts: ["Approve & send", "Edit draft", "Add action items", "Explain this playbook"],
  },

  // a3: Update → Follow-Up
  a3: {
    initialMessage: {
      text: "5 Tier 1–2 LPs haven't opened the January update after 5 days. Personalized follow-ups drafted.",
      blocks: [
        { kind: "workflow_link", playbookId: "pb-update-followup", name: "Update → Follow-Up", description: "After monthly update, segment LPs by engagement and auto-draft follow-ups." },
      ],
    },
    suggestedPrompts: ["Review follow-ups", "Approve highest priority", "Segment by tier", "Explain this playbook"],
  },

  // a4: No Response → Re-engage
  a4: {
    initialMessage: {
      text: "No response in 5 days — stall risk rising. Can I update CRM as follows?",
      blocks: [
        {
          kind: "crm_table",
          rows: [
            { field: "Momentum", current: "—", update: "Cooling", reason: "No response in 5d" },
            { field: "Stage", current: "—", update: "Blocked", reason: "No response in 5d" },
            { field: "Reminder", current: "—", update: "7d", reason: "Re-engage window" },
          ],
        },
        { kind: "workflow_link", playbookId: "pb-no-response-stall", name: "No Response → Re-engage", description: "When LP goes silent after 2 touches, flag as blocked, suggest CRM updates, set reminder." },
      ],
    },
    suggestedPrompts: ["Apply CRM updates", "Set reminder", "Explain why blocked", "Skip reminder"],
  },

  // a5: Email Scheduling Assistant (Tomo Default)
  a5: {
    initialMessage: {
      text: "Jamie Chen asked for available times. Found 3 slots — draft response ready.",
      blocks: [
        { kind: "draft", content: "Hi Jamie — absolutely, here are a few times that work on our end: Tue 10am, Wed 2pm, Thu 11am ET. Which works best?", type: "email" },
        { kind: "workflow_link", playbookId: "td-email-scheduling", name: "Email Scheduling Assistant", description: "Scan email for scheduling requests, find availability, draft response." },
      ],
    },
    suggestedPrompts: ["Approve & send", "Propose different times", "Add more slots", "Skip for now"],
  },

  // a6: Meeting Notes → Actions (Tomo Default)
  a6: {
    initialMessage: {
      text: "Harborlight call processed. 2 CRM updates and 1 follow-up commitment extracted.",
      blocks: [
        {
          kind: "crm_table",
          rows: [
            { field: "Contact seniority", current: "—", update: "C-Suite", reason: "Now reports to CIO" },
            { field: "Stage", current: "—", update: "Met", reason: "Meeting completed" },
          ],
        },
        { kind: "workflow_link", playbookId: "td-meeting-notes", name: "Meeting Notes → Actions", description: "Extract action items & commitments from meeting notes, suggest CRM updates." },
      ],
    },
    suggestedPrompts: ["Apply CRM updates", "Create follow-up", "Edit suggested updates", "Skip for now"],
  },

  // a7: Website → CRM Sync (Tomo Default)
  a7: {
    initialMessage: {
      text: "Meridian Endowment website scan detected David Kim's title change: VP → CIO.",
      blocks: [
        {
          kind: "crm_table",
          rows: [
            { field: "Contact seniority", current: "VP", update: "C-Suite", reason: "Website updated 2d ago" },
          ],
        },
        { kind: "workflow_link", playbookId: "td-website-scan", name: "Website → CRM Sync", description: "Scan corporate website, suggest CRM updates for title, role, contact info." },
      ],
    },
    suggestedPrompts: ["Apply CRM update", "Skip for now", "Check other contacts"],
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

  // r1–r4: Relationships (Alex Morgan, Jamie Chen, Priya Desai, Samir Patel)
  r1: {
    initialMessage: {
      text: "Northwind momentum is heating up. Good time to share the Q4 performance deck.",
      blocks: [
        { kind: "snapshot", text: "Momentum is heating up. Pace feels fast. Next to watch: Share Q4 performance deck." },
        {
          kind: "draft",
          content: "Hi Alex,\n\nQuick pulse on Q4 performance and next steps for your allocation. We've seen strong results across the book and wanted to share a brief snapshot before we sync.\n\nKey highlights: performance in line with targets, risk adjusted. Happy to walk through when you have 15 minutes.\n\nBest,",
          type: "email",
        },
        { kind: "workflow_link", playbookId: "pb-update-followup", name: "Update → Follow-Up", description: "After monthly update, segment LPs by engagement and auto-draft follow-ups." },
      ],
    },
    suggestedPrompts: ["Summarize last thread", "Draft outreach", "Propose next step", "Create action"],
  },
  r2: {
    initialMessage: {
      text: "Peakline is stable; schedule the allocation review to keep momentum.",
      blocks: [
        { kind: "snapshot", text: "Momentum is steady. Pace feels moderate. Next to watch: Schedule allocation review." },
        {
          kind: "draft",
          content: "Hi Jamie,\n\nTomo found a 30m slot next Tuesday at 2pm. Want me to send the invite with a brief agenda? We can cover the allocation review and next steps.\n\nBest,",
          type: "invite",
        },
        { kind: "workflow_link", playbookId: "pb-post-meeting", name: "Post-Meeting Execution", description: "Pull transcript, draft follow-up, require human approval before sending." },
      ],
    },
    suggestedPrompts: ["Summarize last thread", "Draft outreach", "Propose next step", "Create action"],
  },
  r3: {
    initialMessage: {
      text: "Lumen momentum is cooling — no reply in 14 days. Suggest a concise update to re-engage.",
      blocks: [
        { kind: "snapshot", text: "Momentum is cooling. Pace feels slow. Next to watch: Send concise update + ask for feedback." },
        {
          kind: "draft",
          content: "Hi Priya,\n\nBrief Q4 snapshot attached. One question: still interested in the allocation window? Happy to jump on a quick call if helpful.\n\nBest,",
          type: "email",
        },
        { kind: "workflow_link", playbookId: "pb-no-response-stall", name: "No Response → Re-engage", description: "When LP goes silent after 2 touches, flag as blocked, suggest CRM updates, set reminder." },
      ],
    },
    suggestedPrompts: ["Summarize last thread", "Draft outreach", "Propose next step", "Create action"],
  },
  r4: {
    initialMessage: {
      text: "Harborlight is stalled. Re-engage with a performance snapshot to test interest.",
      blocks: [
        { kind: "snapshot", text: "Momentum is cooling. Pace feels slow. Next to watch: Re-engage with performance snapshot." },
        {
          kind: "draft",
          content: "Hi Samir,\n\nQ4 performance snapshot attached. Happy to walk through when you have 15 minutes.\n\nBest,",
          type: "email",
        },
        { kind: "workflow_link", playbookId: "pb-no-response-stall", name: "No Response → Re-engage", description: "When LP goes silent after 2 touches, flag as blocked, suggest CRM updates, set reminder." },
      ],
    },
    suggestedPrompts: ["Summarize last thread", "Draft outreach", "Propose next step", "Create action"],
  },
};

/** Generic fallback for generated relationships r5+ (no custom Tomo entry) */
const RELATIONSHIP_FALLBACK: TomoAssistance = {
  initialMessage: {
    text: "Here's a snapshot of this relationship. I can help draft outreach, propose next steps, or create actions.",
    blocks: [
      { kind: "snapshot", text: "Select an action below to get started. I can summarize recent threads, draft outreach, or suggest the next move based on stage and momentum." },
      { kind: "workflow_link", playbookId: "pb-update-followup", name: "Update → Follow-Up", description: "After monthly update, segment LPs by engagement and auto-draft follow-ups." },
    ],
  },
  suggestedPrompts: ["Summarize last thread", "Draft outreach", "Propose next step", "Create action"],
};

export function getTomoAssistance(entityId: string): TomoAssistance | null {
  const specific = tomoAssistanceByEntity[entityId];
  if (specific) return specific;
  // Generic fallback for generated relationships (r5+)
  if (/^r\d+$/.test(entityId)) return RELATIONSHIP_FALLBACK;
  return null;
}
