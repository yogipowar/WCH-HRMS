export function LeaveDonut({
  value,
  total,
  label,
}: {
  value: number;
  total: number;
  label: string;
}) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const ratio = total > 0 ? Math.min(value / total, 1) : 0;
  const offset = circumference * (1 - ratio);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative size-24">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--muted)" strokeWidth="10" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm font-semibold">{value}/{total}</p>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
