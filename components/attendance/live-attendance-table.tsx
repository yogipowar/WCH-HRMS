"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { LinkButton } from "@/components/shared/link-button";
import { LiveStatusBadge } from "@/components/shared/status-badge";
import { formatDuration } from "@/lib/attendance/calculations";
import { toLiveStatus } from "@/lib/lookups";
import type { LiveAttendanceRow } from "@/lib/reports/aggregations";
import { formatTime, liveStatusLabel } from "@/lib/utils/format";

export function LiveAttendanceTable({
  rows,
  showActions = false,
  unboxed = false,
  toolbar,
}: {
  rows: LiveAttendanceRow[];
  showActions?: boolean;
  unboxed?: boolean;
  toolbar?: React.ReactNode;
}) {
  const columns: DataTableColumn<LiveAttendanceRow>[] = [
    {
      id: "employee",
      header: "Employee",
      sortable: true,
      accessor: (row) => row.employee.fullName,
      cell: (row) => (
        <Link href={`/employees/${row.employee.id}`} className="font-medium hover:text-primary">
          {row.employee.fullName}
        </Link>
      ),
    },
    {
      id: "department",
      header: "Department",
      sortable: true,
      accessor: (row) => row.department,
      cell: (row) => row.department,
    },
    {
      id: "status",
      header: "Status",
      searchValue: (row) => liveStatusLabel(toLiveStatus(row.record?.state ?? "NOT_CLOCKED_IN", row.record?.status)),
      cell: (row) => (
        <LiveStatusBadge status={toLiveStatus(row.record?.state ?? "NOT_CLOCKED_IN", row.record?.status)} />
      ),
    },
    {
      id: "in",
      header: "Clock in",
      searchValue: (row) => formatTime(row.record?.clockIn ?? null),
      cell: (row) => formatTime(row.record?.clockIn ?? null),
    },
    {
      id: "active",
      header: showActions ? "Active" : "Active time",
      accessor: (row) => row.summary.activeWorkingMinutes,
      cell: (row) => formatDuration(row.summary.activeWorkingMinutes),
    },
    {
      id: "break",
      header: "Break",
      accessor: (row) => row.summary.breakMinutes,
      cell: (row) => formatDuration(row.summary.breakMinutes),
    },
    {
      id: "progress",
      header: "Progress",
      accessor: (row) => row.summary.progressPercentage,
      cell: (row) => `${row.summary.progressPercentage}%`,
    },
    ...(showActions
      ? [
          {
            id: "actions",
            header: "Actions",
            cell: (row: LiveAttendanceRow) =>
              row.record ? (
                <LinkButton href={`/attendance/${row.record.id}`} size="sm" variant="outline">
                  View
                </LinkButton>
              ) : (
                <span className="text-xs text-muted-foreground">No record</span>
              ),
          } satisfies DataTableColumn<LiveAttendanceRow>,
        ]
      : []),
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.employee.id}
      searchPlaceholder="Search employees..."
      toolbar={toolbar}
      unboxed={unboxed}
    />
  );
}
