/**
 * Demo-only outbound / duplicate-prevention signals (derived from audience size).
 */

export type SuppressionEntry = { at: string; lp: string; reason: string };

export function mockDedupedCount(raw: number): { unique: number; removed: number } {
  if (raw <= 0) return { unique: 0, removed: 0 };
  const removed = raw >= 8 ? 3 : raw >= 4 ? 2 : raw >= 2 ? 1 : 0;
  return { unique: Math.max(1, raw - removed), removed };
}

export function mockSuppressionRows(count: number): SuppressionEntry[] {
  const base: SuppressionEntry[] = [
    { at: "Today 06:12", lp: "Oakmont FoF", reason: "Duplicate thread — prior send in last 24h" },
    { at: "Today 06:40", lp: "Meridian Capital", reason: "LP unsubscribe signal (marketing)" },
    { at: "Yesterday 18:05", lp: "Redstone Partners", reason: "Quiet hours — rescheduled to 08:00 ET" },
    {
      at: "Yesterday 14:20",
      lp: "Crestview LP",
      reason: "Suppressed — recent workflow touch (within 14d)",
    },
  ];
  return count >= 6 ? base : count >= 2 ? base.slice(0, 2) : base.slice(0, 1);
}

/** LPs that would be suppressed due to overlap with another active workflow (demo scale). */
export function mockOverlapLpCount(relationshipCount: number): number {
  if (relationshipCount < 2) return 0;
  if (relationshipCount >= 30) return 6;
  if (relationshipCount >= 6) return 3;
  if (relationshipCount >= 4) return 2;
  return 1;
}

export function mockHasOverlapScenario(relationshipCount: number): boolean {
  return mockOverlapLpCount(relationshipCount) > 0;
}
