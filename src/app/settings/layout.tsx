"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { PageListHeader } from "@/components/page-list-header";
import { clearSession, useRequireSession } from "@/lib/auth";
import { useContactSuggestionSurfacing } from "@/hooks/use-contact-suggestion-surfacing";
import { SETTINGS_NAV, settingsContextTitle } from "@/lib/settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { ready } = useRequireSession();
  const router = useRouter();
  const pathname = usePathname();
  const { settingsQueueCount } = useContactSuggestionSurfacing();

  const assistantChips = useMemo(() => {
    const base = ["Summarize this", "Draft a follow-up", "What changed recently?"];
    if (pathname?.startsWith("/settings/billing")) {
      return [...base, "What is included in Team?", "How does the trial work?"];
    }
    if (pathname?.startsWith("/settings/team")) {
      return [...base, "Who can invite users?", "Admin vs member capabilities?"];
    }
    return [...base, "Where do I connect integrations?"];
  }, [pathname]);

  const listContent = (
    <div className="flex h-full flex-col">
      <PageListHeader
        label="Settings"
        description="Profile, funds, integrations, messaging, notifications, subscription, and team."
      >
        <button
          type="button"
          onClick={() => {
            clearSession();
            router.replace("/auth");
          }}
          className="inline-flex items-center gap-2 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] px-3 py-2 text-xs font-medium text-[color:var(--foreground)] shadow-[var(--tomo-shadow-1)] transition hover:bg-[color:var(--tomo-navy-soft)]"
        >
          <span className="h-2 w-2 rounded-full bg-[color:var(--tomo-red)]" />
          Sign out
        </button>
      </PageListHeader>
      <nav className="flex-1 space-y-2 overflow-auto px-4 py-3" aria-label="Settings sections">
        {SETTINGS_NAV.map((entry, i) => {
          const showGroup = Boolean(entry.groupStart && (i === 0 || SETTINGS_NAV[i - 1].groupStart !== entry.groupStart));
          const active = pathname === entry.href;

          return (
            <div key={entry.href}>
              {showGroup ? (
                <p className="mb-2 mt-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--tomo-mute)]">{entry.groupStart}</p>
              ) : null}
              <Link
                href={entry.href}
                className={`flex w-full items-center justify-between gap-2 rounded-[var(--tomo-radius-md)] border px-3 py-2 text-left text-sm shadow-[var(--tomo-shadow-1)] transition ${
                  active
                    ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] ring-1 ring-[color:color-mix(in_srgb,var(--accent)_30%,transparent)]"
                    : "border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] hover:border-[color:color-mix(in_srgb,var(--tomo-teal)_22%,var(--tomo-rule))] hover:bg-[color:var(--tomo-navy-soft)]"
                }`}
              >
                <span>{entry.label}</span>
                {entry.href === "/settings/suggested-contacts" && settingsQueueCount > 0 ? (
                  <span
                    className="rounded-full bg-[color:var(--tomo-teal)] px-2 py-0.5 text-[10px] font-semibold text-white"
                    data-testid="suggested-contacts-nav-badge"
                  >
                    {settingsQueueCount}
                  </span>
                ) : null}
              </Link>
            </div>
          );
        })}
      </nav>
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="settings"
      listContent={listContent}
      detailContent={<div className="h-full overflow-auto p-4">{children}</div>}
      contextTitle={settingsContextTitle(pathname)}
      assistantChips={assistantChips}
    />
  );
}
