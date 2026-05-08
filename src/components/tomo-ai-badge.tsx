type TomoAiBadgeProps = {
  label?: string;
};

export function TomoAiSparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

export function TomoAiBadge({ label = "Tomo" }: TomoAiBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide tomo-ai-text">
      <TomoAiSparkleIcon className="tomo-ai-badge-icon h-3.5 w-3.5 shrink-0 text-[color:var(--tomo-teal)]" />
      <span>{label}</span>
    </span>
  );
}
