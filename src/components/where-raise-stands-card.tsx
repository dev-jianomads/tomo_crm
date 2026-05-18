import Link from "next/link";
import { HoverHint } from "@/components/ui/hover-hint";
import type { RaiseStandsBreakdown } from "@/lib/todayRaiseStands";

const WHERE_RAISE_STANDS_HEADING_HINT =
  "Active LPs in four buckets that don't overlap. Counts reflect your live pipeline; click a row to open Relationships with that filter.";

/** Bucket hints — aligned with Section 9 Metric 3 + Today tile partition (SRS §3.8 BR-3.8.5). */
const BUCKET_HINTS: Record<keyof RaiseStandsBreakdown, string> = {
  genuinelyMoveable:
    "In active meeting stages, not red-flagged, warming in the last 30 days, and within stage touch SLA — same rules as Insights moveability.",
  healthyOnTrack:
    "Green pipeline health and not moveable — on cadence; no urgent warming signal right now.",
  coolingWatch:
    "Amber pipeline health but not moveable — engagement is stalling; worth a nudge before it turns red.",
  driftingAct:
    "Red pipeline health among active LPs — treat as urgent re-engagement.",
};

const ROWS: {
  key: keyof RaiseStandsBreakdown;
  label: string;
  dotClass: string;
  countClass: string;
  href: string;
}[] = [
  {
    key: "genuinelyMoveable",
    label: "Moveable",
    dotClass: "bg-[color:var(--tomo-teal)]",
    countClass: "text-[color:var(--tomo-teal-muted)]",
    href: "/relationships?raiseStand=genuinely_moveable",
  },
  {
    key: "healthyOnTrack",
    label: "Healthy & on track",
    dotClass: "bg-emerald-500",
    countClass: "text-emerald-700 dark:text-emerald-400/90",
    href: "/relationships?raiseStand=healthy_on_track",
  },
  {
    key: "coolingWatch",
    label: "Stalling — watch",
    dotClass: "bg-amber-400",
    countClass: "text-amber-800 dark:text-amber-300/90",
    href: "/relationships?raiseStand=cooling_watch",
  },
  {
    key: "driftingAct",
    label: "Drifting — act",
    dotClass: "bg-red-500",
    countClass: "text-red-700 dark:text-red-400/90",
    href: "/relationships?raiseStand=drifting_act",
  },
];

type Props = {
  breakdown: RaiseStandsBreakdown;
  className?: string;
  /** Strip outer chrome when wrapped in a scroll / bordered shell (e.g. Today right column). */
  frameless?: boolean;
};

export function WhereRaiseStandsCard({ breakdown, className = "", frameless = false }: Props) {
  const shell = frameless
    ? "shrink-0 border-0 bg-transparent p-0 shadow-none rounded-none"
    : "shrink-0 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-4 py-3 shadow-[var(--tomo-shadow-1)]";
  return (
    <section
      className={`${shell} ${className}`}
      aria-labelledby="where-raise-stands-heading"
    >
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <HoverHint hint={WHERE_RAISE_STANDS_HEADING_HINT} wide className="min-w-0">
          <h3
            id="where-raise-stands-heading"
            className="cursor-help text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--tomo-mute)]"
          >
            Where the raise stands
          </h3>
        </HoverHint>
        <Link
          href="/insights"
          className="shrink-0 text-[11px] font-medium text-[color:var(--tomo-teal-muted)] underline underline-offset-2 hover:text-[color:var(--tomo-teal)]"
        >
          Insights →
        </Link>
      </div>
      <ul className="space-y-1.5">
        {ROWS.map(({ key, label, dotClass, countClass, href }) => (
          <li key={key} className="flex items-center justify-between gap-3 text-[13px]">
            <HoverHint hint={BUCKET_HINTS[key]} wide className="min-w-0 flex-1">
              <Link
                href={href}
                className="flex min-w-0 flex-1 items-center gap-2 text-[color:var(--tomo-body)] underline-offset-2 hover:text-[color:var(--foreground)] hover:underline"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            </HoverHint>
            <Link
              href={href}
              className={`shrink-0 font-mono text-sm tabular-nums font-medium underline-offset-2 hover:underline ${countClass}`}
            >
              {breakdown[key]}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 font-mono text-[10px] leading-snug text-[color:var(--tomo-mute)]">
        CRM funnel: Sourced → First meeting → Nurturing → Active diligence → Soft commit → Committed → On hold → Closed lost
      </p>
    </section>
  );
}
