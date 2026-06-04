"use client";

import Link from "next/link";
import { useContactSuggestionSurfacing } from "@/hooks/use-contact-suggestion-surfacing";
import { ContactSuggestionFlow } from "@/components/contact-suggestion-flow";

export default function SettingsSuggestedContactsPage() {
  const { ready, settingsQueue, todayInterrupts } = useContactSuggestionSurfacing();

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-[color:var(--foreground)]">Suggested contacts</h1>
        <p className="mt-1 text-sm text-[color:var(--tomo-body)]">
          Review possible investor relationships from unknown inbound senders.{" "}
          <strong className="font-medium text-[color:var(--foreground)]">Maybe</strong> suggestions and{" "}
          <strong className="font-medium text-[color:var(--foreground)]">likely</strong> overflow (beyond
          Today&apos;s daily cap) appear here — not duplicated on Today.
        </p>
      </div>

      {todayInterrupts.length > 0 ? (
        <p className="rounded-md border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-surface)] px-3 py-2 text-xs text-[color:var(--tomo-body)]">
          {todayInterrupts.length} suggestion(s) are on{" "}
          <Link href="/home" className="font-medium text-[color:var(--tomo-teal-muted)] underline">
            Today → Other Tasks
          </Link>{" "}
          right now.
        </p>
      ) : null}

      {settingsQueue.length === 0 ? (
        <p className="rounded-[var(--tomo-radius-md)] border border-dashed border-[color:var(--tomo-rule)] px-4 py-8 text-center text-sm text-[color:var(--tomo-mute)]">
          No contacts waiting for review. Classify inbound mail from{" "}
          <Link href="/settings/integrations" className="underline">
            Integrations
          </Link>{" "}
          to queue suggestions.
        </p>
      ) : (
        <ul className="space-y-3" data-testid="suggested-contacts-queue">
          {settingsQueue.map((s) => (
            <li key={s.id}>
              <ContactSuggestionFlow suggestion={s} variant="settings" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
