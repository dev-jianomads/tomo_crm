/**
 * Settings area sidebar — all routes stay under /settings (main app rail unchanged).
 */
export type SettingsNavEntry = {
  href: string;
  label: string;
  /** Render a subtle section divider label above this item */
  groupStart?: string;
};

export const SETTINGS_NAV: SettingsNavEntry[] = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/funds", label: "Funds" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/messaging", label: "Messaging" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/billing", label: "Billing & Plan", groupStart: "Subscription & team" },
  { href: "/settings/billing/manage", label: "Manage subscription" },
  { href: "/settings/team", label: "Team & seats" },
  { href: "/settings/team/roles", label: "Roles & permissions" },
];

export function settingsContextTitle(pathname: string | null): string {
  const item = SETTINGS_NAV.find((e) => pathname === e.href);
  if (item) return `${item.label} · Settings`;
  return "Settings";
}
