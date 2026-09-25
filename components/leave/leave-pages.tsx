"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { DatePicker } from "@/components/shared/date-range-picker";
import { PageHeader } from "@/components/shared/page-header";
import { LeaveStatusBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formFieldControlClass, formGridClass, formWideClass } from "@/lib/ui/form-styles";
import { remainingPaidDays, YEARLY_PAID_LEAVE_LABEL, YEARLY_PAID_LEAVE_TOTAL, YEARLY_PAID_LEAVES } from "@/lib/leave/policy";
import { daysBetweenInclusive, formatDate, formatDateTime, leaveTypeLabel, todayIsoDate } from "@/lib/utils/format";
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
  const router = useRouter();
  const data = useDataStore();
  const balance = leaveService.getBalance(employeeId);
  const today = todayIsoDate();
  const requests = [...data.leaveRequests]
    .filter((item) => item.employeeId === employeeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: { type: "CASUAL", startDate: today, endDate: today, isHalfDay: false, reason: "" },
  });
  const startDate = form.watch("startDate");

  async function onSubmit(values: LeaveFormValues) {
    setSaving(true);
    try {
      await leaveService.createLeaveRequest({
        employeeId,
        type: values.type,
        startDate: values.startDate,
        endDate: values.isHalfDay ? values.startDate : values.endDate,
        isHalfDay: values.isHalfDay,
        reason: values.reason,
        file,
      });
      toast.success("Leave request submitted.");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit leave request.");
    } finally {
      setSaving(false);
    }
  }

  const columns: DataTableColumn<LeaveRequest>[] = [
    {
      id: "date",
      header: "Date",
      accessor: (row) => row.startDate,
      cell: (row) => (
        <Link href={`/leave/${row.id}`} className="font-medium hover:text-primary">
          {formatDate(row.startDate)} - {formatDate(row.endDate)}
        </Link>
      ),
    },
    { id: "type", header: "Type", cell: (row) => leaveTypeLabel(row.type) },
    { id: "duration", header: "Duration", cell: (row) => (row.isHalfDay ? "Half day" : `${daysBetweenInclusive(row.startDate, row.endDate)} day(s)`) },
    {
      id: "reason",
      header: "Reason",
      cell: (row) => (
        <Link href={`/leave/${row.id}`} className="hover:text-primary">
          {row.reason}
        </Link>
      ),
    },
    { id: "status", header: "Status", cell: (row) => <LeaveStatusBadge status={row.status} /> },
    {
      id: "details",
      header: "Details",
      className: "w-[1%]",
      cell: (row) => (
        <Link href={`/leave/${row.id}`} className={buttonVariants({ variant: "outline", size: "icon-sm" })} aria-label="View leave details">
          <Eye className="size-4" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="My leaves" description={YEARLY_PAID_LEAVE_LABEL} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Balance title="Casual leave (CL)" value={balance.casual} entitlement={YEARLY_PAID_LEAVES.casual} />
        <Balance title="Sick leave (SL)" value={balance.sick} entitlement={YEARLY_PAID_LEAVES.sick} />
        <Balance title="Privilege leave (PL)" value={balance.privilege} entitlement={YEARLY_PAID_LEAVES.privilege} />
        <Balance title="Paid remaining" value={remainingPaidDays(balance)} entitlement={YEARLY_PAID_LEAVE_TOTAL} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Apply for leave</CardTitle></CardHeader>
        <CardContent>
          <form className={formGridClass} onSubmit={form.handleSubmit(onSubmit)}>
            <div>
              <Label>Leave type</Label>
              <NativeSelect className={formFieldControlClass} {...form.register("type")}>
                <option value="CASUAL">Casual Leave (CL)</option>
                <option value="SICK">Sick Leave (SL)</option>
                <option value="PRIVILEGE">Privilege Leave (PL)</option>
              </NativeSelect>
            </div>
            <div>
              <Label>Start date</Label>
              <Input type="date" min={today} className="mt-1.5" {...form.register("startDate")} />
              <FieldError message={form.formState.errors.startDate?.message} />
            </div>
            <div>
              <Label>End date</Label>
              <Input type="date" min={startDate || today} className="mt-1.5" {...form.register("endDate")} />
              <FieldError message={form.formState.errors.endDate?.message} />
            </div>
            <div className="flex h-10 items-center gap-2 md:mt-7">
              <input id="half" type="checkbox" {...form.register("isHalfDay")} />
              <Label htmlFor="half">Half day</Label>
            </div>
            <div className="md:col-span-2">
              <Label>Attachment</Label>
              <Input
                className="mt-1.5"
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">Optional PDF, Word, or image up to 10 MB.</p>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full md:w-auto" disabled={saving}>
                {saving ? "Submitting…" : "Submit request"}
              </Button>
            </div>
            <div className={formWideClass}>
              <Label>Reason</Label>
              <Textarea className="mt-1.5" {...form.register("reason")} />
              <FieldError message={form.formState.errors.reason?.message} />
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
    {
      id: "dates",
      header: "Dates",
      cell: (row) => (
        <Link href={`/leave/${row.id}`} className="hover:text-primary">
          {formatDate(row.startDate)} - {formatDate(row.endDate)}
        </Link>
      ),
    },
    { id: "reason", header: "Reason", cell: (row) => row.reason },
    { id: "status", header: "Status", cell: (row) => <LeaveStatusBadge status={row.status} /> },
    {
      id: "actions",
      header: "Actions",
      cell: (row) =>
        row.status === "PENDING" ? (
          <div className="flex gap-2">
            <Link href={`/leave/${row.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              View
            </Link>
            <Button size="sm" onClick={() => { leaveService.updateLeaveStatus(row.id, "APPROVED", reviewerId); toast.success("Leave approved."); }}>
              Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setRejectId(row.id)}>Reject</Button>
          </div>
        ) : (
          <Link href={`/leave/${row.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            View
          </Link>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Leave management" description={YEARLY_PAID_LEAVE_LABEL} />
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

export function LeaveDetailPage({ id }: { id: string }) {
  const user = useAuthStore((state) => state.user);
  const data = useDataStore();
  const request = leaveService.getLeaveById(id);
  const employee = user ? getEmployeeByUser(data, user.id) : undefined;

  if (!user) return null;
  if (!request) {
    return <p className="text-sm text-muted-foreground">Leave request not found.</p>;
  }
  if (user.role !== "MANAGEMENT" && request.employeeId !== employee?.id) {
    return <p className="text-sm text-muted-foreground">You can only view your own leave requests.</p>;
  }

  const owner = data.employees.find((item) => item.id === request.employeeId);
  const reviewer = request.reviewedBy ? data.users.find((item) => item.id === request.reviewedBy) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave details"
        description={`${leaveTypeLabel(request.type)} · ${formatDate(request.startDate)} - ${formatDate(request.endDate)}`}
        actions={
          <Link href="/leave" className={buttonVariants({ variant: "outline" })}>
            Back to leaves
          </Link>
        }
      />
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          {user.role === "MANAGEMENT" ? (
            <Detail label="Employee" value={owner?.fullName ?? getEmployeeName(data, request.employeeId)} />
          ) : null}
          <Detail label="Type" value={leaveTypeLabel(request.type)} />
          <Detail label="Dates" value={`${formatDate(request.startDate)} - ${formatDate(request.endDate)}`} />
          <Detail label="Duration" value={request.isHalfDay ? "Half day" : `${daysBetweenInclusive(request.startDate, request.endDate)} day(s)`} />
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <div className="mt-1"><LeaveStatusBadge status={request.status} /></div>
          </div>
          <Detail label="Submitted" value={formatDateTime(request.createdAt)} />
          {reviewer ? <Detail label="Reviewed by" value={reviewer.name} /> : null}
          {request.reviewedAt ? <Detail label="Reviewed on" value={formatDateTime(request.reviewedAt)} /> : null}
          <div className="sm:col-span-2">
            <p className="text-sm text-muted-foreground">Reason</p>
            <p className="mt-1 text-sm">{request.reason}</p>
          </div>
          {request.status === "REJECTED" ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:col-span-2">
              <p className="text-sm font-medium text-destructive">Rejection reason</p>
              <p className="mt-1 text-sm">{request.rejectionReason || "No reason was provided."}</p>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <p className="text-sm text-muted-foreground">Attachment</p>
            {request.hasAttachment ? (
              <a
                href={leaveService.leaveAttachmentHref(request.id)}
                target="_blank"
                rel="noreferrer"
                className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-2`}
              >
                View {request.attachmentName || "document"}
              </a>
            ) : (
              <p className="mt-1 text-sm">No attachment uploaded.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function Balance({ title, value, entitlement }: { title: string; value: number; entitlement: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-semibold">{value} days</p>
        <p className="mt-1 text-xs text-muted-foreground">of {entitlement} yearly</p>
      </CardContent>
    </Card>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}
