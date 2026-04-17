import type { ActivityLogEntry } from "@/components/drawer-section-3-activity-log";

/** Stable hash 0..n-1 from string (for mock copy variation) */
function hashToIndex(id: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % modulo;
}

const OPENING = [
  "allocator outreach",
  "diligence pacing",
  "portfolio questions",
  "fee and terms",
  "capacity and timing",
];

/**
 * Mock “recent five interactions” for the relationship drawer — used for the activity log
 * and to synthesize a one-paragraph snapshot (demo; not a live LLM call).
 */
export function getMockRelationshipActivityEntries(relationshipId: string, name: string, firm: string): ActivityLogEntry[] {
  const spin = hashToIndex(relationshipId, OPENING.length);
  const topic = OPENING[spin];

  return [
    {
      id: "a1",
      ts: "Yesterday 3:45 PM",
      actor: "TOMO",
      summary: `Drafted intro note on ${topic} for ${name}; pending your send.`,
    },
    {
      id: "a2",
      ts: "Yesterday 3:20 PM",
      actor: "User",
      summary: `Call — reviewed allocation timeline with ${firm} and aligned next steps.`,
    },
    {
      id: "a3",
      ts: "Tue 11:00 AM",
      actor: "User",
      summary: "Meeting — walked through Q4 performance; requested follow-up materials.",
    },
    {
      id: "a4",
      ts: "Tue 8:15 AM",
      actor: "TOMO",
      summary: "Flagged cooling signal after 21d with no meaningful touch.",
    },
    {
      id: "a5",
      ts: "Mon 9:05 AM",
      actor: "User",
      summary: "Email — sent performance snapshot and proposed two slots to reconnect.",
    },
  ];
}

/**
 * Mock LLM-style paragraph summarizing the five interactions (deterministic from entries).
 */
export function buildMockRelationshipSnapshotParagraph(
  name: string,
  firm: string,
  entries: ActivityLogEntry[]
): string {
  if (entries.length === 0) {
    return `No recent interaction history is available for ${name} at ${firm}.`;
  }
  const [latest, , mid, , earliest] = entries;
  const strip = (s: string) => s.replace(/^[^:]+:\s*/, "").trim();
  const latestS = latest ? strip(latest.summary) : "";
  const midS = mid ? strip(mid.summary) : "";
  const earliestS = earliest ? strip(earliest.summary) : "";

  return [
    `Across the five most recent touches, ${name} at ${firm} shows a mix of GP-led meetings and email, with Tomo supporting drafts and signal checks.`,
    earliestS ? `Activity opened with ${earliestS.charAt(0).toLowerCase()}${earliestS.slice(1)}` : "",
    midS ? `Mid-sequence, ${midS.charAt(0).toLowerCase()}${midS.slice(1)}` : "",
    latestS ? `Most recently, ${latestS.charAt(0).toLowerCase()}${latestS.slice(1)}` : "",
    "Net: engagement is ongoing with a few explicit follow-ups still pending on allocator response and materials.",
  ]
    .filter(Boolean)
    .join(" ");
}
