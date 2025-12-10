import { Contact, MeetingBrief, TaskItem, TomoMessage } from "./types";

export const contacts: Contact[] = [
  {
    id: "c1",
    name: "Alex Morgan",
    role: "Founder, Northwind Labs",
    organization: "Northwind Labs",
    lastInteraction: "12 days ago",
    relationshipHealth: "warm",
    tags: ["AI", "Seed", "NYC"],
    notes: "Discussed AI agent roadmap and hiring plans.",
    followUps: [
      { id: "f1", title: "Send investor updates template", due: "Tomorrow", status: "open" },
      { id: "f2", title: "Intro to design partner", due: "Next week", status: "open" },
    ],
    timeline: [
      { id: "t1", date: "Jan 4", type: "Call", summary: "Reviewed Q1 milestones and burn." },
      { id: "t2", date: "Dec 15", type: "Email", summary: "Shared product demo deck." },
    ],
  },
  {
    id: "c2",
    name: "Jamie Chen",
    role: "COO, Peakline Ventures",
    organization: "Peakline Ventures",
    lastInteraction: "5 days ago",
    relationshipHealth: "hot",
    tags: ["VC", "Follow-up"],
    notes: "Interested in co-leading the round; wants metrics before IC.",
    followUps: [{ id: "f3", title: "Share updated retention metrics", due: "Today", status: "open" }],
    timeline: [
      { id: "t3", date: "Jan 8", type: "Meeting", summary: "Discussed partnership model and GTM." },
      { id: "t4", date: "Dec 20", type: "Note", summary: "Prefers concise briefs in the morning." },
    ],
  },
  {
    id: "c3",
    name: "Priya Desai",
    role: "Head of Product, Lumen",
    organization: "Lumen",
    lastInteraction: "21 days ago",
    relationshipHealth: "cool",
    tags: ["Product", "Enterprise"],
    notes: "Considering pilot expansion; wants to see adoption numbers.",
    followUps: [{ id: "f4", title: "Send adoption dashboard", due: "Friday", status: "open" }],
    timeline: [{ id: "t5", date: "Dec 2", type: "Email", summary: "Requested pilot expansion terms." }],
  },
];

export const meetingBriefs: MeetingBrief[] = [
  {
    id: "m1",
    title: "Weekly GTM Sync",
    datetime: "Today, 3:00 PM",
    participants: ["Alex Morgan", "Jamie Chen", "You"],
    summary: "Review Q1 pipeline, unblock enterprise pilot, align on follow-ups.",
    commitments: ["Send updated pipeline by EOD", "Schedule design partner call", "Draft follow-up email"],
  },
  {
    id: "m2",
    title: "Product Review with Lumen",
    datetime: "Tomorrow, 11:30 AM",
    participants: ["Priya Desai", "You"],
    summary: "Discuss adoption numbers and expansion opportunities.",
    commitments: ["Share adoption dashboard", "Confirm legal terms for expansion"],
  },
];

export const tasks: TaskItem[] = [
  { id: "t1", title: "Follow up with Alex on hiring plan", due: "Today", bucket: "Today", linkedTo: "Alex Morgan" },
  { id: "t2", title: "Share updated retention metrics with Jamie", due: "Overdue", bucket: "Overdue", linkedTo: "Jamie Chen" },
  { id: "t3", title: "Confirm pilot expansion scope with Priya", due: "This week", bucket: "This week", linkedTo: "Priya Desai" },
  { id: "t4", title: "Draft recap for GTM sync", due: "This week", bucket: "This week" },
];

export const initialMessages: TomoMessage[] = [
  {
    id: "m-1",
    from: "tomo",
    text: "Hi, I'm TOMO. I stay pinned here to help with briefs, follow-ups, and anything in your workspace.",
    timestamp: Date.now() - 1000 * 60 * 5,
  },
  {
    id: "m-2",
    from: "tomo",
    text: "Select a contact, meeting, or task to see context-aware suggestions.",
    timestamp: Date.now() - 1000 * 60 * 4,
  },
];

