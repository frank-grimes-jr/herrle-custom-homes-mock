// Thin progress/comparison bar. Dynamic width & color → inline style
// (Tailwind can't do arbitrary runtime values).
export function Bar({
  pct,
  color = "var(--primary)",
  track = "var(--surface-2)",
  className = "",
}: {
  pct: number;
  color?: string;
  track?: string;
  className?: string;
}) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full ${className}`} style={{ background: track }}>
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </div>
  );
}
