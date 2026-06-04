"use client";

import { useMemo, useState } from "react";
import type { Relationship } from "@/lib/mockData";
import { matchSenderAgainstRelationships } from "@/lib/contact-resolution-match";
import { normalizeEmail } from "@/lib/relationship-email";

type LinkExistingContactModalProps = {
  open: boolean;
  onClose: () => void;
  senderEmail: string;
  senderName?: string;
  firmHint?: string;
  relationships: Relationship[];
  onLink: (relationship: Relationship) => void;
};

export function LinkExistingContactModal({
  open,
  onClose,
  senderEmail,
  senderName,
  firmHint,
  relationships,
  onLink,
}: LinkExistingContactModalProps) {
  const [query, setQuery] = useState("");

  const match = useMemo(
    () =>
      matchSenderAgainstRelationships(senderEmail, relationships, {
        senderName,
        firmHint,
      }),
    [senderEmail, senderName, firmHint, relationships]
  );

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    const domain = senderEmail.includes("@") ? senderEmail.split("@")[1] : "";
    let list = relationships;
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.firm.toLowerCase().includes(q) ||
          (r.primaryEmail && normalizeEmail(r.primaryEmail).includes(q))
      );
    } else if (domain) {
      const domainHits = relationships.filter(
        (r) => r.primaryEmail && normalizeEmail(r.primaryEmail).endsWith(`@${domain}`)
      );
      if (domainHits.length) list = domainHits;
    }
    return list.slice(0, 12);
  }, [query, relationships, senderEmail]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div
        className="flex max-h-[min(80vh,520px)] w-full max-w-md flex-col rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-shadow-2)]"
        role="dialog"
        aria-labelledby="link-existing-title"
      >
        <div className="border-b border-[color:var(--tomo-rule-soft)] px-4 py-3">
          <h2 id="link-existing-title" className="text-base font-semibold text-[color:var(--foreground)]">
            Link to existing contact
          </h2>
          <p className="mt-1 text-xs text-[color:var(--tomo-mute)]">
            Attach inbound mail from {senderEmail} to someone already in the book.
          </p>
          {match.suggestedContact ? (
            <p className="mt-2 text-xs text-[color:var(--tomo-body)]">
              Suggested match: {match.suggestedContact.name} · {match.suggestedContact.firm}
            </p>
          ) : null}
        </div>
        <div className="border-b border-[color:var(--tomo-rule-soft)] px-4 py-2">
          <input
            className="tomo-input w-full text-sm"
            placeholder="Search name, firm, or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {candidates.length === 0 ? (
            <li className="px-2 py-6 text-center text-sm text-[color:var(--tomo-mute)]">No matches</li>
          ) : (
            candidates.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-[color:var(--tomo-navy-soft)]"
                  onClick={() => {
                    onLink(r);
                    onClose();
                  }}
                >
                  <span className="font-medium text-[color:var(--foreground)]">{r.name}</span>
                  <span className="text-[color:var(--tomo-body)]"> · {r.firm}</span>
                  {r.primaryEmail ? (
                    <span className="mt-0.5 block text-xs text-[color:var(--tomo-mute)]">{r.primaryEmail}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="flex justify-end border-t border-[color:var(--tomo-rule-soft)] px-4 py-3">
          <button
            type="button"
            className="rounded-md border border-[color:var(--tomo-rule)] px-3 py-1.5 text-xs font-medium"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
