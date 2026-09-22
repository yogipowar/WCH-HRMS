"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ActiveBadge, LiveStatusBadge } from "@/components/shared/status-badge";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LinkButton } from "@/components/shared/link-button";
import { Button } from "@/components/ui/button";
import { employeeService } from "@/lib/services/employeeService";
import { getDepartmentName, getDesignationName, toLiveStatus } from "@/lib/lookups";
import { attendanceService } from "@/lib/services/attendanceService";
import { useDataStore } from "@/lib/stores/data-store";
import { currency, employmentTypeLabel, formatDate, initials } from "@/lib/utils/format";
import type { Employee } from "@/types";

export function EmployeesListPage() {
  const data = useDataStore();
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState("all");
  const [status, setStatus] = useState("all");

  const employees = useMemo(() => {
    return data.employees.filter((item) => {
      if (departmentId !== "all" && item.departmentId !== departmentId) return false;
      if (status !== "all" && item.status !== status) return false;
      return true;
    });
  }, [data.employees, departmentId, status]);

  const columns = useMemo<DataTableColumn<Employee>[]>(
    () => [
      { id: "code", header: "Employee ID", sortable: true, accessor: (row) => row.employeeCode, cell: (row) => row.employeeCode },
      {
        id: "name",
        header: "Name",
        sortable: true,
        accessor: (row) => row.fullName,
        cell: (row) => (
          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              <AvatarFallback>{initials(row.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{row.fullName}</p>
              <p className="text-xs text-muted-foreground">{row.workEmail}</p>
            </div>
          </div>
        ),
      },
      { id: "phone", header: "Phone", accessor: (row) => row.phone, cell: (row) => row.phone },
      { id: "department", header: "Department", sortable: true, accessor: (row) => getDepartmentName(data, row.departmentId), cell: (row) => getDepartmentName(data, row.departmentId) },
      { id: "designation", header: "Designation", accessor: (row) => getDesignationName(data, row.designationId), cell: (row) => getDesignationName(data, row.designationId) },
      { id: "joining", header: "Joining date", accessor: (row) => row.joiningDate, cell: (row) => formatDate(row.joiningDate) },
      { id: "salary", header: "Salary", sortable: true, accessor: (row) => row.basicSalary + row.allowances, cell: (row) => currency(row.basicSalary + row.allowances) },
      { id: "type", header: "Type", accessor: (row) => row.employmentType, cell: (row) => employmentTypeLabel(row.employmentType) },
      { id: "status", header: "Status", cell: (row) => <ActiveBadge active={row.status === "ACTIVE"} /> },
      {
        id: "attendance",
        header: "Attendance",
        cell: (row) => {
          const record = attendanceService.getTodayAttendance(row.id);
          return <LiveStatusBadge status={toLiveStatus(record.state, record.status)} />;
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: (row) => (
          <div className="flex gap-2">
            <LinkButton href={`/employees/${row.id}`} size="sm" variant="outline">
              Profile
            </LinkButton>
            <LinkButton href={`/employees/${row.id}?edit=1`} size="sm" variant="outline">
              Edit
            </LinkButton>
            <Button size="sm" variant="destructive" onClick={() => setDeactivateId(row.id)}>
              Deactivate
            </Button>
          </div>
        ),
      },
    ],
    [data],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Manage the Web Create Hub team from a single directory."
        actions={<LinkButton href="/employees/new">Add employee</LinkButton>}
      />
      <div className="flex flex-wrap gap-3">
        <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
          <option value="all">All departments</option>
          {data.departments.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>
      <DataTable
        data={employees}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Search employees..."
        searchFilter={(row, query) =>
          `${row.fullName} ${row.workEmail} ${row.employeeCode} ${row.phone}`.toLowerCase().includes(query)
        }
      />
      <ConfirmationDialog
        open={Boolean(deactivateId)}
        onOpenChange={(open) => !open && setDeactivateId(null)}
        title="Deactivate employee?"
        description="They will no longer appear as an active team member. This is a frontend-only status change."
        confirmLabel="Deactivate"
        destructive
        onConfirm={() => {
          if (deactivateId) {
            employeeService.deactivateEmployee(deactivateId);
            toast.success("Employee deactivated.");
          }
        }}
      />
    </div>
  );
}
