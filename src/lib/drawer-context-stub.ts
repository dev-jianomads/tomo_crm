/**
 * Stub boundary for future drawer context (calendar free/busy, mail thread bodies, signal jobs).
 * Today: copy and “computed” stamps are authored on `ActionItem` / `Commitment` in mockData.
 */

export function drawerContextStubSource(_kind: "calendar" | "inbound" | "signals"): string {
  return "mockData";
}
