import { Progress } from "@/components/ui/progress";
import { formatDuration } from "@/lib/attendance/calculations";
import type { AttendanceSummary } from "@/types";

export function WorkHoursProgress({ summary }: { summary: AttendanceSummary }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Daily target</span>
        <span className="font-medium">{summary.progressPercentage}%</span>
      </div>
      <Progress value={summary.progressPercentage} />
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Required</p>
          <p className="font-semibold">{formatDuration(summary.requiredMinutes)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Worked</p>
          <p className="font-semibold">{formatDuration(summary.activeWorkingMinutes)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Remaining</p>
          <p className="font-semibold">{formatDuration(summary.remainingMinutes)}</p>
        </div>
      </div>
    </div>
  );
}
