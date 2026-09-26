"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { AttendanceTimeline } from "@/components/attendance/attendance-timeline";
import { BreakSummary } from "@/components/attendance/break-summary";
import { WorkHoursProgress } from "@/components/attendance/work-hours-progress";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { LiveStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { summarizeAttendance, formatDuration } from "@/lib/attendance/calculations";
import { getStateLabel } from "@/lib/attendance/state-machine";
import { dayKind, weeklyOffReason } from "@/lib/attendance/work-calendar";
import { toLiveStatus } from "@/lib/lookups";
import { attendanceService } from "@/lib/services/attendanceService";
import { useDataStore } from "@/lib/stores/data-store";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils/format";

export function useAttendanceSession(employeeId: string) {
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

  return { now, record, summary, offReason, clockOutOpen, setClockOutOpen, runAction, employeeId };
}

export function AttendanceButtons({
  session,
  layout,
}: {
  session: ReturnType<typeof useAttendanceSession>;
  layout: "toolbar" | "stack";
}) {
  const { record, offReason, setClockOutOpen, runAction, employeeId } = session;
  const stacked = layout === "stack";
  const primaryClass = stacked ? "h-11 w-full" : "h-10 min-w-28";

  if (offReason && record.state === "NOT_CLOCKED_IN") {
    return (
      <p className={cn("rounded-lg bg-muted px-3 py-2 text-sm font-medium text-muted-foreground", stacked && "text-center")}>
        Attendance is closed today.
      </p>
    );
  }
  if (!offReason && record.state === "NOT_CLOCKED_IN") {
    return (
      <Button className={primaryClass} onClick={() => runAction(() => attendanceService.clockIn(employeeId), "Clocked in successfully.")}>
        Clock In
      </Button>
    );
  }
  if (record.state === "WORKING") {
    return (
      <div className={cn(stacked ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-2")}>
        <Button className={primaryClass} onClick={() => setClockOutOpen(true)}>
          Clock Out
        </Button>
        <div className={cn(stacked ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2")}>
          <Button variant="outline" onClick={() => runAction(() => attendanceService.startBreak(employeeId, "LUNCH"), "Lunch break started.")}>
            Start Lunch
          </Button>
          <Button variant="outline" onClick={() => runAction(() => attendanceService.startBreak(employeeId, "PERSONAL"), "Personal break started.")}>
            Start Personal
          </Button>
        </div>
      </div>
    );
  }
  if (record.state === "ON_LUNCH_BREAK") {
    return (
      <Button className={primaryClass} onClick={() => runAction(() => attendanceService.endBreak(employeeId), "Lunch break ended.")}>
        End Lunch Break
      </Button>
    );
  }
  if (record.state === "ON_PERSONAL_BREAK") {
    return (
      <Button className={primaryClass} onClick={() => runAction(() => attendanceService.endBreak(employeeId), "Personal break ended.")}>
        End Personal Break
      </Button>
    );
  }
  if (record.state === "CLOCKED_OUT") {
    return (
      <p className={cn("rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300", stacked && "text-center")}>
        Workday completed
      </p>
    );
  }
  return null;
}

export function ClockOutDialog({ session }: { session: ReturnType<typeof useAttendanceSession> }) {
  const { clockOutOpen, setClockOutOpen, summary, runAction, employeeId } = session;
  return (
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
  );
}

export function AttendanceActionBar({ employeeId }: { employeeId: string }) {
  const session = useAttendanceSession(employeeId);
  return (
    <>
      <AttendanceButtons session={session} layout="toolbar" />
      <ClockOutDialog session={session} />
    </>
  );
}

export function AttendanceControlCard({
  employeeId,
  compact = false,
}: {
  employeeId: string;
  compact?: boolean;
}) {
  const session = useAttendanceSession(employeeId);
  const { now, record, summary, offReason } = session;

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Attendance</p>
            <p className="mt-1 text-xs text-muted-foreground">{format(now, "dd MMMM yyyy")}</p>
          </div>
          <LiveStatusBadge status={toLiveStatus(record.state, record.status)} />
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {record.clockIn
              ? `You signed in today at ${formatTime(record.clockIn)}`
              : offReason ?? "You have not clocked in yet."}
          </p>
          <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">{format(now, "hh:mm:ss a")}</p>
          {record.clockIn && !record.clockOut && record.date !== format(now, "yyyy-MM-dd") ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Open since {format(parseISO(record.date), "dd MMM yyyy")}. Hours keep counting until clock out.
            </p>
          ) : null}
        </div>

        <AttendanceButtons session={session} layout="stack" />

        <div className="grid grid-cols-2 gap-3">
          <Metric label="Status" value={getStateLabel(record.state)} />
          <Metric label="Clock in" value={formatTime(record.clockIn)} />
          <Metric label="Active work" value={formatDuration(summary.activeWorkingMinutes)} />
          <Metric label="Remaining" value={formatDuration(summary.remainingMinutes)} />
        </div>

        {compact ? null : (
          <>
            <WorkHoursProgress summary={summary} />
            <BreakSummary summary={summary} />
            <div>
              <h3 className="mb-3 text-sm font-semibold">Attendance timeline</h3>
              <AttendanceTimeline record={record} />
            </div>
          </>
        )}
      </CardContent>

      <ClockOutDialog session={session} />
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
