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
  /**
   * Phase 1 — chips that run as lightweight execution (toast / confirm, no chat turn).
   * When either array is set, they replace the single-row `suggestedPrompts` behavior for chips.
   */
  executionChips?: string[];
  /** Phase 1 — chips that add to the drafted block and may message the model. */
  draftChips?: string[];
};

export const tomoAssistanceByEntity: Record<string, TomoAssistance> = {
  // a1: Email Scheduling Assistant (Tomo Default)
  a1: {
    initialMessage: {
      text: "Peter Zakowich (PAAMCO Prisma) asked for a meeting March 18. You're free 9am and 11am ET — draft reply proposes both.",
      blocks: [
        {
          kind: "draft",
          content:
            "Hi Peter — thanks for reaching out. I'm free March 18 at 9:00am or 11:00am ET for 30 minutes. Please let me know which works best and I'll send a calendar invite.\n\nBest regards,",
          type: "email",
        },
        {
          kind: "workflow_link",
          playbookId: "td-email-scheduling",
          name: "Email Scheduling Assistant",
          description: "Scan email for scheduling requests, find availability, draft response.",
        },
      ],
    },
    executionChips: ["Verify March 18 on calendar", "Copy EA on reply"],
    draftChips: ["Approve & send", "Offer different slots", "Add video link", "Skip for now"],
    suggestedPrompts: [],
  },

  // a2: Warm Intro Tracker
  a2: {
    initialMessage: {
      text: "Liyen Chow introduced Michel del Buono (A16z Family Office) 2 days ago — no reply yet. Draft references Liyen and Q4 performance.",
      blocks: [
        {
          kind: "draft",
          content:
            "Hi Michel — great to meet you, and thank you Liyen for the introduction.\n\nBrief context: we had a strong Q4 and are speaking with a small set of aligned family offices. I'd welcome a short intro call at your convenience.\n\nBest regards,",
          type: "email",
        },
        { kind: "workflow_link", playbookId: "pb-intro-tracker", name: "Warm Intro Tracker", description: "Detect CC'd intros, draft reply within 24h, escalate if LP is silent." },
      ],
    },
    executionChips: ["Mark intro acknowledged", "Pull Liyen thread"],
    draftChips: ["Approve & send", "Shorten intro", "Add allocator names", "Explain this playbook"],
    suggestedPrompts: [],
  },

  // a3: Post-Meeting Execution
  a3: {
    initialMessage: {
      text: "Albourne (James Staltari) — post-meeting note is past the 2h SLA. Draft covers recap, materials, and COO call path.",
      blocks: [
        {
          kind: "draft",
          content:
            "Hi James — thank you for yesterday's time. Quick recap: we covered portfolio positioning, liquidity terms, and next steps toward Q2 allocator reads. I'll follow up with the materials we discussed and propose times for a call with our COO.\n\nBest regards,",
          type: "email",
        },
        { kind: "workflow_link", playbookId: "pb-post-meeting", name: "Post-Meeting Execution", description: "Pull transcript, draft follow-up, require human approval before sending." },
      ],
    },
    executionChips: ["Open CRM tasks view", "Snooze SLA reminder 1h"],
    draftChips: ["Approve & send", "Add CRM tasks from meeting", "Schedule COO call", "Explain SLA"],
    suggestedPrompts: [],
  },

  // a4: No Response → Re-engage (GIC)
  a4: {
    initialMessage: {
      text: "No reply from Kwong Hong Huat @ GIC in 2 days after your propose-times email. Draft follow-up copies his EA.",
      blocks: [
        {
          kind: "draft",
          content:
            "Dear Mr. Kwong — following up on my note from two days ago regarding the new fund launch discussion. Still very keen to find time that works for you. Copying your EA for scheduling convenience.\n\nKind regards,",
          type: "email",
        },
        {
          kind: "workflow_link",
          playbookId: "pb-no-response-stall",
          name: "No Response → Re-engage",
          description: "When LP goes silent after 2 touches, flag as blocked, suggest CRM updates, set reminder.",
        },
      ],
    },
    executionChips: ["Log touch attempt", "Copy EA on send"],
    draftChips: ["Approve & send", "Soften tone", "Propose new times", "Explain this playbook"],
    suggestedPrompts: [],
  },

  // a5: Update → Follow-Up (momentum report)
  a5: {
    initialMessage: {
      text: "Monthly momentum report is ready — compare this newsletter send to the last three months and spot who dropped in or out of top engagement.",
      blocks: [
        {
          kind: "snapshot",
          text: "Top movers and cooling LPs are summarized in the action evidence. Use Daily Brief → Momentum Signals for the same story in brief form.",
        },
        { kind: "workflow_link", playbookId: "pb-update-followup", name: "Update → Follow-Up", description: "After monthly update, segment LPs by engagement and auto-draft follow-ups." },
      ],
    },
    suggestedPrompts: ["Summarize top 5 risers", "Who should we call first?", "Draft follow-up for cooling LP", "Explain this playbook"],
  },

  // a6: No Response → Re-engage (Amundi cooling)
  a6: {
    initialMessage: {
      text: "Amundi FoF — 18 days since last meaningful touch; Q2 decision ahead. Draft check-in is short and non-pushy.",
      blocks: [
        {
          kind: "draft",
          content:
            "Hi Camille — hope you're well. Wanted to check in ahead of your Q2 process and see if a short call would be helpful on our side. Happy to work around your schedule.\n\nBest regards,",
          type: "email",
        },
        {
          kind: "workflow_link",
          playbookId: "pb-no-response-stall",
          name: "No Response → Re-engage",
          description: "When LP goes silent after 2 touches, flag as blocked, suggest CRM updates, set reminder.",
        },
      ],
    },
    suggestedPrompts: ["Approve & send", "Add allocator context", "Propose two call slots", "Explain this playbook"],
  },

  // r5–r9: Scenario relationships (Today card LPs)
  r5: {
    initialMessage: {
      text: "PAAMCO Prisma — Peter is asking to meet March 18. Calendar-aware reply is on your Today list.",
      blocks: [
        { kind: "snapshot", text: "Tier 1 momentum heating; diligence-stage. Next: lock time on March 18." },
        { kind: "workflow_link", playbookId: "td-email-scheduling", name: "Email Scheduling Assistant", description: "Scan email for scheduling requests, find availability, draft response." },
      ],
    },
    suggestedPrompts: ["Summarize last email", "Draft one-line hold", "Open Today action", "Explain scheduling workflow"],
  },
  r6: {
    initialMessage: {
      text: "Goldman cap intro — Michel del Buono at A16z Family Office. Reply while the intro is fresh.",
      blocks: [
        { kind: "snapshot", text: "Source credit: Liyen Chow. Strong Q4 narrative fits this first reply." },
        { kind: "workflow_link", playbookId: "pb-intro-tracker", name: "Warm Intro Tracker", description: "Detect CC'd intros, draft reply within 24h, escalate if LP is silent." },
      ],
    },
    suggestedPrompts: ["Draft intro reply", "Pull Liyen thread", "Explain intro playbook", "Create follow-up task"],
  },
  r7: {
    initialMessage: {
      text: "Albourne — James Staltari. Post-meeting execution loop is open; SLA note is on Today.",
      blocks: [
        { kind: "snapshot", text: "Consultant path; Met / active-stable. COO call is the next structural step." },
        { kind: "workflow_link", playbookId: "pb-post-meeting", name: "Post-Meeting Execution", description: "Pull transcript, draft follow-up, require human approval before sending." },
      ],
    },
    suggestedPrompts: ["Open post-meeting draft", "List CRM tasks", "Schedule COO prep", "Explain playbook"],
  },
  r8: {
    initialMessage: {
      text: "GIC — Kwong Hong Huat. Waiting on meeting confirm for new fund launch; gentle nudge drafted.",
      blocks: [
        { kind: "snapshot", text: "Sovereign / Tier 1; APAC. Two days silence after propose-times email." },
        { kind: "workflow_link", playbookId: "pb-no-response-stall", name: "No Response → Re-engage", description: "When LP goes silent after 2 touches, flag as blocked, suggest CRM updates, set reminder." },
      ],
    },
    suggestedPrompts: ["Review follow-up draft", "Suggest alternate times", "Summarize last email", "Explain playbook"],
  },
  r9: {
    initialMessage: {
      text: "Amundi FoF — relationship cooling into Q2. Light check-in keeps you in the allocator's active set.",
      blocks: [
        { kind: "snapshot", text: "18d since last touch; last meeting tone was positive. Allocation read expected Q2." },
        { kind: "workflow_link", playbookId: "pb-no-response-stall", name: "No Response → Re-engage", description: "When LP goes silent after 2 touches, flag as blocked, suggest CRM updates, set reminder." },
      ],
    },
    suggestedPrompts: ["Draft check-in", "Review Q2 timeline", "Open Today action", "Explain playbook"],
  },

  // c1: PAAMCO HF Update
  c1: {
    initialMessage: {
      text: "PAAMCO Prisma HF Update at 2pm — prep pack is ready. Focus on attribution vs peers and allocator-desk questions from Peter's team.",
      blocks: [
        {
          kind: "brief",
          summary: "Quarterly hedge fund update; focus on attribution, capacity, and any strategy shifts Charly flagged in email.",
          agenda: ["Performance vs peers", "Risk & exposure snapshot", "Questions from their allocator desk"],
          commitments: ["Send one-pager after call", "Confirm data room access renewal"],
        },
        { kind: "workflow_link", playbookId: "pb-post-meeting", name: "Post-Meeting Execution", description: "Pull transcript, draft follow-up, require human approval before sending." },
      ],
    },
    executionChips: ["Open brief PDF", "Add peer comp slide"],
    draftChips: ["3-bullet talking points", "What should I emphasize?", "Draft follow-up email"],
    suggestedPrompts: [],
  },

  // c2: A16z Family Office Investment Update
  c2: {
    initialMessage: {
      text: "A16z Family Office Investment Update at 4pm — Michel asked about liquidity terms and co-invest last time. Brief is locked.",
      blocks: [
        {
          kind: "brief",
          summary: "Investment Update on current fund; Frank asked for liquidity terms and co-invest posture last touch.",
          agenda: ["Portfolio update", "Liquidity & terms", "Path to next IC"],
          commitments: ["Follow up on co-invest deck", "Share updated DDQ index"],
        },
        { kind: "workflow_link", playbookId: "pb-post-meeting", name: "Post-Meeting Execution", description: "Pull transcript, draft follow-up, require human approval before sending." },
      ],
    },
    executionChips: ["Jump to liquidity section", "Star IC timeline slide"],
    draftChips: ["Prep liquidity Q&A", "Draft IC timeline email", "Create action"],
    suggestedPrompts: [],
  },

  // c3: Blackstone FoF catch-up
  c3: {
    initialMessage: {
      text: "Blackstone FoF catch-up tomorrow 10am — Tom is re-scoping sleeve sizing. Brief covers H2 priorities and pacing.",
      blocks: [
        {
          kind: "brief",
          summary: "Relationship catch-up ahead of allocator season; Tom is re-scoping FoF sleeve sizing.",
          agenda: ["Priorities for H2", "Allocation pacing", "What they need before IC"],
          commitments: ["Circulate performance pack", "Propose two follow-up slots"],
        },
        { kind: "workflow_link", playbookId: "pb-post-meeting", name: "Post-Meeting Execution", description: "Pull transcript, draft follow-up, require human approval before sending." },
      ],
    },
    suggestedPrompts: ["Open full brief", "Draft opener email", "Summarize last thread", "Create action"],
  },

  // c4: BNF intro — no brief
  c4: {
    initialMessage: {
      text: "BNF Capital intro with Nic Fallows — prep pack isn’t available yet (light CRM context). I can still help you outline a tight intro arc.",
      blocks: [
        { kind: "snapshot", text: "First touch: keep it credential-led, one proof point, and a clear ask for next step. Offer two times only." },
        { kind: "workflow_link", playbookId: "pb-intro-tracker", name: "Warm Intro Tracker", description: "Detect CC'd intros, draft reply within 24h, escalate if LP is silent." },
      ],
    },
    suggestedPrompts: ["Draft 5-line intro", "Suggest two meeting slots", "What to ask Nic", "Explain intro playbook"],
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
