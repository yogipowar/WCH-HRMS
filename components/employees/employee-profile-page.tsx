"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { EmployeeForm } from "@/components/employees/employee-form";
import { AttendanceHistoryList } from "@/components/attendance/attendance-history-list";
import { AttendanceTimeline } from "@/components/attendance/attendance-timeline";
import { PageHeader } from "@/components/shared/page-header";
import { ActiveBadge, LeaveStatusBadge, LiveStatusBadge } from "@/components/shared/status-badge";
import { EmployeeAvatar } from "@/components/shared/employee-avatar";
import { LinkButton } from "@/components/shared/link-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDuration, summarizeAttendance } from "@/lib/attendance/calculations";
import { findOpenAttendance } from "@/lib/attendance/session";
import { formatEmployeeDisplayName } from "@/lib/employee/display";
import { getDepartmentName, getDesignationName, getReportingPersonName, toLiveStatus } from "@/lib/lookups";
import { leaveYearLabel, remainingPaidDays, YEARLY_PAID_LEAVE_TOTAL, YEARLY_PAID_LEAVES } from "@/lib/leave/policy";
import { documentService } from "@/lib/services/documentService";
import { PayslipActions } from "@/components/payroll/payslip-actions";
import { PayrollStatusControl } from "@/components/payroll/payroll-status-control";
import { payrollService } from "@/lib/services/payrollService";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";
import { currency, documentTypeLabel, employmentTypeLabel, formatDate, formatPeriod, formatTime, leaveTypeLabel, todayIsoDate } from "@/lib/utils/format";

export function EmployeeProfilePage({ employeeId }: { employeeId: string }) {
  const data = useDataStore();
  const authUser = useAuthStore((state) => state.user);
  const searchParams = useSearchParams();
  const employee = data.employees.find((item) => item.id === employeeId);
  const account = data.users.find((item) => item.id === employee?.userId);
  const isAdmin = authUser?.role === "MANAGEMENT";
  const [showPassword, setShowPassword] = useState(false);
  const today = attendanceFor(data, employeeId);
  const history = [...data.attendanceRecords]
    .filter((item) => item.employeeId === employeeId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const leaves = data.leaveRequests.filter((item) => item.employeeId === employeeId);
  const documents = data.documents.filter((item) => item.employeeId === employeeId);
  const payroll = payrollService.getByEmployee(employeeId);
  const balance = data.leaveBalances.find((item) => item.employeeId === employeeId);

  const summary = useMemo(
    () => (today ? summarizeAttendance(today) : null),
    [today],
  );

  if (!employee) {
    return <p className="text-sm text-muted-foreground">Employee not found.</p>;
  }

  const displayName = formatEmployeeDisplayName(employee.fullName, employee.gender);

  if (searchParams.get("edit") === "1") {
    return (
      <div className="space-y-6">
        <PageHeader title={`Edit ${displayName}`} description="Update employee records." />
        <EmployeeForm employee={employee} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={displayName}
        description={`${employee.employeeCode} · ${getDesignationName(data, employee.designationId)}`}
        actions={<LinkButton href={`/employees/${employee.id}?edit=1`}>Edit</LinkButton>}
      />
      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <EmployeeAvatar employee={employee} className="size-16" fallbackClassName="text-lg" />
            <div>
              <p className="text-lg font-semibold">{displayName}</p>
              <p className="text-sm text-muted-foreground">
                {getDepartmentName(data, employee.departmentId)} · {employmentTypeLabel(employee.employmentType)}
              </p>
              <p className="text-sm text-muted-foreground">{employee.workEmail} · {employee.phone}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ActiveBadge active={employee.status === "ACTIVE"} />
            {today ? <LiveStatusBadge status={toLiveStatus(today.state, today.status)} /> : null}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="hours">Working hours</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="grid gap-4 md:grid-cols-2">
          <InfoCard title="Role" value={getDesignationName(data, employee.designationId)} />
          <InfoCard title="Department" value={getDepartmentName(data, employee.departmentId)} />
          <InfoCard title="Joining date" value={formatDate(employee.joiningDate)} />
          <InfoCard title="Reporting person" value={getReportingPersonName(data, employee.reportingPersonId)} />
          <InfoCard title="Basic salary" value={currency(employee.basicSalary)} />
          <InfoCard title="Gross salary" value={currency(employee.basicSalary + employee.allowances)} />
          {isAdmin ? (
            <>
              <InfoCard title="Username" value={account?.username || "Not set"} />
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Password</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="font-mono text-sm font-semibold">
                      {account?.password
                        ? showPassword
                          ? account.password
                          : "••••••••"
                        : "Not stored — set a password when editing"}
                    </p>
                    {account?.password ? (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>
        <TabsContent value="personal">
          <Card>
            <CardContent className="grid gap-3 p-5 sm:grid-cols-2 text-sm">
              <Info label="Date of birth" value={formatDate(employee.dateOfBirth)} />
              <Info label="Gender" value={employee.gender} />
              <Info label="Personal email" value={employee.personalEmail} />
              <Info label="Address" value={employee.address} />
              <Info label="Emergency contact" value={`${employee.emergencyContact.name} · ${employee.emergencyContact.phone}`} />
              <Info label="Basic salary" value={currency(employee.basicSalary)} />
              <Info label="Allowances" value={currency(employee.allowances)} />
              <Info label="Deductions" value={currency(employee.deductions)} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Today</CardTitle></CardHeader>
            <CardContent>
              {today && summary ? (
                <div className="space-y-3 text-sm">
                  <p>Clock in: {formatTime(today.clockIn)}</p>
                  <p>Active: {formatDuration(summary.activeWorkingMinutes)}</p>
                  <p>Break: {formatDuration(summary.breakMinutes)}</p>
                  <AttendanceTimeline record={today} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No record for today.</p>
              )}
            </CardContent>
          </Card>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Attendance history</h2>
              <LinkButton href="/attendance/history" size="sm" variant="outline">All history</LinkButton>
            </div>
            <AttendanceHistoryList records={history.slice(0, 14)} />
          </div>
        </TabsContent>
        <TabsContent value="hours">
          <Card>
            <CardContent className="space-y-2 p-5 text-sm">
              <p>Daily required hours: {employee.dailyRequiredHours}h. Breaks are excluded from active working time.</p>
              <p>Work start: {employee.workStartTime || data.settings.workStartTime}</p>
              <p>
                Late after: {employee.lateAfterMinutes ?? data.settings.lateAfterMinutes} minutes past work start
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="leaves" className="space-y-4">
          <p className="text-sm text-muted-foreground">Leave year {leaveYearLabel()}. Unused leave is not carried forward.</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <InfoCard title="Casual (CL)" value={`${balance?.casual ?? 0} / ${YEARLY_PAID_LEAVES.casual} days`} />
            <InfoCard title="Sick (SL)" value={`${balance?.sick ?? 0} / ${YEARLY_PAID_LEAVES.sick} days`} />
            <InfoCard title="Privilege (PL)" value={`${balance?.privilege ?? 0} / ${YEARLY_PAID_LEAVES.privilege} days`} />
            <InfoCard title="Paid remaining" value={`${balance ? remainingPaidDays(balance) : 0} / ${YEARLY_PAID_LEAVE_TOTAL} days`} />
          </div>
          {leaves.map((item) => (
            <Link key={item.id} href={`/leave/${item.id}`} className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/50">
              <span>{leaveTypeLabel(item.type)} · {formatDate(item.startDate)}</span>
              <LeaveStatusBadge status={item.status} />
            </Link>
          ))}
        </TabsContent>
        <TabsContent value="documents" className="space-y-3">
          {documents.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-muted-foreground">{documentTypeLabel(item.type)} · {item.fileName}</p>
              </div>
              {item.hasFile ? (
                <a
                  href={documentService.documentFileHref(item.id)}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  View
                </a>
              ) : (
                <span className="text-muted-foreground">No file</span>
              )}
            </div>
          ))}
        </TabsContent>
        <TabsContent value="payroll" className="space-y-3">
          {[...payroll]
            .sort((a, b) => b.period.localeCompare(a.period))
            .map((item) => (
            <Card key={item.id}>
              <CardContent className="grid gap-2 p-5 text-sm sm:grid-cols-2">
                <Info label="Period" value={formatPeriod(item.period)} />
                <Info label="Basic" value={currency(item.basicSalary)} />
                <Info label="Allowances" value={currency(item.allowances)} />
                <Info label="Gross" value={currency(item.grossSalary)} />
                <Info label="Deductions" value={currency(item.deductions)} />
                <Info label="Net" value={currency(item.netSalary)} />
                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-1.5">
                      <PayrollStatusControl record={item} />
                    </div>
                  </div>
                  <PayslipActions data={data} record={item} employee={employee} />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="activity">
          <Card>
            <CardContent className="space-y-3 p-5 text-sm">
              {history.slice(0, 5).map((item) => (
                <p key={item.id}>
                  {formatDate(item.date)} · {item.status.toLowerCase()} · {formatDuration(item.activeWorkingMinutes)} active
                </p>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function attendanceFor(data: ReturnType<typeof useDataStore.getState>, employeeId: string) {
  return (
    findOpenAttendance(data.attendanceRecords, employeeId) ??
    data.attendanceRecords.find((item) => item.employeeId === employeeId && item.date === todayIsoDate())
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="mt-1 font-medium">{value}</p>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
