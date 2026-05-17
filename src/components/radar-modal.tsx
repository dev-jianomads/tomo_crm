"use client";

/**
 * Unified Daily Brief + On my radar modal (SRS Appendix I).
 * Visual alignment: design/tomo_radar_modal_v1.html
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { DailyBriefLink } from "@/lib/dailyBriefFromToday";
import type {
  RadarItem,
  RadarItemTagTone,
  RadarModalPayload,
  RadarModalSection,
  RadarNavigateLink,
} from "@/lib/radarModalTypes";

function isDailyBriefNavLink(link: RadarNavigateLink): link is DailyBriefLink {
  return link.kind === "action" || link.kind === "commitment" || link.kind === "brief";
}

function tagToneClass(tone: RadarItemTagTone): string {
  const map: Record<string, string> = {
    teal: "bg-[color:var(--tomo-teal-tint)] text-[color:var(--tomo-teal)]",
    amber: "bg-[color:color-mix(in_srgb,var(--tomo-status-amber)_12%,transparent)] text-[color:var(--tomo-status-amber-text)]",
    red: "bg-[color:color-mix(in_srgb,var(--tomo-red)_10%,transparent)] text-[color:var(--tomo-red)]",
    neutral: "bg-[color:var(--tomo-navy-soft)] text-[color:var(--foreground)]",
    warm: "bg-[color:var(--tomo-teal-tint)] text-[color:var(--tomo-teal)]",
    cool: "bg-[color:color-mix(in_srgb,var(--tomo-status-amber)_14%,transparent)] text-[color:var(--tomo-status-amber-text)]",
  };
  return map[String(tone)] ?? map.neutral!;
}

export function RadarModal({
  open,
  payload,
  onClose,
  onNavigateLink,
}: {
  open: boolean;
  payload: RadarModalPayload;
  onClose: () => void;
  onNavigateLink: (link: RadarNavigateLink) => void;
}) {
  const initiallyCollapsed = useMemo(() => {
    const s = new Set<string>();
    for (const sec of payload.sections) {
      if (sec.defaultCollapsed) s.add(sec.id);
    }
    return s;
  }, [payload.sections]);

  const stampKey = useMemo(() => payload.stampLines.join("|"), [payload.stampLines]);

  const [collapsedIds, setCollapsedIds] = useState(() => initiallyCollapsed);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset accordion when derived defaults / stamp change
    setCollapsedIds(initiallyCollapsed);
  }, [initiallyCollapsed, stampKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const toggleSection = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (!open) return null;

  const badge = payload.badgeCount;

  return (
    <div
      className="tomo-modal-scrim fixed inset-0 z-[110] flex items-end justify-center bg-[color:color-mix(in_srgb,var(--tomo-navy)_30%,transparent)] p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="presentation"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="radar-modal-title"
        className="relative z-10 flex max-h-[min(86vh,920px)] w-full max-w-[min(840px,92vw)] flex-col overflow-hidden rounded-t-2xl border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-modal-shadow)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-[color:var(--tomo-rule-soft)] px-4 py-5 sm:px-8 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 gap-4">
              <RadarGlyph className="mt-1 shrink-0" />
              <div className="min-w-0">
                <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--tomo-mute)]">
                  {payload.eyebrowLabel}
                </p>
                <div className="flex flex-wrap items-baseline gap-2 gap-y-1">
                  <h2
                    id="radar-modal-title"
                    className="text-[clamp(1.25rem,2.5vw,1.5rem)] font-medium leading-tight tracking-[-0.005em] text-[color:var(--foreground)] [font-family:var(--font-newsreader-display)]"
                  >
                    {payload.title}
                  </h2>
                  {badge > 0 ? (
                    <span className="font-mono text-[13px] font-normal tabular-nums text-[color:var(--tomo-mute)]">
                      {badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 max-w-[680px] text-[15px] leading-relaxed text-[color:var(--tomo-body)] [font-family:var(--font-newsreader-display)]">
                  {payload.narrativeSummaryPlain}
                </p>
                <div className="mt-3 space-y-0.5">
                  {payload.stampLines.map((line) => (
                    <p
                      key={line}
                      className="font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-[color:var(--tomo-mute)]"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] px-2.5 py-1 font-mono text-[11px] text-[color:var(--tomo-mute)] transition hover:border-[color:var(--foreground)] hover:text-[color:var(--foreground)]"
            >
              Esc
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-0 py-2 sm:py-3">
          {payload.sections.map((sec) => (
            <RadarModalSectionBlock
              key={sec.id}
              section={sec}
              collapsed={collapsedIds.has(sec.id)}
              onToggle={() => toggleSection(sec.id)}
              onNavigateLink={onNavigateLink}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="max-w-xl font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--tomo-mute)]">
            {payload.footerDeliveryPlain}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/settings/notifications"
              className="text-sm font-medium text-[color:var(--tomo-mute)] transition hover:text-[color:var(--foreground)]"
              onClick={onClose}
            >
              Brief settings
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] px-3.5 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RadarGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={44}
      height={44}
      viewBox="0 0 44 44"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle
        cx="22"
        cy="22"
        r="20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        className="text-[color:var(--tomo-teal)] opacity-20"
      />
      <circle
        cx="22"
        cy="22"
        r="14"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        className="text-[color:var(--tomo-teal)] opacity-45"
      />
      <circle
        cx="22"
        cy="22"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        className="text-[color:var(--tomo-teal)] opacity-75"
      />
      <line x1="22" y1="22" x2="22" y2="2" stroke="currentColor" strokeWidth={1} className="text-[color:var(--tomo-teal)] opacity-60" />
      <line
        x1="22"
        y1="22"
        x2="38"
        y2="14"
        stroke="currentColor"
        strokeWidth={1}
        opacity={0.35}
        className="text-[color:var(--tomo-teal)]"
      />
      <circle cx="32" cy="14" r="1.6" fill="currentColor" className="text-[color:var(--tomo-teal)]" opacity={0.85} />
      <circle cx="14" cy="29" r="1.2" fill="currentColor" className="text-[color:var(--tomo-teal)]" opacity={0.6} />
      <circle cx="27" cy="33" r="1" fill="currentColor" className="text-[color:var(--tomo-teal)]" opacity={0.5} />
    </svg>
  );
}

function RadarModalSectionBlock({
  section,
  collapsed,
  onToggle,
  onNavigateLink,
}: {
  section: RadarModalSection;
  collapsed: boolean;
  onToggle: () => void;
  onNavigateLink: (link: RadarNavigateLink) => void;
}) {
  const flatCount = section.items.length;
  const subRowCount =
    section.subsections?.reduce((acc, sub) => acc + sub.items.length, 0) ?? 0;
  const totalRows = flatCount + subRowCount;
  const showBody = totalRows > 0 && !collapsed;
  const empty = totalRows === 0;

  return (
    <section className="border-b border-[color:var(--tomo-rule-soft)] px-4 py-4 last:border-b-0 sm:px-8">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={!collapsed}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2 gap-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[color:var(--foreground)]">{section.title}</span>
            <span className="font-mono text-[11px] text-[color:var(--tomo-mute)]">{section.countSummary}</span>
            {section.direction === "positive" ? (
              <span className="rounded-[2px] bg-[color:var(--tomo-teal-tint)] px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-teal)]">
                Positive direction
              </span>
            ) : null}
            {section.direction === "negative" ? (
              <span className="rounded-[2px] bg-[color:color-mix(in_srgb,var(--tomo-status-amber)_12%,transparent)] px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-status-amber-text)]">
                Negative direction
              </span>
            ) : null}
          </div>
        </div>
        <ChevronDownIcon
          className={`h-3.5 w-3.5 shrink-0 text-[color:var(--tomo-mute)] transition ${collapsed ? "-rotate-90" : ""}`}
          aria-hidden
        />
      </button>

      {empty && section.emptyMessage ? (
        <p className="mt-2 text-sm italic text-[color:var(--tomo-body)]">{section.emptyMessage}</p>
      ) : null}

      {showBody && flatCount > 0 ? (
        <div className="mt-3 flex flex-col gap-0">
          {section.items.map((item) => (
            <RadarItemRow key={item.id} item={item} onNavigateLink={onNavigateLink} />
          ))}
        </div>
      ) : null}

      {showBody && section.subsections?.length ? (
        <div className="mt-3 flex flex-col gap-5">
          {section.subsections.map((sub) => (
            <div key={sub.id}>
              <div className="mb-2 flex flex-wrap items-baseline gap-2 border-b border-[color:var(--tomo-rule-soft)] pb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--tomo-body)]">
                  {sub.title}
                </span>
                <span className="font-mono text-[10px] text-[color:var(--tomo-mute)]">{sub.countSummary}</span>
              </div>
              {sub.items.length === 0 && sub.emptyMessage ? (
                <p className="mt-1 text-sm italic text-[color:var(--tomo-body)]">{sub.emptyMessage}</p>
              ) : null}
              {sub.items.length > 0 ? (
                <div className="mt-1 flex flex-col gap-0">
                  {sub.items.map((item) => (
                    <RadarItemRow key={item.id} item={item} onNavigateLink={onNavigateLink} />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RadarItemRow({
  item,
  onNavigateLink,
}: {
  item: RadarItem;
  onNavigateLink: (link: RadarNavigateLink) => void;
}) {
  const tierRail = item.tier === 1;

  const rowInteractive = Boolean(item.link);

  return (
    <div
      className={`grid grid-cols-[4px_1fr_auto] gap-x-0 border-t border-dashed border-[color:var(--tomo-rule)] py-3 first:border-t-0 first:pt-1 [&:first-child]:border-t-0`}
    >
      <div className={`mr-3 min-h-[2rem] w-1 self-stretch rounded-[1px] ${tierRail ? "bg-[color:var(--tomo-teal)]" : "bg-transparent"}`} />
      <div className="min-w-0 pr-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-[color:var(--foreground)]">
            {item.lpLabel}
            {item.personLabel ? (
              <>
                {" "}
                · <span className="font-normal text-[color:var(--tomo-body)]">{item.personLabel}</span>
              </>
            ) : null}
          </span>
          {item.tags.map((tag, i) =>
            tag.kind === "tier" ? (
              <span
                key={`tier-${i}`}
                className={`rounded-[2px] px-1 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] ${
                  tag.tier === 1
                    ? "bg-[color:var(--tomo-teal-tint)] text-[color:var(--tomo-teal)]"
                    : "bg-[color:var(--tomo-navy-soft)] text-[color:var(--foreground)]"
                }`}
              >
                Tier {tag.tier}
              </span>
            ) : (
              <span
                key={`c-${i}`}
                className={`rounded-[2px] px-1 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] ${tagToneClass(tag.tone)}`}
              >
                {tag.label}
              </span>
            ),
          )}
        </div>
        {rowInteractive && item.link ? (
          <button
            type="button"
            onClick={() => onNavigateLink(item.link!)}
            className="w-full text-left text-[13px] leading-relaxed text-[color:var(--tomo-body)] underline-offset-2 hover:text-[color:var(--foreground)] hover:underline"
          >
            {item.evidencePlain}
          </button>
        ) : (
          <p className="text-[13px] leading-relaxed text-[color:var(--tomo-body)]">{item.evidencePlain}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
        {item.asideLines?.length ? (
          <span className="block text-right font-mono text-[10px] leading-snug tracking-[0.06em] text-[color:var(--tomo-mute)] whitespace-pre-line">
            {item.asideLines.join("\n")}
          </span>
        ) : null}
        {item.ctas?.map((cta) =>
          cta.link ? (
            <button
              key={cta.label}
              type="button"
              onClick={() => {
                if (cta.link) onNavigateLink(cta.link);
              }}
              className={`whitespace-nowrap rounded-[var(--tomo-radius-md)] border px-2.5 py-1 text-[11px] font-medium transition ${
                cta.variant === "subtle"
                  ? "border-[color:var(--tomo-rule)] text-[color:var(--tomo-mute)] hover:border-[color:var(--foreground)] hover:text-[color:var(--foreground)]"
                  : "border-[color:var(--tomo-teal)] text-[color:var(--tomo-teal)] hover:bg-[color:var(--tomo-teal-tint)]"
              }`}
            >
              {cta.label}
            </button>
          ) : (
            <span key={cta.label} className="text-[11px] text-[color:var(--tomo-mute)]">
              {cta.label}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

export function radarLinkToTomoSelection(
  link: RadarNavigateLink,
): { type: "action"; id: string } | { type: "commitment"; id: string } | { type: "brief"; id: string } | null {
  if (isDailyBriefNavLink(link)) {
    if (link.kind === "action") return { type: "action", id: link.id };
    if (link.kind === "commitment") return { type: "commitment", id: link.id };
    return { type: "brief", id: link.id };
  }
  return null;
}