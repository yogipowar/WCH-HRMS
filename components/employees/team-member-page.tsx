"use client";

import { PageHeader } from "@/components/shared/page-header";
import { ActiveBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LinkButton } from "@/components/shared/link-button";
import { Card, CardContent } from "@/components/ui/card";
import { getDepartmentName, getDesignationName, getReportingPersonName } from "@/lib/lookups";
import { useDataStore } from "@/lib/stores/data-store";
import { employmentTypeLabel, formatDate, initials } from "@/lib/utils/format";

export function TeamMemberPage({ employeeId }: { employeeId: string }) {
  const data = useDataStore();
  const employee = data.employees.find((item) => item.id === employeeId);

  if (!employee) {
    return <p className="text-sm text-muted-foreground">Team member not found.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={employee.fullName}
        description={`${employee.employeeCode} · ${getDesignationName(data, employee.designationId)}`}
        actions={
          <LinkButton href="/team" variant="outline">
            Back to team
          </LinkButton>
        }
      />

      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="text-lg">{initials(employee.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{employee.fullName}</p>
              <p className="text-sm text-muted-foreground">
                {getDepartmentName(data, employee.departmentId)} · {employmentTypeLabel(employee.employmentType)}
              </p>
              <p className="text-sm text-muted-foreground">
                {employee.workEmail} · {employee.phone}
              </p>
            </div>
          </div>
          <ActiveBadge active={employee.status === "ACTIVE"} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard title="Employee ID" value={employee.employeeCode} />
        <InfoCard title="Designation" value={getDesignationName(data, employee.designationId)} />
        <InfoCard title="Department" value={getDepartmentName(data, employee.departmentId)} />
        <InfoCard title="Employment type" value={employmentTypeLabel(employee.employmentType)} />
        <InfoCard title="Joining date" value={formatDate(employee.joiningDate)} />
        <InfoCard title="Work location" value={employee.workLocation} />
        <InfoCard title="Reporting person" value={getReportingPersonName(data, employee.reportingPersonId)} />
        <InfoCard title="Work email" value={employee.workEmail} />
        <InfoCard title="Phone" value={employee.phone} />
      </div>
    </div>
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
