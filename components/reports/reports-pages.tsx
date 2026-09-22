"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/charts/chart-card";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/shared/link-button";
import { AttendanceStatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDuration } from "@/lib/attendance/calculations";
import { isPresentAttendance } from "@/lib/attendance/work-calendar";
import { getDepartmentName, getEmployeeName } from "@/lib/lookups";
import { departmentAttendance, weeklyTrend } from "@/lib/reports/aggregations";
import { useDataStore } from "@/lib/stores/data-store";
import { formatDate, leaveTypeLabel } from "@/lib/utils/format";
import { AlertTriangle, Clock3, Timer, Users } from "lucide-react";
import type { AttendanceRecord } from "@/types";

const REPORTS = [
  { href: "/reports/attendance", title: "Attendance report", description: "Presence, absence, and late arrivals." },
  { href: "/reports/working-hours", title: "Working hours report", description: "Active working time after break deductions." },
  { href: "/reports/breaks", title: "Break report", description: "Lunch and personal break duration." },
  { href: "/reports/leave", title: "Leave report", description: "Leave usage and approval status." },
  { href: "/reports/compliance", title: "9-hour compliance", description: "Who met the daily active-work target." },
];

export function ReportsHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Attendance, hours, breaks, leave, and 9-hour compliance insights." />
      <div className="grid gap-4 md:grid-cols-2">
        {REPORTS.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-xl border bg-card p-5 shadow-sm transition-colors hover:bg-muted/40">
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ReportShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex gap-2">
            <LinkButton href="/reports" variant="outline">All reports</LinkButton>
            <Button variant="outline" onClick={() => toast.success("Export is mocked for the frontend phase.")}>Export</Button>
          </div>
        }
      />
      {children}
    </div>
  );
}

export function AttendanceReportPage() {
  const data = useDataStore();
  const today = new Date().toISOString().slice(0, 10);
  const records = data.attendanceRecords.filter((item) => item.date === today);
  return (
    <ReportShell title="Attendance report" description="Today's presence across the agency.">
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Attendance rate" value={`${Math.round((records.filter((item) => isPresentAttendance(item.status)).length / Math.max(1, data.employees.length)) * 100)}%`} icon={Users} />
        <StatCard label="Late arrivals" value={records.filter((item) => item.status === "LATE").length} icon={AlertTriangle} tone="warning" />
        <StatCard label="Absent" value={records.filter((item) => item.status === "ABSENT").length} icon={Users} tone="danger" />
        <StatCard label="On leave" value={records.filter((item) => item.status === "ON_LEAVE").length} icon={Clock3} tone="info" />
      </div>
      <ChartCard title="Weekly trend">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyTrend(data.attendanceRecords)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="present" fill="var(--primary)" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <AttendanceTable records={records} />
    </ReportShell>
  );
}

export function WorkingHoursReportPage() {
  const data = useDataStore();
  const today = new Date().toISOString().slice(0, 10);
  const records = data.attendanceRecords.filter((item) => item.date === today && item.clockIn);
  const avg = records.length ? records.reduce((sum, item) => sum + item.activeWorkingMinutes, 0) / records.length : 0;
  return (
    <ReportShell title="Working hours report" description="Active working time excludes lunch and personal breaks.">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Average active hours" value={formatDuration(avg)} icon={Timer} />
        <StatCard label="Completed 9h" value={records.filter((item) => item.activeWorkingMinutes >= 540).length} icon={Clock3} tone="success" />
        <StatCard label="Below target" value={records.filter((item) => item.activeWorkingMinutes < 540).length} icon={AlertTriangle} tone="warning" />
      </div>
      <AttendanceTable records={records} />
    </ReportShell>
  );
}

export function BreaksReportPage() {
  const data = useDataStore();
  const today = new Date().toISOString().slice(0, 10);
  const records = data.attendanceRecords.filter((item) => item.date === today);
  const avg = records.length ? records.reduce((sum, item) => sum + item.breakMinutes, 0) / records.length : 0;
  return (
    <ReportShell title="Break report" description="Lunch and personal break duration by employee.">
      <StatCard label="Average break time" value={formatDuration(avg)} icon={Timer} tone="warning" />
      <AttendanceTable records={records} />
    </ReportShell>
  );
}

export function LeaveReportPage() {
  const data = useDataStore();
  return (
    <ReportShell title="Leave report" description="Leave requests across the team.">
      <div className="grid gap-3 sm:grid-cols-4">
        {(["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const).map((status) => (
          <Card key={status}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{status}</p><p className="text-2xl font-semibold">{data.leaveRequests.filter((item) => item.status === status).length}</p></CardContent></Card>
        ))}
      </div>
      <div className="space-y-3">
        {data.leaveRequests.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <span>{getEmployeeName(data, item.employeeId)} · {leaveTypeLabel(item.type)} · {formatDate(item.startDate)}</span>
            <span className="text-muted-foreground">{item.status}</span>
          </div>
        ))}
      </div>
    </ReportShell>
  );
}

export function ComplianceReportPage() {
  const data = useDataStore();
  const [departmentId, setDepartmentId] = useState("all");
  const today = new Date().toISOString().slice(0, 10);
  const records = useMemo(() => {
    let rows = data.attendanceRecords.filter((item) => item.date === today);
    if (departmentId !== "all") {
      const ids = data.employees.filter((item) => item.departmentId === departmentId).map((item) => item.id);
      rows = rows.filter((item) => ids.includes(item.employeeId));
    }
    return rows;
  }, [data, departmentId, today]);

  const columns: DataTableColumn<AttendanceRecord>[] = [
    { id: "employee", header: "Employee", accessor: (row) => getEmployeeName(data, row.employeeId), cell: (row) => getEmployeeName(data, row.employeeId) },
    { id: "date", header: "Date", cell: (row) => formatDate(row.date) },
    { id: "required", header: "Required hours", cell: (row) => `${row.requiredHours}h` },
    { id: "active", header: "Active hours", cell: (row) => formatDuration(row.activeWorkingMinutes) },
    { id: "break", header: "Break hours", cell: (row) => formatDuration(row.breakMinutes) },
    { id: "status", header: "Status", cell: (row) => row.activeWorkingMinutes >= row.requiredHours * 60 ? <span className="font-medium text-emerald-600">Completed</span> : <span className="font-medium text-amber-600">Below target</span> },
  ];

  return (
    <ReportShell title="9-hour compliance report" description="Active working time must reach 9 hours after break deductions.">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Department attendance">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departmentAttendance(data, today)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="present" fill="var(--primary)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <div className="space-y-3">
          <select className="h-10 rounded-lg border px-3 text-sm" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
            <option value="all">All departments</option>
            {data.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <p className="text-sm text-muted-foreground">
            {records.filter((item) => item.activeWorkingMinutes >= 540).length} completed · {records.filter((item) => item.clockIn && item.activeWorkingMinutes < 540).length} below target
          </p>
        </div>
      </div>
      <DataTable data={records} columns={columns} rowKey={(row) => row.id} />
    </ReportShell>
  );
}

function AttendanceTable({ records }: { records: AttendanceRecord[] }) {
  const data = useDataStore();
  const columns: DataTableColumn<AttendanceRecord>[] = [
    { id: "employee", header: "Employee", accessor: (row) => getEmployeeName(data, row.employeeId), cell: (row) => getEmployeeName(data, row.employeeId) },
    { id: "department", header: "Department", cell: (row) => getDepartmentName(data, data.employees.find((item) => item.id === row.employeeId)?.departmentId ?? "") },
    { id: "active", header: "Active", cell: (row) => formatDuration(row.activeWorkingMinutes) },
    { id: "break", header: "Break", cell: (row) => formatDuration(row.breakMinutes) },
    { id: "status", header: "Status", cell: (row) => <AttendanceStatusBadge status={row.status} /> },
  ];
  return <DataTable data={records} columns={columns} rowKey={(row) => row.id} />;
}
