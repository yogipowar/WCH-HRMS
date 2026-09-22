"use client";

import { CalendarDays, FileText, Palmtree } from "lucide-react";
import { AttendanceControlCard } from "@/components/attendance/attendance-control-card";
import { PageHeader } from "@/components/shared/page-header";
import { LeaveStatusBadge } from "@/components/shared/status-badge";
import { LinkButton } from "@/components/shared/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDepartmentName, getDesignationName } from "@/lib/lookups";
import { leaveTypeLabel, formatDate } from "@/lib/utils/format";
import { useDataStore } from "@/lib/stores/data-store";
import type { Employee } from "@/types";

export function EmployeeDashboard({ employee }: { employee: Employee }) {
  const data = useDataStore();
  const leaves = data.leaveRequests.filter((item) => item.employeeId === employee.id).slice(0, 4);
  const holidays = [...data.holidays]
    .filter((item) => item.date >= "2026-09-22")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const announcements = data.announcements.filter((item) => item.status === "PUBLISHED").slice(0, 3);
  const balance = data.leaveBalances.find((item) => item.employeeId === employee.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hello, ${employee.fullName.split(" ")[0]}`}
        description={`${getDesignationName(data, employee.designationId)} · ${getDepartmentName(data, employee.departmentId)}`}
        actions={<LinkButton href="/leave">Apply leave</LinkButton>}
      />
      <AttendanceControlCard employeeId={employee.id} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4" /> Leave balance
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <Balance label="Casual (CL)" value={balance?.casual ?? 0} />
            <Balance label="Sick (SL)" value={balance?.sick ?? 0} />
            <Balance label="Privilege (PL)" value={balance?.privilege ?? 0} />
            <Balance label="Paid left" value={(balance?.casual ?? 0) + (balance?.sick ?? 0) + (balance?.privilege ?? 0)} />
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palmtree className="size-4" /> Upcoming holidays
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {holidays.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span>{item.name}</span>
                <span className="text-muted-foreground">{formatDate(item.date)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4" /> Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.map((item) => (
              <div key={item.id}>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Recent leave requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {leaves.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leave requests yet.</p>
          ) : (
            leaves.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{leaveTypeLabel(item.type)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(item.startDate)} - {formatDate(item.endDate)}
                  </p>
                </div>
                <LeaveStatusBadge status={item.status} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Balance({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value} days</p>
    </div>
  );
}
