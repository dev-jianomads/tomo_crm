"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { PageListHeader } from "@/components/page-list-header";
import { clearSession, useRequireSession } from "@/lib/auth";
import { SETTINGS_NAV, settingsContextTitle } from "@/lib/settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { ready } = useRequireSession();
  const router = useRouter();
  const pathname = usePathname();

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
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:border-gray-300"
        >
          <span className="h-2 w-2 rounded-full bg-rose-500" />
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
                <p className="mb-2 mt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{entry.groupStart}</p>
              ) : null}
              <Link
                href={entry.href}
                className={`block w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                  active ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                {entry.label}
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
