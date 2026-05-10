import Link from "next/link";
import type { RaiseStandsBreakdown } from "@/lib/todayRaiseStands";

const ROWS: {
  key: keyof RaiseStandsBreakdown;
  label: string;
  dotClass: string;
  countClass: string;
}[] = [
  { key: "genuinelyMoveable", label: "Genuinely moveable", dotClass: "bg-[color:var(--tomo-teal)]", countClass: "text-[color:var(--tomo-teal-muted)]" },
  { key: "healthyOnTrack", label: "Healthy & on track", dotClass: "bg-emerald-500", countClass: "text-emerald-700 dark:text-emerald-400/90" },
  { key: "coolingWatch", label: "Cooling — watch", dotClass: "bg-amber-400", countClass: "text-amber-800 dark:text-amber-300/90" },
  { key: "driftingAct", label: "Drifting — act", dotClass: "bg-red-500", countClass: "text-red-700 dark:text-red-400/90" },
];

type Props = {
  breakdown: RaiseStandsBreakdown;
  className?: string;
};

export function WhereRaiseStandsCard({ breakdown, className = "" }: Props) {
  return (
    <section
      className={`mt-3 shrink-0 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-4 py-3 shadow-[var(--tomo-shadow-1)] ${className}`}
      aria-labelledby="where-raise-stands-heading"
    >
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h3 id="where-raise-stands-heading" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--tomo-mute)]">
          Where the raise stands
        </h3>
        <Link
          href="/insights"
          className="shrink-0 text-[11px] font-medium text-[color:var(--tomo-teal-muted)] underline underline-offset-2 hover:text-[color:var(--tomo-teal)]"
        >
          Insights →
        </Link>
      </div>
      <ul className="space-y-1.5">
        {ROWS.map(({ key, label, dotClass, countClass }) => (
          <li key={key} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2 text-[color:var(--tomo-body)]">
              <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden />
              <span className="truncate">{label}</span>
            </span>
            <span className={`shrink-0 font-mono text-sm tabular-nums font-medium ${countClass}`}>{breakdown[key]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 font-mono text-[10px] leading-snug text-[color:var(--tomo-mute)]">
        CRM funnel: Sourced → First meeting → Nurturing → Active diligence → Soft commit → Committed → On hold → Closed lost
      </p>
    </section>
  );
}
