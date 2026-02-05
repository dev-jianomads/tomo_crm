type TomoAiBadgeProps = {
  label?: string;
};

export function TomoAiBadge({ label = "Tomo" }: TomoAiBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide tomo-ai-text">
      <span className="tomo-ai-badge" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
