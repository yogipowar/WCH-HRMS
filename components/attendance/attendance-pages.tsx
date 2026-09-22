"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { AttendanceControlCard } from "@/components/attendance/attendance-control-card";
import { AttendanceTimeline } from "@/components/attendance/attendance-timeline";
import { LiveAttendanceTable } from "@/components/attendance/live-attendance-table";
import { DatePicker } from "@/components/shared/date-range-picker";
import { PageHeader } from "@/components/shared/page-header";
import { AttendanceStatusBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { LinkButton } from "@/components/shared/link-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, summarizeAttendance } from "@/lib/attendance/calculations";
import { getDepartmentName, getEmployeeByUser, getEmployeeName } from "@/lib/lookups";
import { liveAttendanceRows } from "@/lib/reports/aggregations";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";
import { formatDate, formatTime } from "@/lib/utils/format";
import type { AttendanceRecord } from "@/types";

const selectClass = "h-10 rounded-lg border border-input bg-background px-3 text-sm";

export function AttendanceHomePage() {
  const user = useAuthStore((state) => state.user);
  const data = useDataStore();
  const [departmentId, setDepartmentId] = useState("all");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const today = format(new Date(), "yyyy-MM-dd");

  if (!user) return null;

  if (user.role === "EMPLOYEE") {
    const employee = getEmployeeByUser(data, user.id);
    if (!employee) return <p className="text-sm text-muted-foreground">No employee profile found.</p>;
    return (
      <div className="space-y-6">
        <PageHeader title="My attendance" description="Track clock-in, breaks, and the 9-hour active work target." />
        <AttendanceControlCard employeeId={employee.id} />
      </div>
    );
  }

  const rows = liveAttendanceRows(
    data,
    date,
    date === today ? new Date() : new Date(`${date}T18:00:00`),
  ).filter((row) => departmentId === "all" || row.employee.departmentId === departmentId);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Attendance"
        description={
          date === today
            ? "Live view of who is working, on break, completed, absent, on leave, or on a weekly off."
            : `Attendance snapshot for ${formatDate(date)}.`
        }
        actions={<LinkButton href="/attendance/history" variant="outline">History</LinkButton>}
      />
      <LiveAttendanceTable
        rows={rows}
        showActions
        toolbar={
          <>
            <DatePicker value={date} onChange={setDate} />
            {date !== today ? (
              <Button type="button" variant="outline" className="h-10" onClick={() => setDate(today)}>
                Today
              </Button>
            ) : null}
            <select className={selectClass} value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="all">All departments</option>
              {data.departments.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </>
        }
      />
    </div>
  );
}

export function AttendanceHistoryPage() {
  const user = useAuthStore((state) => state.user);
  const data = useDataStore();
  const [departmentId, setDepartmentId] = useState("all");
  const [status, setStatus] = useState("all");

  const source = useMemo(() => {
    let rows = data.attendanceRecords;
    if (user?.role === "EMPLOYEE") {
      const employee = getEmployeeByUser(data, user.id);
      rows = rows.filter((item) => item.employeeId === employee?.id);
    } else {
      if (departmentId !== "all") {
        const ids = data.employees.filter((item) => item.departmentId === departmentId).map((item) => item.id);
        rows = rows.filter((item) => ids.includes(item.employeeId));
      }
      if (status !== "all") {
        rows = rows.filter((item) => item.status === status);
      }
    }
    return [...rows].sort((a, b) => b.date.localeCompare(a.date));
  }, [data, departmentId, status, user]);

  const columns: DataTableColumn<AttendanceRecord>[] = [
    { id: "date", header: "Date", sortable: true, accessor: (row) => row.date, cell: (row) => formatDate(row.date) },
    { id: "employee", header: "Employee", accessor: (row) => getEmployeeName(data, row.employeeId), cell: (row) => (
      <Link href={`/employees/${row.employeeId}`} className="font-medium hover:text-primary">
        {getEmployeeName(data, row.employeeId)}
      </Link>
    ) },
    { id: "department", header: "Department", accessor: (row) => getDepartmentName(data, data.employees.find((item) => item.id === row.employeeId)?.departmentId ?? ""), cell: (row) => getDepartmentName(data, data.employees.find((item) => item.id === row.employeeId)?.departmentId ?? "") },
    { id: "in", header: "Clock in", searchValue: (row) => formatTime(row.clockIn), cell: (row) => formatTime(row.clockIn) },
    { id: "out", header: "Clock out", searchValue: (row) => formatTime(row.clockOut), cell: (row) => formatTime(row.clockOut) },
    { id: "active", header: "Active hours", accessor: (row) => row.activeWorkingMinutes, cell: (row) => formatDuration(row.activeWorkingMinutes) },
    { id: "break", header: "Break hours", accessor: (row) => row.breakMinutes, cell: (row) => formatDuration(row.breakMinutes) },
    { id: "required", header: "Required", cell: (row) => `${row.requiredHours}h` },
    { id: "status", header: "Status", searchValue: (row) => row.status, cell: (row) => <AttendanceStatusBadge status={row.status} /> },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <LinkButton href={`/attendance/${row.id}`} size="sm" variant="outline">
          View
        </LinkButton>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance history"
        description="Filter and review daily attendance records."
        actions={
          <div className="flex gap-2">
            <LinkButton href="/attendance" variant="outline">Today</LinkButton>
            <Button variant="outline" onClick={() => toast.success("Export queued. CSV download will be available after backend integration.")}>Export</Button>
          </div>
        }
      />
      {user?.role === "MANAGEMENT" ? (
        <div className="flex flex-wrap gap-3">
          <select className={selectClass} value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
            <option value="all">All departments</option>
            {data.departments.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <select className={selectClass} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late</option>
            <option value="COMPLETED">Completed</option>
            <option value="INCOMPLETE">Incomplete</option>
            <option value="ABSENT">Absent</option>
            <option value="ON_LEAVE">On leave</option>
            <option value="WEEKLY_OFF">Weekly off</option>
            <option value="HOLIDAY">Holiday</option>
          </select>
        </div>
      ) : null}
      <DataTable data={source} columns={columns} rowKey={(row) => row.id} searchPlaceholder="Search attendance..." />
    </div>
  );
}

export function AttendanceDetailPage({ id }: { id: string }) {
  const data = useDataStore();
  const record = data.attendanceRecords.find((item) => item.id === id);
  if (!record) {
    return <p className="text-sm text-muted-foreground">Attendance record not found.</p>;
  }
  const summary = summarizeAttendance(record);
  return (
    <div className="space-y-6">
      <PageHeader
        title={getEmployeeName(data, record.employeeId)}
        description={formatDate(record.date)}
        actions={<LinkButton href={`/employees/${record.employeeId}`} variant="outline">Employee profile</LinkButton>}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active</p><p className="font-semibold">{formatDuration(summary.activeWorkingMinutes)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Break</p><p className="font-semibold">{formatDuration(summary.breakMinutes)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Required</p><p className="font-semibold">{formatDuration(summary.requiredMinutes)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><AttendanceStatusBadge status={record.status} /></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
        <CardContent><AttendanceTimeline record={record} /></CardContent>
      </Card>
    </div>
  );
}
