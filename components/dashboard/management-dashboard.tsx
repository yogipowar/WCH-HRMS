"use client";

import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, startOfWeek } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Briefcase,
  Coffee,
  Timer,
  UserCheck,
  UserMinus,
  Users,
  Utensils,
  Clock3,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { ChartCard } from "@/components/charts/chart-card";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/shared/link-button";
import { StatCard } from "@/components/shared/stat-card";
import { LeaveStatusBadge, LiveStatusBadge } from "@/components/shared/status-badge";
import { LiveAttendanceTable } from "@/components/attendance/live-attendance-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/attendance/calculations";
import { isPresentAttendance, isWorkingDay } from "@/lib/attendance/work-calendar";
import { getEmployeeName, toLiveStatus } from "@/lib/lookups";
import { departmentAttendance, liveAttendanceRows, monthlyTrend, weeklyTrend } from "@/lib/reports/aggregations";
import { useDataStore } from "@/lib/stores/data-store";
import { formatDate, leaveTypeLabel } from "@/lib/utils/format";
import Link from "next/link";

const TODAY = format(new Date(), "yyyy-MM-dd");

export function ManagementDashboard() {
  const data = useDataStore();
  const [range, setRange] = useState<DateRange | undefined>();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
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
  const pendingLeaves = data.leaveRequests.filter((item) => item.status === "PENDING");
  const upcomingHolidays = [...data.holidays]
    .filter((item) => item.date >= TODAY)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

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
    <div className="space-y-6">
      <PageHeader
        title="Management dashboard"
        description="Live workforce attendance, 9-hour compliance, and pending people actions."
        actions={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/attendance" variant="outline">Live attendance</LinkButton>
            <Button variant="outline" onClick={() => applyPreset("today")}>
              Today
            </Button>
            <Button variant="outline" onClick={() => applyPreset("week")}>
              This week
            </Button>
            <Button variant="outline" onClick={() => applyPreset("month")}>
              This month
            </Button>
            <DateRangePicker value={range} onChange={setRange} />
          </div>
        }
      />
      <p className="text-sm text-muted-foreground">Showing {rangeHint}. Live timers refresh while employees are working.</p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total employees" value={data.employees.length} icon={Users} />
        <StatCard label="Present today" value={present.length} icon={UserCheck} tone="success" />
        <StatCard label="Absent today" value={absent.length} icon={UserMinus} tone="danger" />
        <StatCard label="On leave" value={onLeave.length} icon={Briefcase} tone="info" />
        <StatCard label="Currently working" value={working.length} icon={Clock3} tone="success" />
        <StatCard label="On lunch break" value={lunch.length} icon={Utensils} tone="warning" />
        <StatCard label="On personal break" value={personal.length} icon={Coffee} tone="warning" />
        <StatCard label="Completed 9 hours" value={completed.length} icon={CheckCircle2} tone="success" />
        <StatCard label="Below 9 hours" value={below.length} icon={Timer} tone="warning" />
        <StatCard label="Late arrivals" value={late.length} icon={AlertTriangle} tone="danger" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Weekly attendance trend">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyTrend(data.attendanceRecords, chartEnd)}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="present" stroke="var(--primary)" strokeWidth={2} />
              <Line type="monotone" dataKey="absent" stroke="var(--destructive)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Monthly working hours">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrend(data.attendanceRecords, chartEnd)}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Department attendance">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departmentAttendance(data, focusDate)}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="present" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Leave statistics">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { label: "Pending", value: data.leaveRequests.filter((item) => item.status === "PENDING").length },
                { label: "Approved", value: data.leaveRequests.filter((item) => item.status === "APPROVED").length },
                { label: "Rejected", value: data.leaveRequests.filter((item) => item.status === "REJECTED").length },
                { label: "Cancelled", value: data.leaveRequests.filter((item) => item.status === "CANCELLED").length },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card className="shadow-sm">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Currently working</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {working.slice(0, 6).map((row) => (
              <div key={row.employee.id} className="flex items-center justify-between text-sm">
                <span>{row.employee.fullName}</span>
                <span className="text-muted-foreground">{formatDuration(row.summary.activeWorkingMinutes)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Currently on break</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...lunch, ...personal].map((row) => (
              <div key={row.employee.id} className="flex items-center justify-between text-sm">
                <span>{row.employee.fullName}</span>
                <LiveStatusBadge status={toLiveStatus(row.record?.state ?? "NOT_CLOCKED_IN", row.record?.status)} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pending leave requests</CardTitle>
            <LinkButton href="/leave" size="sm" variant="outline">Review</LinkButton>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingLeaves.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    <Link href="/leave" className="hover:text-primary">{getEmployeeName(data, item.employeeId)}</Link>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {leaveTypeLabel(item.type)} · {formatDate(item.startDate)}
                  </p>
                </div>
                <LeaveStatusBadge status={item.status} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Upcoming holidays & announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingHolidays.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span>{item.name}</span>
                <span className="text-muted-foreground">{formatDate(item.date)}</span>
              </div>
            ))}
            <div className="border-t pt-3 space-y-2">
              {data.announcements
                .filter((item) => item.status === "PUBLISHED")
                .slice(0, 2)
                .map((item) => (
                  <Link key={item.id} href="/announcements" className="block text-sm hover:text-primary">
                    {item.title}
                  </Link>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
