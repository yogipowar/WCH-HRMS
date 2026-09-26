"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, startOfMonth, startOfWeek } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Users } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { ChartCard } from "@/components/charts/chart-card";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { LinkButton } from "@/components/shared/link-button";
import { LeaveStatusBadge, LiveStatusBadge } from "@/components/shared/status-badge";
import { LiveAttendanceTable } from "@/components/attendance/live-attendance-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/attendance/calculations";
import { isPresentAttendance, isWorkingDay } from "@/lib/attendance/work-calendar";
import { getEmployeeName, toLiveStatus } from "@/lib/lookups";
import {
  attendanceFlagTrend,
  departmentAttendance,
  liveAttendanceRows,
  monthlyTrend,
  weeklyTrend,
} from "@/lib/reports/aggregations";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";
import { formatDate, leaveTypeLabel } from "@/lib/utils/format";

const TODAY = format(new Date(), "yyyy-MM-dd");

export function ManagementDashboard() {
  const user = useAuthStore((state) => state.user);
  const data = useDataStore();
  const [range, setRange] = useState<DateRange | undefined>();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const todayRows = useMemo(() => liveAttendanceRows(data, TODAY, now), [data, now]);
  const chartEnd = range?.to ?? range?.from ?? now;
  const focusDate =
    range?.from && range.to && format(range.from, "yyyy-MM-dd") === format(range.to, "yyyy-MM-dd")
      ? format(range.from, "yyyy-MM-dd")
      : TODAY;
  const tableRows = useMemo(
    () => liveAttendanceRows(data, focusDate, now),
    [data, focusDate, now],
  );
  const present = todayRows.filter((row) => row.record && isPresentAttendance(row.record.status));
  const absent = todayRows.filter((row) => row.record?.status === "ABSENT" || (!row.record && isWorkingDay(TODAY, data.settings, data.holidays)));
  const onLeave = todayRows.filter((row) => row.record?.status === "ON_LEAVE");
  const working = todayRows.filter((row) => row.record?.state === "WORKING");
  const lunch = todayRows.filter((row) => row.record?.state === "ON_LUNCH_BREAK");
  const personal = todayRows.filter((row) => row.record?.state === "ON_PERSONAL_BREAK");
  const completed = todayRows.filter((row) => row.summary.targetCompleted);
  const below = present.filter((row) => !row.summary.targetCompleted);
  const late = todayRows.filter((row) => (row.record?.lateMinutes ?? 0) > 0);
  const missing = todayRows.filter((row) => !row.record?.clockIn && row.record?.status !== "ON_LEAVE" && row.record?.status !== "WEEKLY_OFF" && row.record?.status !== "HOLIDAY");
  const pendingLeaves = data.leaveRequests.filter((item) => item.status === "PENDING");
  const approvedLeaves = data.leaveRequests.filter((item) => item.status === "APPROVED").length;
  const rejectedLeaves = data.leaveRequests.filter((item) => item.status === "REJECTED").length;
  const upcomingHolidays = [...data.holidays]
    .filter((item) => item.date >= TODAY)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
  const flagTrend = attendanceFlagTrend(data.attendanceRecords, chartEnd, 7);
  const flagMax = Math.max(1, ...flagTrend.flatMap((item) => [item.present, item.late, item.leave, item.absent]));

  function applyPreset(preset: "today" | "week" | "month") {
    const end = new Date();
    if (preset === "today") {
      setRange({ from: end, to: end });
    } else if (preset === "week") {
      setRange({ from: startOfWeek(end, { weekStartsOn: 1 }), to: end });
    } else {
      setRange({ from: startOfMonth(end), to: end });
    }
  }

  const rangeHint = range?.from
    ? `${format(range.from, "dd MMM")} - ${format(range.to ?? range.from, "dd MMM")}`
    : "Today";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <DashboardGreeting
          name={user?.name ?? "Admin"}
          subtitle={`Live workforce attendance · showing ${rangeHint}`}
        />
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/attendance" variant="outline">Live attendance</LinkButton>
          <Button variant="outline" onClick={() => applyPreset("today")}>Today</Button>
          <Button variant="outline" onClick={() => applyPreset("week")}>This week</Button>
          <Button variant="outline" onClick={() => applyPreset("month")}>This month</Button>
          <DateRangePicker value={range} onChange={setRange} />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryTile label="Present" value={present.length} />
        <SummaryTile label="Absent" value={absent.length} />
        <SummaryTile label="Working" value={working.length} />
        <SummaryTile label="On break" value={lunch.length + personal.length} />
        <SummaryTile label="Missing punch" value={missing.length} />
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(280px,22rem)_minmax(0,1fr)]">
        <Card className="h-full">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="size-4" />
              </div>
              <div>
                <p className="font-semibold">{data.employees.length} employees</p>
                <p className="text-xs text-muted-foreground">Workforce snapshot</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SummaryTile label="On leave" value={onLeave.length} />
              <SummaryTile label="Late" value={late.length} />
              <SummaryTile label="Completed 9h" value={completed.length} />
              <SummaryTile label="Below 9h" value={below.length} />
              <SummaryTile label="On lunch" value={lunch.length} />
              <SummaryTile label="Personal break" value={personal.length} />
            </div>
          </CardContent>
        </Card>
        <ChartCard
          className="h-full"
          title="Attendance flag summary"
          actions={<span className="text-xs text-muted-foreground">Last 7 days</span>}
          contentClassName="min-h-[220px] flex-1"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flagTrend} barCategoryGap="22%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} domain={[0, Math.ceil(flagMax)]} width={28} />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" name="Present" fill="var(--primary)" maxBarSize={18} radius={[3, 3, 0, 0]} />
              <Bar dataKey="late" name="Late" fill="var(--chart-3)" maxBarSize={18} radius={[3, 3, 0, 0]} />
              <Bar dataKey="leave" name="Leave" fill="var(--chart-4)" maxBarSize={18} radius={[3, 3, 0, 0]} />
              <Bar dataKey="absent" name="Absent" fill="var(--destructive)" maxBarSize={18} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-2">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div>
              <CardTitle className="text-base">Attendance</CardTitle>
              <p className="text-xs text-muted-foreground">{format(now, "dd MMMM yyyy")}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold tabular-nums leading-none">{format(now, "hh:mm a")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{present.length} signed in</p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4 pt-0">
            <div className="grid grid-cols-3 gap-2">
              <SummaryTile label="Working" value={working.length} />
              <SummaryTile label="On break" value={lunch.length + personal.length} />
              <SummaryTile label="Missing" value={missing.length} />
            </div>
            <div className="min-h-0 flex-1">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">Missing / absent</p>
                <Link href="/attendance" className="text-xs text-primary hover:underline">View all</Link>
              </div>
              {missing.length === 0 ? (
                <p className="text-sm text-muted-foreground">No missing punches right now.</p>
              ) : (
                <div className="space-y-2">
                  {missing.slice(0, 5).map((row) => (
                    <div key={row.employee.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{row.employee.fullName}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {row.record?.status === "ABSENT" ? "Absent" : "Missing"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <LinkButton href="/attendance" className="h-10 w-full">Open live attendance</LinkButton>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Approvals & leave</CardTitle>
            <LinkButton href="/leave" size="sm" variant="outline">Review</LinkButton>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4 pt-0">
            <div className="space-y-2">
              <LeaveBalanceRow label="Pending" value={pendingLeaves.length} total={Math.max(data.leaveRequests.length, 1)} />
              <LeaveBalanceRow label="Approved" value={approvedLeaves} total={Math.max(data.leaveRequests.length, 1)} />
              <LeaveBalanceRow label="Rejected" value={rejectedLeaves} total={Math.max(data.leaveRequests.length, 1)} />
            </div>
            <div className="flex-1 space-y-2 border-t pt-3">
              {pendingLeaves.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending leave requests.</p>
              ) : (
                pendingLeaves.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        <Link href={`/leave/${item.id}`} className="hover:text-primary">{getEmployeeName(data, item.employeeId)}</Link>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {leaveTypeLabel(item.type)} · {formatDate(item.startDate)}
                      </p>
                    </div>
                    <LeaveStatusBadge status={item.status} />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
        <ChartCard className="h-full" title="Weekly attendance trend" contentClassName="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyTrend(data.attendanceRecords, chartEnd)} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} width={28} domain={[0, (max: number) => Math.max(4, Math.ceil(max))]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="present" name="Present" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="absent" name="Absent" stroke="var(--destructive)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Holidays & announcements</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3 pt-0">
            <div className="space-y-2">
              {upcomingHolidays.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming holidays.</p>
              ) : (
                upcomingHolidays.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{item.name}</span>
                    <span className="shrink-0 text-muted-foreground">{formatDate(item.date)}</span>
                  </div>
                ))
              )}
            </div>
            <div className="flex-1 space-y-2 border-t pt-3">
              {data.announcements.filter((item) => item.status === "PUBLISHED").length === 0 ? (
                <p className="text-sm text-muted-foreground">No published announcements.</p>
              ) : (
                data.announcements
                  .filter((item) => item.status === "PUBLISHED")
                  .slice(0, 4)
                  .map((item) => (
                    <Link key={item.id} href="/announcements" className="block text-sm hover:text-primary">
                      {item.title}
                    </Link>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <ChartCard title="Monthly working hours" contentClassName="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrend(data.attendanceRecords, chartEnd)} barCategoryGap="18%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis width={28} />
              <Tooltip />
              <Bar dataKey="hours" name="Hours" fill="var(--primary)" maxBarSize={16} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Department attendance" contentClassName="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departmentAttendance(data, focusDate)} barCategoryGap="28%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} width={28} />
              <Tooltip />
              <Bar dataKey="present" name="Present" fill="var(--primary)" maxBarSize={36} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Currently working</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-2 pt-0">
            {working.slice(0, 6).length === 0 ? (
              <p className="text-sm text-muted-foreground">No one is working right now.</p>
            ) : (
              working.slice(0, 6).map((row) => (
                <div key={row.employee.id} className="flex items-center justify-between text-sm">
                  <span>{row.employee.fullName}</span>
                  <span className="text-muted-foreground">{formatDuration(row.summary.activeWorkingMinutes)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Currently on break</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-2 pt-0">
            {[...lunch, ...personal].length === 0 ? (
              <p className="text-sm text-muted-foreground">No one is on break right now.</p>
            ) : (
              [...lunch, ...personal].map((row) => (
                <div key={row.employee.id} className="flex items-center justify-between text-sm">
                  <span>{row.employee.fullName}</span>
                  <LiveStatusBadge status={toLiveStatus(row.record?.state ?? "NOT_CLOCKED_IN", row.record?.status)} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {focusDate === TODAY ? "Today's employee attendance" : `Attendance · ${formatDate(focusDate)}`}
          </CardTitle>
          <LinkButton href="/attendance" size="sm" variant="outline">Open attendance</LinkButton>
        </CardHeader>
        <CardContent>
          <LiveAttendanceTable rows={tableRows} unboxed />
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function LeaveBalanceRow({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? Math.min(value / total, 1) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
