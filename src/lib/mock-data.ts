/**
 * =============================================================================
 * TOMO CRM - Mock Data
 * =============================================================================
 * 
 * CURRENT STATE: Static mock data for development/demo
 * 
 * PRODUCTION WIRING:
 * 
 * 1. REPLACE WITH SUPABASE QUERIES:
 *    - Create a src/lib/supabase.ts client
 *    - Replace mock exports with async functions
 *    - Use React Query or SWR for data fetching and caching
 * 
 * 2. SUPABASE CLIENT SETUP:
 *    ```
 *    import { createClient } from '@supabase/supabase-js';
 *    
 *    export const supabase = createClient(
 *      process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
 *    );
 *    ```
 * 
 * 3. DATA FETCHING PATTERN:
 *    ```
 *    // src/lib/api/contacts.ts
 *    import { supabase } from '../supabase';
 *    import { Contact } from '../types';
 *    
 *    export async function getContacts(userId: string): Promise<Contact[]> {
 *      const { data, error } = await supabase
 *        .from('contacts')
 *        .select(`
 *          *,
 *          follow_ups:contact_follow_ups(*),
 *          timeline:contact_timeline(*)
 *        `)
 *        .eq('user_id', userId)
 *        .order('last_interaction', { ascending: false });
 *      
 *      if (error) throw error;
 *      return data;
 *    }
 *    ```
 * 
 * 4. REACT QUERY INTEGRATION:
 *    ```
 *    // In component
 *    import { useQuery } from '@tanstack/react-query';
 *    import { getContacts } from '@/lib/api/contacts';
 *    
 *    const { data: contacts, isLoading, error } = useQuery({
 *      queryKey: ['contacts', userId],
 *      queryFn: () => getContacts(userId),
 *    });
 *    ```
 * 
 * 5. ROW LEVEL SECURITY (RLS):
 *    All Supabase tables should have RLS policies that filter by user_id:
 *    ```sql
 *    CREATE POLICY "Users can only see their own contacts"
 *    ON contacts FOR SELECT
 *    USING (user_id = auth.uid());
 *    ```
 *    
 *    Note: With Firebase Auth, you'll need to pass the Firebase ID token
 *    to Supabase and verify it in a custom auth policy or via Edge Functions.
 * =============================================================================
 */

import { Contact, MeetingBrief, TaskItem, TomoMessage } from "./types";

type MomentumShiftDelta = {
  band: "Heating" | "Cooling" | "Stalled" | "Stable";
  delta: number;
};

/**
 * Mock contacts data
 * 
 * PRODUCTION: Fetch from Supabase `contacts` table
 * Sources: Manual entry, Google Contacts sync, Affinity sync
 * 
 * RELATIONSHIP HEALTH CALCULATION (could be AI-powered):
 * - "hot": Interaction within 7 days
 * - "warm": Interaction within 30 days
 * - "cool": No interaction for 30+ days
 * 
 * TOMO AI INTEGRATION:
 * - Suggest contacts that need attention
 * - Auto-update health based on email/calendar activity
 * - Generate relationship insights
 */
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

/**
 * Mock meeting briefs
 * 
 * PRODUCTION: 
 * - Fetch from Supabase `meeting_briefs` table
 * - Auto-generate from calendar events via Tomo AI
 * 
 * TOMO AI BRIEF GENERATION:
 * POST /api/tomo/generate-brief
 * Input: { calendarEvent, participants (with their contact history), previousMeetings }
 * Output: { summary, talkingPoints, commitments, risks }
 * 
 * BRIEF STORAGE:
 * - calendar_event_id links to Google/Microsoft event
 * - generated_at timestamp
 * - version number for regeneration tracking
 * - user_edits to preserve manual changes
 */
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

/**
 * Mock tasks
 * 
 * PRODUCTION:
 * - Fetch from Supabase `tasks` table
 * - Can be created manually or extracted by Tomo AI from:
 *   - Meeting notes
 *   - Email commitments
 *   - Calendar events
 * 
 * TASK SOURCES:
 * - 'manual': User created
 * - 'ai_extracted': Tomo AI detected commitment
 * - 'integration': From Affinity or other CRM
 * 
 * BUCKET CALCULATION:
 * Based on due date relative to current date:
 * - Overdue: due < today
 * - Today: due == today
 * - This week: due <= end of week
 */
export const tasks: TaskItem[] = [
  { id: "t1", title: "Follow up with Alex on hiring plan", due: "Today", bucket: "Today", linkedTo: "Alex Morgan" },
  { id: "t2", title: "Share updated retention metrics with Jamie", due: "Overdue", bucket: "Overdue", linkedTo: "Jamie Chen" },
  { id: "t3", title: "Confirm pilot expansion scope with Priya", due: "This week", bucket: "This week", linkedTo: "Priya Desai" },
  { id: "t4", title: "Draft recap for GTM sync", due: "This week", bucket: "This week" },
];

export const momentumShiftDeltas: MomentumShiftDelta[] = [
  { band: "Stalled", delta: 1 },
  { band: "Heating", delta: 3 },
  { band: "Cooling", delta: 2 },
  { band: "Stable", delta: 0 },
];

/**
 * Initial Tomo AI messages (shown on first load)
 * 
 * PRODUCTION:
 * - Can store conversation history in Supabase for continuity
 * - Or keep in-memory per session (privacy-first approach)
 * 
 * MESSAGE FLOW:
 * 1. User sends message → POST /api/tomo/chat
 * 2. Request includes: message, context (current page, selected entity)
 * 3. Tomo AI processes with context
 * 4. Response streamed back (SSE or WebSocket TBD)
 * 5. UI updates in real-time as tokens arrive
 * 
 * CONTEXT INJECTION:
 * ```
 * {
 *   message: "Draft a follow-up email",
 *   context: {
 *     page: "contacts",
 *     selectedContact: { id: "c1", name: "Alex Morgan", ... },
 *     recentInteractions: [...],
 *     userPreferences: { tone: "professional", length: "concise" }
 *   }
 * }
 * ```
 */
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

/**
 * =============================================================================
 * PRODUCTION: Data Fetching Functions (to replace mock exports)
 * =============================================================================
 * 
 * Create these in separate files under src/lib/api/:
 * 
 * src/lib/api/contacts.ts:
 * ```
 * export async function getContacts(userId: string) {...}
 * export async function getContact(userId: string, contactId: string) {...}
 * export async function createContact(userId: string, data: Partial<Contact>) {...}
 * export async function updateContact(userId: string, contactId: string, data: Partial<Contact>) {...}
 * export async function deleteContact(userId: string, contactId: string) {...}
 * ```
 * 
 * src/lib/api/briefs.ts:
 * ```
 * export async function getBriefs(userId: string) {...}
 * export async function getBrief(userId: string, briefId: string) {...}
 * export async function generateBrief(userId: string, calendarEventId: string) {...}
 * export async function updateBrief(userId: string, briefId: string, data: Partial<MeetingBrief>) {...}
 * ```
 * 
 * src/lib/api/tasks.ts:
 * ```
 * export async function getTasks(userId: string) {...}
 * export async function createTask(userId: string, data: Partial<TaskItem>) {...}
 * export async function completeTask(userId: string, taskId: string) {...}
 * export async function deleteTask(userId: string, taskId: string) {...}
 * ```
 */






