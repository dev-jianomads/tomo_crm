export type PlanType = "individual" | "team";

export type Contact = {
  id: string;
  name: string;
  role: string;
  organization: string;
  lastInteraction: string;
  relationshipHealth: "hot" | "warm" | "cool";
  tags: string[];
  notes: string;
  followUps: { id: string; title: string; due: string; status: "open" | "done" }[];
  timeline: { id: string; date: string; type: string; summary: string }[];
};

export type MeetingBrief = {
  id: string;
  title: string;
  datetime: string;
  participants: string[];
  summary: string;
  commitments: string[];
};

export type TaskItem = {
  id: string;
  title: string;
  due: string;
  bucket: "Overdue" | "Today" | "This week";
  linkedTo?: string;
  notes?: string;
};

export type TomoMessage = {
  id: string;
  from: "user" | "tomo";
  text: string;
  timestamp: number;
};

export type OnboardingState = {
  calendarConnected: boolean;
  contactsConnected: boolean;
  emailConnected: boolean;
  slackConnected: boolean;
  telegramConnected: boolean;
  telegramPhone?: string;
  affinityConnected: boolean;
  affinityListId?: string;
  affinityTokenLast4?: string;
  googleSheetsConnected: boolean;
  googleSheetsFilename?: string;
  googleSheetsAuthed?: boolean;
  notifications: Record<string, { email?: boolean; slack?: boolean; telegram?: boolean; inApp?: boolean }>;
  completed: boolean;
};

export type SessionState = {
  email: string;
  plan: PlanType;
  onboardingComplete: boolean;
};



