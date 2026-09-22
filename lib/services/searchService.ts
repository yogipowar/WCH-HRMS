import { getDepartmentName, getEmployeeName } from "@/lib/lookups";
import { getData } from "@/lib/stores/data-store";
import type { SearchResult, UserRole } from "@/types";

export function searchApp(query: string, role: UserRole, userId: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) {
    return [];
  }

  const data = getData();
  const employee = data.employees.find((item) => item.userId === userId);
  const results: SearchResult[] = [];

  if (role === "MANAGEMENT") {
    data.employees.forEach((item) => {
      if (`${item.fullName} ${item.workEmail} ${item.employeeCode}`.toLowerCase().includes(q)) {
        results.push({
          id: item.id,
          type: "employee",
          title: item.fullName,
          subtitle: `${item.employeeCode} · ${getDepartmentName(data, item.departmentId)}`,
          href: `/employees/${item.id}`,
        });
      }
    });
    data.departments.forEach((item) => {
      if (item.name.toLowerCase().includes(q)) {
        results.push({
          id: item.id,
          type: "department",
          title: item.name,
          subtitle: "Department",
          href: "/departments",
        });
      }
    });
    data.designations.forEach((item) => {
      if (item.name.toLowerCase().includes(q)) {
        results.push({
          id: item.id,
          type: "department",
          title: item.name,
          subtitle: "Designation",
          href: "/designations",
        });
      }
    });
    data.documents.forEach((item) => {
      if (`${item.name} ${item.fileName}`.toLowerCase().includes(q)) {
        results.push({
          id: item.id,
          type: "document",
          title: item.name,
          subtitle: `${getEmployeeName(data, item.employeeId)} · ${item.fileName}`,
          href: "/documents",
        });
      }
    });
    data.leaveRequests.forEach((item) => {
      const name = getEmployeeName(data, item.employeeId);
      if (`${name} ${item.reason} ${item.type}`.toLowerCase().includes(q)) {
        results.push({
          id: item.id,
          type: "leave",
          title: `${name} · ${item.type}`,
          subtitle: item.reason,
          href: "/leave",
        });
      }
    });
  } else if (employee) {
    data.attendanceRecords
      .filter((item) => item.employeeId === employee.id && item.date.includes(q))
      .slice(0, 5)
      .forEach((item) => {
        results.push({
          id: item.id,
          type: "attendance",
          title: `Attendance · ${item.date}`,
          subtitle: item.status,
          href: "/attendance",
        });
      });
    data.leaveRequests
      .filter((item) => item.employeeId === employee.id)
      .forEach((item) => {
        if (`${item.type} ${item.reason}`.toLowerCase().includes(q)) {
          results.push({
            id: item.id,
            type: "leave",
            title: `${item.type} leave`,
            subtitle: item.reason,
            href: "/leave",
          });
        }
      });
    data.documents
      .filter((item) => item.employeeId === employee.id)
      .forEach((item) => {
        if (item.name.toLowerCase().includes(q)) {
          results.push({
            id: item.id,
            type: "document",
            title: item.name,
            subtitle: item.fileName,
            href: "/documents",
          });
        }
      });
  }

  data.holidays.forEach((item) => {
    if (`${item.name} ${item.description}`.toLowerCase().includes(q)) {
      results.push({
        id: item.id,
        type: "holiday",
        title: item.name,
        subtitle: item.date,
        href: "/holidays",
      });
    }
  });

  data.announcements
    .filter((item) => role === "MANAGEMENT" || item.status === "PUBLISHED")
    .forEach((item) => {
      if (`${item.title} ${item.description}`.toLowerCase().includes(q)) {
        results.push({
          id: item.id,
          type: "announcement",
          title: item.title,
          subtitle: item.status,
          href: role === "MANAGEMENT" ? "/announcements" : "/dashboard",
        });
      }
    });

  return results.slice(0, 8);
}
