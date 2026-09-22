"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { DatePicker } from "@/components/shared/date-range-picker";
import { PageHeader } from "@/components/shared/page-header";
import { LeaveStatusBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formFieldControlClass, formGridClass, formWideClass } from "@/lib/ui/form-styles";
import { daysBetweenInclusive, formatDate, leaveTypeLabel } from "@/lib/utils/format";
import { getDepartmentName, getEmployeeByUser, getEmployeeName } from "@/lib/lookups";
import { leaveService } from "@/lib/services/leaveService";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";
import { leaveFormSchema, type LeaveFormValues } from "@/lib/validations/leave";
import type { LeaveRequest } from "@/types";

export function LeavePage() {
  const user = useAuthStore((state) => state.user);
  const data = useDataStore();
  if (!user) return null;
  if (user.role === "MANAGEMENT") {
    return <ManagementLeave data={data} reviewerId={user.id} />;
  }
  const employee = getEmployeeByUser(data, user.id);
  if (!employee) return <p className="text-sm text-muted-foreground">No employee profile found.</p>;
  return <EmployeeLeave employeeId={employee.id} />;
}

function EmployeeLeave({ employeeId }: { employeeId: string }) {
  const data = useDataStore();
  const balance = leaveService.getBalance(employeeId);
  const requests = data.leaveRequests.filter((item) => item.employeeId === employeeId);
  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: { type: "CASUAL", startDate: "", endDate: "", isHalfDay: false, reason: "", attachmentName: "" },
  });

  function onSubmit(values: LeaveFormValues) {
    leaveService.createLeaveRequest({
      employeeId,
      type: values.type,
      startDate: values.startDate,
      endDate: values.endDate,
      isHalfDay: values.isHalfDay,
      reason: values.reason,
      attachmentName: values.attachmentName || null,
    });
    toast.success("Leave request submitted.");
    form.reset();
  }

  const columns: DataTableColumn<LeaveRequest>[] = [
    { id: "date", header: "Date", accessor: (row) => row.startDate, cell: (row) => `${formatDate(row.startDate)} - ${formatDate(row.endDate)}` },
    { id: "type", header: "Type", cell: (row) => leaveTypeLabel(row.type) },
    { id: "duration", header: "Duration", cell: (row) => (row.isHalfDay ? "Half day" : `${daysBetweenInclusive(row.startDate, row.endDate)} day(s)`) },
    { id: "reason", header: "Reason", cell: (row) => row.reason },
    { id: "status", header: "Status", cell: (row) => <LeaveStatusBadge status={row.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="My leaves" description="Check your balance and apply for time off." />
      <div className="grid gap-3 sm:grid-cols-4">
        <Balance title="Casual leave" value={balance.casual} />
        <Balance title="Sick leave" value={balance.sick} />
        <Balance title="Earned leave" value={balance.earned} />
        <Balance title="Unpaid leave" value={balance.unpaid} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Apply for leave</CardTitle></CardHeader>
        <CardContent>
          <form className={formGridClass} onSubmit={form.handleSubmit(onSubmit)}>
            <div>
              <Label>Leave type</Label>
              <NativeSelect className={formFieldControlClass} {...form.register("type")}>
                <option value="CASUAL">Casual Leave</option>
                <option value="SICK">Sick Leave</option>
                <option value="EARNED">Earned Leave</option>
                <option value="UNPAID">Unpaid Leave</option>
                <option value="OTHER">Other</option>
              </NativeSelect>
            </div>
            <div>
              <Label>Start date</Label>
              <Input type="date" className="mt-1.5" {...form.register("startDate")} />
              <Error message={form.formState.errors.startDate?.message} />
            </div>
            <div>
              <Label>End date</Label>
              <Input type="date" className="mt-1.5" {...form.register("endDate")} />
              <Error message={form.formState.errors.endDate?.message} />
            </div>
            <div className="flex h-10 items-center gap-2 md:mt-7">
              <input id="half" type="checkbox" {...form.register("isHalfDay")} />
              <Label htmlFor="half">Half day</Label>
            </div>
            <div>
              <Label>Attachment name</Label>
              <Input className="mt-1.5" placeholder="optional-file.pdf" {...form.register("attachmentName")} />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full md:w-auto">Submit request</Button>
            </div>
            <div className={formWideClass}>
              <Label>Reason</Label>
              <Textarea className="mt-1.5" {...form.register("reason")} />
              <Error message={form.formState.errors.reason?.message} />
            </div>
          </form>
        </CardContent>
      </Card>
      <DataTable data={requests} columns={columns} rowKey={(row) => row.id} searchPlaceholder="Search leave history..." />
    </div>
  );
}

const selectClass = "h-10 rounded-lg border border-input bg-background px-3 text-sm";

function ManagementLeave({ data, reviewerId }: { data: ReturnType<typeof useDataStore.getState>; reviewerId: string }) {
  const [status, setStatus] = useState("PENDING");
  const [departmentId, setDepartmentId] = useState("all");
  const [date, setDate] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const rows = useMemo(() => {
    return data.leaveRequests.filter((item) => {
      if (status !== "ALL" && item.status !== status) return false;
      if (date && (item.startDate > date || item.endDate < date)) return false;
      if (departmentId !== "all") {
        const employee = data.employees.find((entry) => entry.id === item.employeeId);
        if (employee?.departmentId !== departmentId) return false;
      }
      return true;
    });
  }, [data.employees, data.leaveRequests, date, departmentId, status]);

  const columns: DataTableColumn<LeaveRequest>[] = [
    { id: "employee", header: "Employee", accessor: (row) => getEmployeeName(data, row.employeeId), cell: (row) => (
      <Link href={`/employees/${row.employeeId}`} className="font-medium hover:text-primary">
        {getEmployeeName(data, row.employeeId)}
      </Link>
    ) },
    { id: "department", header: "Department", cell: (row) => getDepartmentName(data, data.employees.find((item) => item.id === row.employeeId)?.departmentId ?? "") },
    { id: "type", header: "Type", cell: (row) => leaveTypeLabel(row.type) },
    { id: "dates", header: "Dates", cell: (row) => `${formatDate(row.startDate)} - ${formatDate(row.endDate)}` },
    { id: "reason", header: "Reason", cell: (row) => row.reason },
    { id: "status", header: "Status", cell: (row) => <LeaveStatusBadge status={row.status} /> },
    {
      id: "actions",
      header: "Actions",
      cell: (row) =>
        row.status === "PENDING" ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { leaveService.updateLeaveStatus(row.id, "APPROVED", reviewerId); toast.success("Leave approved."); }}>
              Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setRejectId(row.id)}>Reject</Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">{row.rejectionReason ?? "—"}</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Leave management" description="Approve or reject employee leave requests." />
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Search leave requests..."
        toolbar={
          <>
            <DatePicker value={date} onChange={setDate} placeholder="All dates" />
            {date ? (
              <Button type="button" variant="outline" className="h-10" onClick={() => setDate("")}>
                All dates
              </Button>
            ) : null}
            <select className={selectClass} value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="all">All departments</option>
              {data.departments.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <select className={selectClass} value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="ALL">All</option>
            </select>
          </>
        }
      />
      <ConfirmationDialog
        open={Boolean(rejectId)}
        onOpenChange={(open) => !open && setRejectId(null)}
        title="Reject leave request?"
        confirmLabel="Reject"
        destructive
        description={
          <div className="space-y-2">
            <p>Please provide a rejection reason.</p>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
        }
        onConfirm={() => {
          if (!reason.trim()) {
            toast.error("Rejection reason is required.");
            return;
          }
          if (rejectId) {
            leaveService.updateLeaveStatus(rejectId, "REJECTED", reviewerId, reason);
            toast.success("Leave rejected.");
            setReason("");
          }
        }}
      />
    </div>
  );
}

function Balance({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-semibold">{value} days</p>
      </CardContent>
    </Card>
  );
}

function Error({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

