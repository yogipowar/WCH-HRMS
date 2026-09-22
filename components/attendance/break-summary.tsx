import { formatDuration } from "@/lib/attendance/calculations";
import type { AttendanceSummary } from "@/types";

export function BreakSummary({ summary }: { summary: AttendanceSummary }) {
  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <div className="rounded-lg bg-muted/60 p-3">
        <p className="text-muted-foreground">Lunch</p>
        <p className="mt-1 font-semibold">{formatDuration(summary.lunchMinutes)}</p>
      </div>
      <div className="rounded-lg bg-muted/60 p-3">
        <p className="text-muted-foreground">Personal</p>
        <p className="mt-1 font-semibold">{formatDuration(summary.personalMinutes)}</p>
      </div>
      <div className="rounded-lg bg-muted/60 p-3">
        <p className="text-muted-foreground">Total break</p>
        <p className="mt-1 font-semibold">{formatDuration(summary.breakMinutes)}</p>
      </div>
    </div>
  );
}
