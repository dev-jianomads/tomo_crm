"use client";

export function RelationshipDrawerSnapshotSection({ summaryText }: { summaryText: string }) {
  return (
    <section aria-labelledby="rel-snapshot-heading">
      <h2 id="rel-snapshot-heading" className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
        Snapshot
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-800">{summaryText}</p>
      <p className="mt-2 text-[11px] text-gray-500">Synthesized from the five most recent interactions.</p>
    </section>
  );
}
