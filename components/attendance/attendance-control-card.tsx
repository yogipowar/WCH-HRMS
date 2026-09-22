"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AttendanceTimeline } from "@/components/attendance/attendance-timeline";
import { BreakSummary } from "@/components/attendance/break-summary";
import { WorkHoursProgress } from "@/components/attendance/work-hours-progress";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { LiveStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { summarizeAttendance, formatDuration } from "@/lib/attendance/calculations";
import { getStateLabel } from "@/lib/attendance/state-machine";
import { dayKind, weeklyOffReason } from "@/lib/attendance/work-calendar";
import { toLiveStatus } from "@/lib/lookups";
import { attendanceService } from "@/lib/services/attendanceService";
import { useDataStore } from "@/lib/stores/data-store";
import { formatTime } from "@/lib/utils/format";

export function AttendanceControlCard({ employeeId }: { employeeId: string }) {
  const records = useDataStore((state) => state.attendanceRecords);
  const settings = useDataStore((state) => state.settings);
  const holidays = useDataStore((state) => state.holidays);
  const [now, setNow] = useState(() => new Date());
  const [clockOutOpen, setClockOutOpen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const record = useMemo(() => {
    const today = attendanceService.getTodayAttendance(employeeId, now);
    return records.find((item) => item.id === today.id) ?? today;
  }, [employeeId, now, records]);
  const summary = useMemo(() => summarizeAttendance(record, now), [now, record]);
  const offReason = useMemo(() => {
    const kind = dayKind(now, settings, holidays);
    if (kind === "HOLIDAY") {
      const holiday = holidays.find((item) => item.date === format(now, "yyyy-MM-dd"));
      return holiday ? `Company holiday — ${holiday.name}` : "Company holiday";
    }
    if (kind === "WEEKLY_OFF") {
      return weeklyOffReason(now, settings) ?? "Weekly off";
    }
    return null;
  }, [holidays, now, settings]);

  function runAction(action: () => void, success: string) {
    try {
      action();
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "This attendance action is not allowed.");
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{format(now, "EEEE, dd MMMM yyyy")}</p>
          <CardTitle className="mt-1">Today&apos;s attendance</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {offReason
              ? offReason
              : record.clockIn
                ? `Working since ${formatTime(record.clockIn)}`
                : "You have not clocked in yet."}
          </p>
        </div>
        <LiveStatusBadge status={toLiveStatus(record.state, record.status)} />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Current status" value={getStateLabel(record.state)} />
          <Metric label="Clock in" value={formatTime(record.clockIn)} />
          <Metric label="Active work" value={formatDuration(summary.activeWorkingMinutes)} />
          <Metric label="Remaining" value={formatDuration(summary.remainingMinutes)} />
        </div>

        <WorkHoursProgress summary={summary} />
        <BreakSummary summary={summary} />

        <div className="flex flex-wrap gap-2">
          {offReason && record.state === "NOT_CLOCKED_IN" ? (
            <p className="rounded-lg bg-slate-500/10 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              Attendance is closed today.
            </p>
          ) : null}
          {!offReason && record.state === "NOT_CLOCKED_IN" ? (
            <Button onClick={() => runAction(() => attendanceService.clockIn(employeeId), "Clocked in successfully.")}>
              Clock In
            </Button>
          ) : null}
          {record.state === "WORKING" ? (
            <>
              <Button variant="outline" onClick={() => runAction(() => attendanceService.startBreak(employeeId, "LUNCH"), "Lunch break started.")}>
                Start Lunch Break
              </Button>
              <Button variant="outline" onClick={() => runAction(() => attendanceService.startBreak(employeeId, "PERSONAL"), "Personal break started.")}>
                Start Personal Break
              </Button>
              <Button variant="secondary" onClick={() => setClockOutOpen(true)}>
                Clock Out
              </Button>
            </>
          ) : null}
          {record.state === "ON_LUNCH_BREAK" ? (
            <Button onClick={() => runAction(() => attendanceService.endBreak(employeeId), "Lunch break ended.")}>
              End Lunch Break
            </Button>
          ) : null}
          {record.state === "ON_PERSONAL_BREAK" ? (
            <Button onClick={() => runAction(() => attendanceService.endBreak(employeeId), "Personal break ended.")}>
              End Personal Break
            </Button>
          ) : null}
          {record.state === "CLOCKED_OUT" ? (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Workday completed
            </p>
          ) : null}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Attendance timeline</h3>
          <AttendanceTimeline record={record} />
        </div>
      </CardContent>

      <ConfirmationDialog
        open={clockOutOpen}
        onOpenChange={setClockOutOpen}
        title="Clock out?"
        confirmLabel="Confirm Clock Out"
        description={
          <div className="space-y-2">
            <p>Today&apos;s summary:</p>
            <p>Active work: {formatDuration(summary.activeWorkingMinutes)}</p>
            <p>Break: {formatDuration(summary.breakMinutes)}</p>
            <p>Required: {formatDuration(summary.requiredMinutes)}</p>
          </div>
        }
        onConfirm={() =>
          runAction(() => attendanceService.clockOut(employeeId), "Clocked out. Attendance summary saved.")
        }
      />
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
