"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AttendanceControlCard } from "@/components/attendance/attendance-control-card";
import { AttendanceHistoryList } from "@/components/attendance/attendance-history-list";
import { AttendanceTimeline } from "@/components/attendance/attendance-timeline";
import { LiveAttendanceTable } from "@/components/attendance/live-attendance-table";
import { DatePicker } from "@/components/shared/date-range-picker";
import { PageHeader } from "@/components/shared/page-header";
import { AttendanceStatusBadge } from "@/components/shared/status-badge";
import { LinkButton } from "@/components/shared/link-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, summarizeAttendance } from "@/lib/attendance/calculations";
import { getEmployeeByUser, getEmployeeName } from "@/lib/lookups";
import { liveAttendanceRows } from "@/lib/reports/aggregations";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";
import { formatDate } from "@/lib/utils/format";

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
        <PageHeader
          title="My attendance"
          description="Track clock-in, breaks, and the 9-hour active work target."
          actions={<LinkButton href="/attendance/history" variant="outline">History</LinkButton>}
        />
        <AttendanceControlCard employeeId={employee.id} />
        <AttendanceHistoryList
          records={[...data.attendanceRecords]
            .filter((item) => item.employeeId === employee.id)
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 7)}
        />
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
  const [employeeId, setEmployeeId] = useState("all");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const isEmployee = user?.role === "EMPLOYEE";
  const today = format(new Date(), "yyyy-MM-dd");

  const source = useMemo(() => {
    let rows = data.attendanceRecords;
    if (isEmployee && user) {
      const employee = getEmployeeByUser(data, user.id);
      rows = rows.filter((item) => item.employeeId === employee?.id);
    } else {
      if (departmentId !== "all") {
        const ids = data.employees.filter((item) => item.departmentId === departmentId).map((item) => item.id);
        rows = rows.filter((item) => ids.includes(item.employeeId));
      }
      if (employeeId !== "all") {
        rows = rows.filter((item) => item.employeeId === employeeId);
      }
      if (status !== "all") {
        rows = rows.filter((item) => item.status === status);
      }
    }
    if (date) {
      rows = rows.filter((item) => item.date === date);
    }
    return [...rows].sort((a, b) => b.date.localeCompare(a.date) || getEmployeeName(data, a.employeeId).localeCompare(getEmployeeName(data, b.employeeId)));
  }, [data, date, departmentId, employeeId, isEmployee, status, user]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={isEmployee ? "My attendance history" : "Attendance history"}
        description="Clock-in, clock-out, lunch, and personal breaks for each day."
      />
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <DatePicker value={date} onChange={setDate} placeholder="Select date" className="w-full sm:w-auto" />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={date === today ? "secondary" : "outline"}
            className="h-10"
            onClick={() => setDate(today)}
          >
            Today
          </Button>
          <Button
            type="button"
            variant={!date ? "secondary" : "outline"}
            className="h-10"
            onClick={() => setDate("")}
          >
            All dates
          </Button>
        </div>
        {user?.role === "MANAGEMENT" ? (
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:ml-auto">
            <select className={selectClass} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              <option value="all">All employees</option>
              {data.employees
                .filter((item) => departmentId === "all" || item.departmentId === departmentId)
                .map((item) => (
                  <option key={item.id} value={item.id}>{item.fullName}</option>
                ))}
            </select>
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
      </div>
      <AttendanceHistoryList records={source} showEmployee={!isEmployee} />
    </div>
  );
}

export function AttendanceDetailPage({ id }: { id: string }) {
  const user = useAuthStore((state) => state.user);
  const data = useDataStore();
  const record = data.attendanceRecords.find((item) => item.id === id);
  if (!record) {
    return <p className="text-sm text-muted-foreground">Attendance record not found.</p>;
  }
  if (user?.role === "EMPLOYEE") {
    const employee = getEmployeeByUser(data, user.id);
    if (!employee || record.employeeId !== employee.id) {
      return <p className="text-sm text-muted-foreground">You can only view your own attendance history.</p>;
    }
  }
  const summary = summarizeAttendance(record);
  return (
    <div className="space-y-6">
      <PageHeader
        title={getEmployeeName(data, record.employeeId)}
        description={formatDate(record.date)}
        actions={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/attendance/history" variant="outline">History</LinkButton>
            {user?.role === "MANAGEMENT" ? (
              <LinkButton href={`/employees/${record.employeeId}`} variant="outline">Employee profile</LinkButton>
            ) : null}
          </div>
        }
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
