"use client";

import Link from "next/link";
import { format, startOfMonth } from "date-fns";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, FileText, Mail, MapPin, Phone } from "lucide-react";
import { AttendanceActionBar, AttendanceControlCard } from "@/components/attendance/attendance-control-card";
import { ChartCard } from "@/components/charts/chart-card";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { LeaveStatusBadge } from "@/components/shared/status-badge";
import { LinkButton } from "@/components/shared/link-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { YEARLY_PAID_LEAVE_TOTAL, YEARLY_PAID_LEAVES, remainingPaidDays } from "@/lib/leave/policy";
import { getDepartmentName, getDesignationName } from "@/lib/lookups";
import { isPayslipReleased } from "@/lib/payroll/record";
import { employeeDailyHours, employeeWeeklyHours } from "@/lib/reports/aggregations";
import { isAnnouncementVisibleTo } from "@/lib/services/announcementService";
import { useDataStore } from "@/lib/stores/data-store";
import {
  attendanceStatusLabel,
  employmentTypeLabel,
  formatDate,
  formatPeriod,
  formatTime,
  initials,
  leaveTypeLabel,
} from "@/lib/utils/format";
import type { Employee } from "@/types";

export function EmployeeDashboard({ employee }: { employee: Employee }) {
  const data = useDataStore();
  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const today = format(now, "yyyy-MM-dd");
  const monthRecords = data.attendanceRecords.filter(
    (item) => item.employeeId === employee.id && item.date >= monthStart && item.date <= today,
  );
  const recentAttendance = [...data.attendanceRecords]
    .filter((item) => item.employeeId === employee.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const leaves = [...data.leaveRequests]
    .filter((item) => item.employeeId === employee.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const holidays = [...data.holidays]
    .filter((item) => item.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const announcements = data.announcements
    .filter((item) => isAnnouncementVisibleTo(item, { role: "EMPLOYEE" }, employee))
    .slice(0, 3);
  const balance = data.leaveBalances.find((item) => item.employeeId === employee.id);
  const paidLeft = balance ? remainingPaidDays(balance) : 0;
  const payslips = [...data.payrollRecords]
    .filter((item) => item.employeeId === employee.id && isPayslipReleased(item))
    .sort((a, b) => b.period.localeCompare(a.period))
    .slice(0, 4);
  const dailyHours = employeeDailyHours(data.attendanceRecords, employee.id, now, 7);
  const weeklyHours = employeeWeeklyHours(data.attendanceRecords, employee.id, employee.dailyRequiredHours, now);
  const presentCount = monthRecords.filter((item) => item.status === "PRESENT" || item.status === "LATE" || item.status === "COMPLETED").length;
  const absentCount = monthRecords.filter((item) => item.status === "ABSENT").length;
  const leaveCount = monthRecords.filter((item) => item.status === "ON_LEAVE").length;
  const lateCount = monthRecords.filter((item) => item.status === "LATE" || item.lateMinutes > 0).length;

  return (
    <div className="space-y-5">
      <DashboardGreeting
        name={employee.fullName}
        subtitle={`${getDesignationName(data, employee.designationId)} · ${getDepartmentName(data, employee.departmentId)}`}
        actions={<AttendanceActionBar employeeId={employee.id} />}
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(300px,26rem)_minmax(0,1fr)]">
        <Card>
          <CardContent className="flex flex-col gap-5 p-6">
            <div className="flex items-start gap-4">
              <Avatar className="size-20 shrink-0">
                {employee.avatarUrl ? <AvatarImage src={employee.avatarUrl} alt={employee.fullName} /> : null}
                <AvatarFallback className="text-lg">{initials(employee.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{employee.fullName}</p>
                <p className="text-sm text-muted-foreground">
                  {getDesignationName(data, employee.designationId)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                    {employmentTypeLabel(employee.employmentType)}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                    {employee.employeeCode}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-3.5 shrink-0" /> {employee.phone}
              </p>
              <p className="flex items-center gap-2 truncate text-muted-foreground">
                <Mail className="size-3.5 shrink-0" /> {employee.workEmail}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" /> {employee.workLocation}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="size-3.5 shrink-0" /> Joined {formatDate(employee.joiningDate)}
              </p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <LinkButton href="/leave" className="flex-1">Apply leave</LinkButton>
              <LinkButton href="/payroll" variant="outline" className="flex-1">Salary slips</LinkButton>
            </div>
          </CardContent>
        </Card>

        <ChartCard title="Attendance summary" actions={<span className="text-xs text-muted-foreground">Last 7 days</span>} contentClassName="h-[196px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyHours} barCategoryGap="28%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                domain={[0, employee.dailyRequiredHours]}
                ticks={Array.from({ length: employee.dailyRequiredHours + 1 }, (_, hour) => hour).filter((hour) => hour % 3 === 0 || hour === employee.dailyRequiredHours)}
                width={28}
              />
              <Tooltip formatter={(value: number) => [`${value}h`, "Worked"]} />
              <Bar dataKey="hours" name="Worked hours" fill="var(--primary)" maxBarSize={42} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AttendanceControlCard employeeId={employee.id} compact />
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent attendance</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {recentAttendance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendance records yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">In</th>
                      <th className="pb-2 font-medium">Out</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAttendance.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="py-2">{formatDate(item.date)}</td>
                        <td className="py-2">{formatTime(item.clockIn)}</td>
                        <td className="py-2">{formatTime(item.clockOut)}</td>
                        <td className="py-2">{attendanceStatusLabel(item.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leave summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <LeaveBalanceRow label="Paid remaining" value={paidLeft} total={YEARLY_PAID_LEAVE_TOTAL} />
              <LeaveBalanceRow label="Casual leave" value={balance?.casual ?? 0} total={YEARLY_PAID_LEAVES.casual} />
              <LeaveBalanceRow label="Sick leave" value={balance?.sick ?? 0} total={YEARLY_PAID_LEAVES.sick} />
              <LeaveBalanceRow label="Privilege leave" value={balance?.privilege ?? 0} total={YEARLY_PAID_LEAVES.privilege} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)_minmax(260px,0.7fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Working hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyHours}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="scheduled" name="Scheduled" stroke="var(--chart-4)" strokeWidth={2} />
                  <Line type="monotone" dataKey="worked" name="Worked" stroke="var(--primary)" strokeWidth={2} />
                  <Line type="monotone" dataKey="average" name="Average" stroke="var(--chart-3)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Week</th>
                  <th className="pb-2 font-medium">Scheduled</th>
                  <th className="pb-2 font-medium">Worked</th>
                  <th className="pb-2 font-medium">Average</th>
                </tr>
              </thead>
              <tbody>
                {weeklyHours.map((item) => (
                  <tr key={item.label} className="border-t">
                    <td className="py-2">{item.label}</td>
                    <td className="py-2">{item.scheduled}h</td>
                    <td className="py-2">{item.worked}h</td>
                    <td className="py-2">{item.average}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">This month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <SummaryRow label="Present" value={presentCount} />
            <SummaryRow label="Absent" value={absentCount} />
            <SummaryRow label="On leave" value={leaveCount} />
            <SummaryRow label="Late" value={lateCount} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Salary slips</CardTitle>
            <Link href="/payroll" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {payslips.length === 0 ? (
              <p className="text-sm text-muted-foreground">No salary slips released yet.</p>
            ) : (
              payslips.map((item) => (
                <Link key={item.id} href="/payroll" className="flex items-center justify-between text-sm hover:text-primary">
                  <span>{formatPeriod(item.period)}</span>
                  <span className="text-muted-foreground">View</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My leave requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {leaves.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leave requests yet.</p>
            ) : (
              leaves.map((item) => (
                <Link key={item.id} href={`/leave/${item.id}`} className="flex items-center justify-between gap-3 rounded-lg hover:bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{leaveTypeLabel(item.type)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.startDate)} - {formatDate(item.endDate)}</p>
                  </div>
                  <LeaveStatusBadge status={item.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4" /> Upcoming holidays
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              <span className="flex items-center gap-2">
                <FileText className="size-4" /> Announcements
              </span>
              <Link href="/announcements" className="text-xs font-normal text-primary hover:underline">
                View all
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
            ) : (
              announcements.map((item) => (
                <Link key={item.id} href="/announcements" className="block rounded-lg hover:bg-muted/50">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{String(value).padStart(2, "0")}</span>
    </div>
  );
}

function LeaveBalanceRow({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? Math.min(value / total, 1) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value}/{total}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
