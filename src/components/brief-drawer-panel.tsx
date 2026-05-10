"use client";

import type { Brief, DrawerSpecHeader, DrawerSpecHeaderLink, DrawerSpecHeaderPill } from "@/lib/mockData";
import { DrawerCommitmentsCaptured, DrawerSpecV3Head, DrawerWhySurfaced } from "@/components/drawer-shared-blocks";
import { TomoAiBadge } from "@/components/tomo-ai-badge";

function fallbackBriefDrawerSpec(brief: Brief): DrawerSpecHeader {
  const pills: DrawerSpecHeaderPill[] = [
    brief.status === "Ready"
      ? { tone: "teal", label: "Brief ready" }
      : { tone: "navy", label: "Brief updated" },
  ];
  if (brief.openLoops > 0) {
    pills.push({ tone: "amber", label: `${brief.openLoops} open loop${brief.openLoops === 1 ? "" : "s"}` });
  }
  const links: DrawerSpecHeaderLink[] = [
    { href: "/relationships", label: "Open LP record", icon: "clock" },
    { href: "https://calendar.google.com/calendar/u/0/r/week", label: "Open calendar", icon: "calendar" },
  ];
  return { statusPills: pills, links };
}

type BriefDrawerPanelProps = {
  brief: Brief;
  onClose: () => void;
  onCreateAction: () => void;
};

/**
 * Daily Brief / radar — same v3 drawer chrome as Today actions & Coming up commitments.
 */
export function BriefDrawerPanel({ brief, onClose, onCreateAction }: BriefDrawerPanelProps) {
  const spec = brief.drawerSpecHeader ?? fallbackBriefDrawerSpec(brief);
  const eyebrow =
    brief.status === "Ready" ? "Meeting brief · Ready for review" : "Meeting brief · Updated";
  const subtitle =
    spec.subtitle ?? `${brief.lp} · ${brief.datetime}${brief.openLoops ? ` · ${brief.openLoops} open loops` : ""}`;

  const commitmentLines = brief.commitments.map((label) => ({ label }));

  return (
    <div className="space-y-5">
      <DrawerSpecV3Head
        eyebrow={eyebrow}
        title={brief.meetingTitle}
        subtitle={subtitle}
        spec={spec}
        onClose={onClose}
      />

      {brief.drawerWhySurfaced ? (
        <DrawerWhySurfaced
          label={brief.drawerWhySurfaced.label}
          body={brief.drawerWhySurfaced.body}
          stamp={brief.drawerWhySurfaced.stamp}
        />
      ) : null}

      <div className="tomo-card tomo-hint-banner space-y-3 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="tomo-field-label text-[11px] tracking-wide">Tomo summary</p>
          <TomoAiBadge label="Brief" />
        </div>
        <p className="text-sm leading-relaxed text-[color:var(--foreground)]">{brief.summary}</p>

        {brief.agenda.length > 0 ? (
          <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">Agenda</p>
            <ul className="mt-2 space-y-1.5 text-sm text-[color:var(--foreground)]">
              {brief.agenda.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--tomo-teal)]" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {commitmentLines.length > 0 ? <DrawerCommitmentsCaptured items={commitmentLines} /> : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="button-primary tomo-ai-bg min-w-[7rem]" onClick={onCreateAction}>
          Create follow-up action
        </button>
        <button type="button" className="button-secondary" onClick={onCreateAction}>
          Draft email
        </button>
      </div>
    </div>
  );
}
