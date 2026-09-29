"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  attendance: "Attendance",
  history: "History",
  employees: "Employees",
  team: "Team",
  new: "Add Employee",
  edit: "Edit",
  departments: "Departments",
  designations: "Designations",
  leave: "Leave",
  holidays: "Holidays",
  reports: "Reports",
  "working-hours": "Working Hours",
  breaks: "Breaks",
  compliance: "9-Hour Compliance",
  payroll: "Salary slips",
  announcements: "Announcements",
  notifications: "Notifications",
  documents: "Documents",
  projects: "Projects",
  settings: "Settings",
  profile: "My Profile",
};

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {parts.map((part, index) => {
          const href = `/${parts.slice(0, index + 1).join("/")}`;
          const parent = parts[index - 1];
          let label = LABELS[part] ?? decodeURIComponent(part);
          if (part === "new" && parent === "projects") {
            label = "Add Project";
          } else if (part === "new" && parent === "employees") {
            label = "Add Employee";
          } else if (part === "edit" && parent && parts[index - 2] === "projects") {
            label = "Edit Project";
          }
          const last = index === parts.length - 1;
          return (
            <span key={href} className="contents">
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {last ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={href} />}>{label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
