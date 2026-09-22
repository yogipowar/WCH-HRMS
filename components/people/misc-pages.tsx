"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { AnnouncementStatusBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BrandLogo } from "@/components/brand/logo";
import { announcementService } from "@/lib/services/announcementService";
import { documentService } from "@/lib/services/documentService";
import { notificationService } from "@/lib/services/notificationService";
import { payrollService } from "@/lib/services/payrollService";
import { settingsService } from "@/lib/services/settingsService";
import { getEmployeeByUser, getEmployeeName } from "@/lib/lookups";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";
import { announcementFormSchema, type AnnouncementFormValues } from "@/lib/validations/announcement";
import { saturdayWeekLabel, workWeekPolicyLabel } from "@/lib/attendance/work-calendar";
import { YEARLY_PAID_LEAVE_LABEL } from "@/lib/leave/policy";
import { currency, documentTypeLabel, formatDate, formatDateTime, formatPeriod } from "@/lib/utils/format";
import type { Announcement, EmployeeDocument, PayrollRecord, SaturdayWeek, Weekday } from "@/types";
import { CORE_WORK_DAYS, DEFAULT_SATURDAY_OFF_WEEKS, SATURDAY_WEEKS } from "@/types";
import { NativeSelect } from "@/components/ui/native-select";
import { formDialogClass, formFieldControlClass, formGridClass, formWideClass } from "@/lib/ui/form-styles";
import { AppearanceThemePanel } from "@/components/layout/theme-picker";

export function PayrollPage() {
  const user = useAuthStore((state) => state.user);
  const data = useDataStore();
  const isAdmin = user?.role === "MANAGEMENT";
  const employee = getEmployeeByUser(data, user?.id ?? "");
  const [period, setPeriod] = useState(payrollService.getCurrentPeriod());
  const [departmentId, setDepartmentId] = useState("all");
  const [status, setStatus] = useState("all");

  const allRecords = data.payrollRecords;
  const source = isAdmin ? allRecords : allRecords.filter((item) => item.employeeId === employee?.id);
  const periods = useMemo(
    () => [...new Set(source.map((item) => item.period))].sort((a, b) => b.localeCompare(a)),
    [source],
  );

  const records = useMemo(() => {
    return source.filter((item) => {
      if (period !== "all" && item.period !== period) return false;
      if (status !== "all" && item.status !== status) return false;
      if (isAdmin && departmentId !== "all") {
        const match = data.employees.find((employeeItem) => employeeItem.id === item.employeeId);
        if (match?.departmentId !== departmentId) return false;
      }
      return true;
    });
  }, [data.employees, departmentId, isAdmin, period, source, status]);

  const columns: DataTableColumn<PayrollRecord>[] = [
    { id: "employee", header: "Employee", accessor: (row) => getEmployeeName(data, row.employeeId), cell: (row) => (
      <Link href={`/employees/${row.employeeId}`} className="font-medium hover:text-primary">
        {getEmployeeName(data, row.employeeId)}
      </Link>
    ) },
    { id: "period", header: "Period", accessor: (row) => row.period, cell: (row) => formatPeriod(row.period) },
    { id: "basic", header: "Basic", cell: (row) => currency(row.basicSalary) },
    { id: "gross", header: "Gross", cell: (row) => currency(row.grossSalary) },
    { id: "allowances", header: "Allowances", cell: (row) => currency(row.allowances) },
    { id: "deductions", header: "Deductions", cell: (row) => currency(row.deductions) },
    { id: "net", header: "Net", cell: (row) => currency(row.netSalary) },
    { id: "status", header: "Status", cell: (row) => row.status },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description={
          isAdmin
            ? "Review the current run and previous monthly payrolls."
            : "Your salary, allowances, deductions, and payslips."
        }
      />
      <div className="flex flex-wrap gap-3">
        <select
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
        >
          <option value="all">All periods</option>
          {periods.map((item) => (
            <option key={item} value={item}>
              {formatPeriod(item)}
            </option>
          ))}
        </select>
        {isAdmin ? (
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
          >
            <option value="all">All departments</option>
            {data.departments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        ) : null}
        <select
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="PROCESSED">Processed</option>
          <option value="PAID">Paid</option>
          <option value="DRAFT">Draft</option>
        </select>
      </div>
      <DataTable data={records} columns={columns} rowKey={(row) => row.id} searchPlaceholder="Search payroll..." />
    </div>
  );
}

export function AnnouncementsPage() {
  const user = useAuthStore((state) => state.user);
  const announcements = useDataStore((state) => state.announcements);
  const visible = user?.role === "MANAGEMENT" ? announcements : announcements.filter((item) => item.status === "PUBLISHED");
  const [open, setOpen] = useState(false);
  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: { title: "", description: "", audience: "ALL", publishDate: "", status: "DRAFT" },
  });

  const columns: DataTableColumn<Announcement>[] = [
    { id: "title", header: "Title", accessor: (row) => row.title, cell: (row) => row.title },
    { id: "audience", header: "Audience", cell: (row) => row.audience },
    { id: "date", header: "Publish date", cell: (row) => formatDate(row.publishDate) },
    { id: "status", header: "Status", cell: (row) => <AnnouncementStatusBadge status={row.status} /> },
    ...(user?.role === "MANAGEMENT"
      ? [
          {
            id: "actions",
            header: "Actions",
            cell: (row: Announcement) => (
              <div className="flex gap-2">
                {row.status !== "PUBLISHED" ? (
                  <Button size="sm" onClick={() => { announcementService.updateAnnouncement(row.id, { status: "PUBLISHED" }); toast.success("Announcement published."); }}>
                    Publish
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => { announcementService.updateAnnouncement(row.id, { status: "ARCHIVED" }); toast.success("Announcement archived."); }}>
                    Archive
                  </Button>
                )}
              </div>
            ),
          } satisfies DataTableColumn<Announcement>,
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Company-wide updates."
        actions={user?.role === "MANAGEMENT" ? <Button onClick={() => setOpen(true)}>New announcement</Button> : null}
      />
      <DataTable data={visible} columns={columns} rowKey={(row) => row.id} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={formDialogClass}>
          <DialogHeader><DialogTitle>Create announcement</DialogTitle></DialogHeader>
          <form
            className={formGridClass}
            onSubmit={form.handleSubmit((values) => {
              announcementService.createAnnouncement({
                ...values,
                departmentId: values.departmentId || null,
                createdBy: user?.id ?? "user-admin",
              });
              toast.success("Announcement saved.");
              setOpen(false);
            })}
          >
            <div>
              <Label>Title</Label>
              <Input className="mt-1.5" {...form.register("title")} />
            </div>
            <div>
              <Label>Audience</Label>
              <NativeSelect className={formFieldControlClass} {...form.register("audience")}>
                <option value="ALL">All</option>
                <option value="EMPLOYEE">Employees</option>
                <option value="MANAGEMENT">Management</option>
                <option value="DEPARTMENT">Department</option>
              </NativeSelect>
            </div>
            <div>
              <Label>Publish date</Label>
              <Input className="mt-1.5" type="date" {...form.register("publishDate")} />
            </div>
            <div>
              <Label>Status</Label>
              <NativeSelect className={formFieldControlClass} {...form.register("status")}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </NativeSelect>
            </div>
            <div className={formWideClass}>
              <Label>Description</Label>
              <Textarea className="mt-1.5" {...form.register("description")} />
            </div>
            <div className="flex items-end">
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function NotificationsPage() {
  const user = useAuthStore((state) => state.user);
  const notifications = useDataStore((state) => state.notifications);
  const items = notifications.filter((item) => item.userId === user?.id);
  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Leave, attendance, and company updates."
        actions={<Button variant="outline" onClick={() => { notificationService.markAllAsRead(user.id); toast.success("All notifications marked as read."); }}>Mark all as read</Button>}
      />
      <div className="space-y-3">
        {items.length === 0 ? <p className="text-sm text-muted-foreground">No notifications.</p> : null}
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="w-full rounded-xl border bg-card p-4 text-left shadow-sm"
            onClick={() => notificationService.markAsRead(item.id)}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{item.title}</p>
              {!item.read ? <span className="text-xs text-primary">Unread</span> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
            <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export function DocumentsPage() {
  const user = useAuthStore((state) => state.user);
  const data = useDataStore();
  const employee = user ? getEmployeeByUser(data, user.id) : undefined;
  const documents =
    user?.role === "MANAGEMENT" ? data.documents : data.documents.filter((item) => item.employeeId === employee?.id);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<EmployeeDocument["type"]>("OTHER");
  const [employeeId, setEmployeeId] = useState(employee?.id ?? data.employees[0]?.id ?? "");

  const columns: DataTableColumn<EmployeeDocument>[] = [
    { id: "employee", header: "Employee", cell: (row) => getEmployeeName(data, row.employeeId) },
    { id: "name", header: "Document", accessor: (row) => row.name, cell: (row) => row.name },
    { id: "type", header: "Type", cell: (row) => documentTypeLabel(row.type) },
    { id: "file", header: "File", cell: (row) => row.fileName },
    { id: "expiry", header: "Expiry", cell: (row) => (row.expiryDate ? formatDate(row.expiryDate) : "—") },
    { id: "status", header: "Status", cell: (row) => row.status },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Frontend document records. File storage will be added with the backend."
        actions={<Button onClick={() => setOpen(true)}>Add document record</Button>}
      />
      <DataTable data={documents} columns={columns} rowKey={(row) => row.id} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={formDialogClass}>
          <DialogHeader><DialogTitle>Add document</DialogTitle></DialogHeader>
          <form
            className={formGridClass}
            onSubmit={(event) => {
              event.preventDefault();
              const selectedEmployeeId = user?.role === "MANAGEMENT" ? employeeId : employee?.id;
              if (!selectedEmployeeId) return;
              documentService.createDocument({
                employeeId: selectedEmployeeId,
                type,
                name,
                fileName: `${name.toLowerCase().replace(/\s+/g, "-")}.pdf`,
                expiryDate: null,
                status: "PENDING",
              });
              toast.success("Document record added.");
              setOpen(false);
              setName("");
            }}
          >
            {user?.role === "MANAGEMENT" ? (
              <div>
                <Label>Employee</Label>
                <NativeSelect className={formFieldControlClass} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required>
                  {data.employees.map((item) => (
                    <option key={item.id} value={item.id}>{item.fullName}</option>
                  ))}
                </NativeSelect>
              </div>
            ) : null}
            <div>
              <Label>Name</Label>
              <Input className="mt-1.5" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div>
              <Label>Type</Label>
              <NativeSelect className={formFieldControlClass} value={type} onChange={(event) => setType(event.target.value as EmployeeDocument["type"])}>
                <option value="OFFER_LETTER">Offer letter</option>
                <option value="ID_PROOF">ID proof</option>
                <option value="RESUME">Resume</option>
                <option value="CONTRACT">Contract</option>
                <option value="CERTIFICATE">Certificate</option>
                <option value="OTHER">Other</option>
              </NativeSelect>
            </div>
            <div className="flex items-end">
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function SettingsPage() {
  const settings = useDataStore((state) => state.settings);
  const [draft, setDraft] = useState({
    ...settings,
    sundayOff: settings.sundayOff ?? true,
    saturdayOffWeeks: settings.saturdayOffWeeks ?? DEFAULT_SATURDAY_OFF_WEEKS,
  });

  function toggleDay(day: Weekday) {
    setDraft((current) => ({
      ...current,
      workDays: current.workDays.includes(day)
        ? current.workDays.filter((item) => item !== day)
        : [...current.workDays, day],
    }));
  }

  function toggleSaturdayOff(week: SaturdayWeek) {
    setDraft((current) => ({
      ...current,
      saturdayOffWeeks: current.saturdayOffWeeks.includes(week)
        ? current.saturdayOffWeeks.filter((item) => item !== week)
        : [...current.saturdayOffWeeks, week].sort((a, b) => a - b),
    }));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Company, attendance, schedule, and appearance configuration." />
      <Card>
        <CardHeader><CardTitle className="text-base">Company information</CardTitle></CardHeader>
        <CardContent className={formGridClass}>
          <div className={formWideClass}><BrandLogo className="max-h-12" /></div>
          <Field label="Company name"><Input value={draft.companyName} onChange={(event) => setDraft({ ...draft, companyName: event.target.value })} /></Field>
          <Field label="Email"><Input value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></Field>
          <Field label="Phone"><Input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></Field>
          <Field label="Website"><Input value={draft.website} onChange={(event) => setDraft({ ...draft, website: event.target.value })} /></Field>
          <Field label="Address" className="md:col-span-2"><Input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} /></Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Attendance & work schedule</CardTitle></CardHeader>
        <CardContent className={formGridClass}>
          <Field label="Default daily hours"><Input type="number" value={draft.defaultDailyHours} onChange={(event) => setDraft({ ...draft, defaultDailyHours: Number(event.target.value) })} /></Field>
          <Field label="Work start"><Input type="time" value={draft.workStartTime} onChange={(event) => setDraft({ ...draft, workStartTime: event.target.value })} /></Field>
          <Field label="Late after (minutes)"><Input type="number" value={draft.lateAfterMinutes} onChange={(event) => setDraft({ ...draft, lateAfterMinutes: Number(event.target.value) })} /></Field>
          <div className={formWideClass}>
            <p className="mb-2 text-sm font-medium">Working weekdays</p>
            <div className="flex flex-wrap gap-2">
              {CORE_WORK_DAYS.map((day) => (
                <Button key={day} type="button" variant={draft.workDays.includes(day) ? "default" : "outline"} onClick={() => toggleDay(day)}>
                  {day.slice(0, 3)}
                </Button>
              ))}
            </div>
          </div>
          <div className={formWideClass}>
            <p className="mb-2 text-sm font-medium">Saturday weekly offs</p>
            <p className="mb-3 text-sm text-muted-foreground">Selected Saturdays are off. Unselected Saturdays are working days.</p>
            <div className="flex flex-wrap gap-2">
              {SATURDAY_WEEKS.map((week) => (
                <Button key={week} type="button" variant={draft.saturdayOffWeeks.includes(week) ? "default" : "outline"} onClick={() => toggleSaturdayOff(week)}>
                  {saturdayWeekLabel(week)}
                </Button>
              ))}
            </div>
          </div>
          <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${formWideClass}`}>
            <div>
              <p className="text-sm font-medium">Sunday weekly off</p>
              <p className="text-sm text-muted-foreground">Every Sunday is a weekly off.</p>
            </div>
            <Switch
              checked={draft.sundayOff}
              onCheckedChange={(checked) =>
                setDraft({
                  ...draft,
                  sundayOff: checked,
                  workDays: checked
                    ? draft.workDays.filter((day) => day !== "SUNDAY")
                    : draft.workDays.includes("SUNDAY")
                      ? draft.workDays
                      : [...draft.workDays, "SUNDAY"],
                })
              }
            />
          </div>
          <p className={`${formWideClass} text-sm text-muted-foreground`}>Current policy: {workWeekPolicyLabel(draft)}.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Yearly paid leave</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-medium">{YEARLY_PAID_LEAVE_LABEL}</p>
          <p className="text-muted-foreground">
            Every employee receives 15 paid days each year: 6 casual leave, 6 sick leave, and 3 privilege leave.
            Unpaid leave is only used if paid balance is exhausted.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
        <CardContent>
          <AppearanceThemePanel />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm">Attendance reminders (frontend preference)</p>
          <Switch defaultChecked />
        </CardContent>
      </Card>
      <Button
        onClick={() => {
          settingsService.updateSettings({
            ...draft,
            workDays: draft.workDays.includes("SATURDAY") ? draft.workDays : [...draft.workDays, "SATURDAY"],
          });
          toast.success("Settings saved for this demo session.");
        }}
      >
        Save settings
      </Button>
    </div>
  );
}

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const data = useDataStore();
  const employee = user ? getEmployeeByUser(data, user.id) : undefined;
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="My profile" description="Account information for the current demo user." />
      <Card>
        <CardContent className={`${formGridClass} p-5`}>
          <div className={formWideClass}><BrandLogo className="max-h-10" /></div>
          <Field label="Name"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field label="Email"><Input value={user.email} readOnly /></Field>
          <Field label="Phone"><Input value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
          <Field label="Role"><Input value={user.role === "MANAGEMENT" ? "Management / Admin" : "Employee"} readOnly /></Field>
          {employee ? (
            <>
              <Field label="Employee ID"><Input value={employee.employeeCode} readOnly /></Field>
              <Field label="Joining date"><Input value={employee.joiningDate} readOnly /></Field>
            </>
          ) : null}
        </CardContent>
      </Card>
      <Button onClick={() => toast.success("Profile updated in this demo session.")}>Save profile</Button>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5">{label}</Label>
      {children}
    </div>
  );
}
