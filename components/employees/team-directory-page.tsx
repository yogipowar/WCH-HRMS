"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ActiveBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { EmployeeAvatar } from "@/components/shared/employee-avatar";
import { LinkButton } from "@/components/shared/link-button";
import { formatEmployeeDisplayName } from "@/lib/employee/display";
import { getDepartmentName, getDesignationName } from "@/lib/lookups";
import { useDataStore } from "@/lib/stores/data-store";
import { employmentTypeLabel, formatDate } from "@/lib/utils/format";
import type { Employee } from "@/types";

export function TeamDirectoryPage() {
  const data = useDataStore();
  const [departmentId, setDepartmentId] = useState("all");

  const employees = useMemo(() => {
    return data.employees
      .filter((item) => item.status === "ACTIVE")
      .filter((item) => departmentId === "all" || item.departmentId === departmentId)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [data.employees, departmentId]);

  const columns = useMemo<DataTableColumn<Employee>[]>(
    () => [
      {
        id: "code",
        header: "Employee ID",
        sortable: true,
        accessor: (row) => row.employeeCode,
        cell: (row) => row.employeeCode,
      },
      {
        id: "name",
        header: "Name",
        sortable: true,
        accessor: (row) => formatEmployeeDisplayName(row.fullName, row.gender),
        cell: (row) => (
          <div className="flex items-center gap-2">
            <EmployeeAvatar employee={row} className="size-8" />
            <div>
              <p className="font-medium">{formatEmployeeDisplayName(row.fullName, row.gender)}</p>
              <p className="text-xs text-muted-foreground">{row.workEmail}</p>
            </div>
          </div>
        ),
      },
      {
        id: "department",
        header: "Department",
        sortable: true,
        accessor: (row) => getDepartmentName(data, row.departmentId),
        cell: (row) => getDepartmentName(data, row.departmentId),
      },
      {
        id: "designation",
        header: "Designation",
        accessor: (row) => getDesignationName(data, row.designationId),
        cell: (row) => getDesignationName(data, row.designationId),
      },
      {
        id: "type",
        header: "Type",
        accessor: (row) => row.employmentType,
        cell: (row) => employmentTypeLabel(row.employmentType),
      },
      {
        id: "joining",
        header: "Joining date",
        accessor: (row) => row.joiningDate,
        cell: (row) => formatDate(row.joiningDate),
      },
      {
        id: "location",
        header: "Location",
        accessor: (row) => row.workLocation,
        cell: (row) => row.workLocation,
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => <ActiveBadge active={row.status === "ACTIVE"} />,
      },
      {
        id: "actions",
        header: "Actions",
        cell: (row) => (
          <LinkButton href={`/team/${row.id}`} size="sm" variant="outline">
            View
          </LinkButton>
        ),
      },
    ],
    [data],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Your Web Create Hub teammates. Salary and payroll details are not shown here."
      />
      <div className="flex flex-wrap gap-3">
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
      </div>
      <DataTable
        data={employees}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Search team..."
        searchFilter={(row, query) =>
          `${row.fullName} ${row.workEmail} ${row.employeeCode} ${row.phone}`.toLowerCase().includes(query)
        }
      />
    </div>
  );
}
