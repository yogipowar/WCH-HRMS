"use client";

import { format, parseISO } from "date-fns";
import {
  AttendanceButtons,
  ClockOutDialog,
  useAttendanceSession,
} from "@/components/attendance/attendance-control-card";
import { AttendanceTimeline } from "@/components/attendance/attendance-timeline";
import { BreakSummary } from "@/components/attendance/break-summary";
import { LateRemovalRequestPanel } from "@/components/attendance/late-removal-panel";
import { WorkHoursProgress } from "@/components/attendance/work-hours-progress";
import { AttendanceStatusBadge, LiveStatusBadge } from "@/components/shared/status-badge";
import { LinkButton } from "@/components/shared/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, summarizeAttendance } from "@/lib/attendance/calculations";
import { isOpenAttendance } from "@/lib/attendance/session";
import { toLiveStatus } from "@/lib/lookups";
import { useDataStore } from "@/lib/stores/data-store";
import { formatClockTime, formatDate, formatTime } from "@/lib/utils/format";
import {
  LATE_MARKS_BEFORE_HALF_DAY,
  LATE_REMOVAL_MONTHLY_LIMIT,
  type AttendanceRecord,
} from "@/types";

export function EmployeeAttendanceBoard({
  employeeId,
  recentRecords,
}: {
  employeeId: string;
  recentRecords: AttendanceRecord[];
}) {
  const session = useAttendanceSession(employeeId);
  const { now, record, summary, offReason } = session;
  const employee = useDataStore((state) => state.employees.find((item) => item.id === employeeId));
  const settings = useDataStore((state) => state.settings);
  const lateRemovalRequests = useDataStore((state) => state.lateRemovalRequests ?? []);
  const workStartTime = employee?.workStartTime || settings.workStartTime;
  const lateAfterMinutes = employee?.lateAfterMinutes ?? settings.lateAfterMinutes;

  const lateRequestRecords = recentRecords.filter((item) => {
    if (item.id === record.id) return false;
    if (item.lateMinutes > 0) return true;
    return lateRemovalRequests.some(
      (req) => req.attendanceId === item.id && req.status !== "CANCELLED",
    );
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Today</p>
              <p className="text-xs text-muted-foreground">{format(now, "dd MMMM yyyy")}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {record.clockIn
                  ? `You signed in today at ${formatTime(record.clockIn)}`
                  : offReason ?? "You have not clocked in yet."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your work start: {formatClockTime(workStartTime)}
                {lateAfterMinutes > 0 ? ` · late after ${lateAfterMinutes} min` : null}
              </p>
              {record.clockIn && !record.clockOut && record.date !== format(now, "yyyy-MM-dd") ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Open since {format(parseISO(record.date), "dd MMM yyyy")}. Hours keep counting until clock out.
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="text-3xl font-semibold tabular-nums leading-none">{format(now, "hh:mm:ss a")}</p>
              <div className="mt-2 flex justify-end">
                <LiveStatusBadge status={toLiveStatus(record.state, record.status)} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricTile label="Work start" value={formatClockTime(workStartTime)} />
            <MetricTile label="Clock in" value={formatTime(record.clockIn)} />
            <MetricTile label="Active work" value={formatDuration(summary.activeWorkingMinutes)} />
            <MetricTile label="Remaining" value={formatDuration(summary.remainingMinutes)} />
          </div>
          <AttendanceButtons session={session} layout="toolbar" />
        </CardContent>
      </Card>

      <LateRemovalRequestPanel record={record} />

      <div className="grid items-stretch gap-4 xl:grid-cols-3">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily target</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <WorkHoursProgress summary={summary} />
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Breaks</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <BreakSummary summary={summary} />
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Today&apos;s timeline</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <AttendanceTimeline record={record} compact />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Late removal policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 pt-0 text-sm text-muted-foreground">
          <p>
            If you clock in late but complete your required hours ({record.requiredHours}h), you can ask
            admin to remove that late mark (up to {LATE_REMOVAL_MONTHLY_LIMIT} times per month).
          </p>
          <p>
            After {LATE_MARKS_BEFORE_HALF_DAY} countable late marks in a month, each further late day is
            marked half day. Admin-approved removals do not count toward that limit.
          </p>
        </CardContent>
      </Card>

      {lateRequestRecords.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">Late days — request removal</p>
          {lateRequestRecords.map((item) => (
            <LateRemovalRequestPanel key={item.id} record={item} showDate />
          ))}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
          <CardTitle className="text-base">Recent days</CardTitle>
          <LinkButton href="/attendance/history" size="sm" variant="outline">
            View history
          </LinkButton>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          {recentRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance history yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">In</th>
                  <th className="pb-2 font-medium">Out</th>
                  <th className="pb-2 font-medium">Active</th>
                  <th className="pb-2 font-medium">Break</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.map((item) => {
                  const hours = isOpenAttendance(item)
                    ? summarizeAttendance(item, now)
                    : { activeWorkingMinutes: item.activeWorkingMinutes, breakMinutes: item.breakMinutes };
                  return (
                    <tr key={item.id} className="border-t">
                      <td className="py-2">{formatDate(item.date)}</td>
                      <td className="py-2">{formatTime(item.clockIn)}</td>
                      <td className="py-2">{formatTime(item.clockOut)}</td>
                      <td className="py-2">{formatDuration(hours.activeWorkingMinutes)}</td>
                      <td className="py-2">{formatDuration(hours.breakMinutes)}</td>
                      <td className="py-2"><AttendanceStatusBadge status={item.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ClockOutDialog session={session} />
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}
