"use client";

import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { ManagementDashboard } from "@/components/dashboard/management-dashboard";
import { getEmployeeByUser } from "@/lib/lookups";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const data = useDataStore();

  if (!user) {
    return null;
  }

  if (user.role === "MANAGEMENT") {
    return <ManagementDashboard />;
  }

  const employee = getEmployeeByUser(data, user.id);
  if (!employee) {
    return <p className="text-sm text-muted-foreground">No employee profile is linked to this account.</p>;
  }

  return <EmployeeDashboard employee={employee} />;
}
