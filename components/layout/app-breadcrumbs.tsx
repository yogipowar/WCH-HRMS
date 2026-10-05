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
import { useDataStore } from "@/lib/stores/data-store";

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
  timesheet: "Timesheet",
  log: "Log work",
  settings: "Settings",
  profile: "My Profile",
};

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const projects = useDataStore((state) => state.projects ?? []);
  const tasks = useDataStore((state) => state.projectTasks ?? []);
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  const crumbs = parts.flatMap((part, index) => {
    const parent = parts[index - 1];
    if (part === "tasks" && projects.some((project) => project.id === parent)) {
      return [];
    }
    const href = `/${parts.slice(0, index + 1).join("/")}`;
    let label = LABELS[part] ?? decodeURIComponent(part);
    if (parent === "projects") {
      const project = projects.find((item) => item.id === part);
      if (project) label = project.websiteName;
      else if (part === "new") label = "Add Project";
    } else if (parent === "tasks") {
      if (part === "new") label = "New task";
      else label = tasks.find((item) => item.id === part)?.title ?? "Task";
    } else if (part === "new" && parent === "employees") {
      label = "Add Employee";
    } else if (part === "edit" && parts[index - 2] === "projects") {
      label = "Edit Project";
    }
    return [{ href, label }];
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <span key={crumb.href} className="contents">
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem className="min-w-0 max-w-[14rem]">
                {last ? (
                  <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink className="truncate" render={<Link href={crumb.href} />}>
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
