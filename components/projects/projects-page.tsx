"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { LinkButton } from "@/components/shared/link-button";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { isEmployeeOnProject, projectService } from "@/lib/services/projectService";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";
import type { Employee, Project } from "@/types";

function employeeName(employees: Employee[], id: string | null | undefined) {
  if (!id) return "—";
  return employees.find((item) => item.id === id)?.fullName ?? "—";
}

function teamMembers(employees: Employee[], ids: string[]) {
  return ids
    .map((id) => employees.find((item) => item.id === id))
    .filter((item): item is Employee => Boolean(item));
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function TeamCountPopover({ members }: { members: Employee[] }) {
  const count = members.length;
  if (count === 0) {
    return <span className="text-muted-foreground">0 employees</span>;
  }

  return (
    <Popover>
      <PopoverTrigger className="rounded-md px-0 text-left text-sm font-medium text-primary hover:underline">
        {count} {count === 1 ? "employee" : "employees"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <PopoverHeader className="border-b px-3 py-2">
          <PopoverTitle>Team members</PopoverTitle>
        </PopoverHeader>
        <ul className="max-h-56 space-y-1 overflow-y-auto p-2">
          {members.map((member) => (
            <li key={member.id} className="rounded-md px-2 py-1.5 text-sm">
              <p className="font-medium">{member.fullName}</p>
              <p className="text-xs text-muted-foreground">{member.employeeCode}</p>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function ProjectsPage() {
  const user = useAuthStore((state) => state.user);
  const employees = useDataStore((state) => state.employees);
  const projects = useDataStore((state) => state.projects ?? []);
  const canManage = user?.role === "MANAGEMENT";
  const employeeId = user?.employeeId ?? null;

  const visibleProjects = useMemo(() => {
    const list = canManage
      ? [...projects]
      : projects.filter((item) => isEmployeeOnProject(item, employeeId));
    return list.sort((a, b) => a.serialNo - b.serialNo);
  }, [canManage, employeeId, projects]);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const adminColumns: DataTableColumn<Project>[] = [
    { id: "serialNo", header: "Sr No", accessor: (row) => row.serialNo, cell: (row) => row.serialNo },
    {
      id: "websiteName",
      header: "Website name",
      accessor: (row) => row.websiteName,
      cell: (row) => row.websiteName,
    },
    {
      id: "websiteUrl",
      header: "Website URL",
      cell: (row) =>
        row.websiteUrl ? (
          <a
            href={normalizeUrl(row.websiteUrl)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Open <ExternalLink className="size-3" />
          </a>
        ) : (
          "—"
        ),
    },
    {
      id: "loginUsername",
      header: "User id",
      cell: (row) => row.loginUsername || "—",
    },
    {
      id: "loginPassword",
      header: "Pass",
      cell: (row) => (
        <button
          type="button"
          className="inline-flex items-center gap-1 font-mono text-xs"
          onClick={() => setShowPasswords((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
        >
          {showPasswords[row.id] ? row.loginPassword || "—" : row.loginPassword ? "••••••••" : "—"}
          {row.loginPassword ? (
            showPasswords[row.id] ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )
          ) : null}
        </button>
      ),
    },
    {
      id: "technologyUsed",
      header: "Technology",
      cell: (row) => row.technologyUsed || "—",
    },
    {
      id: "figmaLink",
      header: "Figma",
      cell: (row) =>
        row.figmaLink ? (
          <a
            href={normalizeUrl(row.figmaLink)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Open <ExternalLink className="size-3" />
          </a>
        ) : (
          "—"
        ),
    },
    {
      id: "remark",
      header: "Remark",
      cell: (row) => <span className="line-clamp-2 max-w-[12rem]">{row.remark || "—"}</span>,
    },
    {
      id: "manager",
      header: "Project manager",
      accessor: (row) => employeeName(employees, row.projectManagerId),
      cell: (row) => (
        <span className="block max-w-[10rem] truncate" title={employeeName(employees, row.projectManagerId)}>
          {employeeName(employees, row.projectManagerId)}
        </span>
      ),
    },
    {
      id: "team",
      header: "Team",
      accessor: (row) => row.teamMemberIds.length,
      cell: (row) => <TeamCountPopover members={teamMembers(employees, row.teamMemberIds)} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex gap-2">
          <LinkButton href={`/projects/${row.id}/edit`} size="sm" variant="outline">
            Edit
          </LinkButton>
          <Button size="sm" variant="destructive" onClick={() => setDeleteId(row.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={canManage ? "Projects" : "My Projects"}
        description={
          canManage
            ? "Website projects, credentials, tech stack, and assigned team members."
            : "Projects where you are the project manager or a team member."
        }
        actions={canManage ? <LinkButton href="/projects/new">Add project</LinkButton> : null}
      />

      {canManage ? (
        <DataTable
          data={visibleProjects}
          columns={adminColumns}
          rowKey={(row) => row.id}
          emptyTitle="No projects yet"
          emptyDescription="Add a project to track website details and team assignment."
        />
      ) : visibleProjects.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            You are not assigned to any projects yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleProjects.map((project) => {
            const isManager = project.projectManagerId === employeeId;
            const members = teamMembers(employees, project.teamMemberIds);
            return (
              <Card key={project.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span>
                      #{project.serialNo} · {project.websiteName}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-normal text-muted-foreground">
                      {isManager ? "Project manager" : "Team member"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Detail
                    label="Website URL"
                    value={
                      project.websiteUrl ? (
                        <a
                          href={normalizeUrl(project.websiteUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          {project.websiteUrl}
                          <ExternalLink className="size-3.5" />
                        </a>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <Detail label="User id" value={project.loginUsername || "—"} />
                  <Detail
                    label="Pass"
                    value={
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-mono text-xs"
                        onClick={() =>
                          setShowPasswords((prev) => ({ ...prev, [project.id]: !prev[project.id] }))
                        }
                      >
                        {showPasswords[project.id]
                          ? project.loginPassword || "—"
                          : project.loginPassword
                            ? "••••••••"
                            : "—"}
                        {project.loginPassword ? (
                          showPasswords[project.id] ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )
                        ) : null}
                      </button>
                    }
                  />
                  <Detail label="Technology used" value={project.technologyUsed || "—"} />
                  <Detail
                    label="Figma link"
                    value={
                      project.figmaLink ? (
                        <a
                          href={normalizeUrl(project.figmaLink)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          Open Figma
                          <ExternalLink className="size-3.5" />
                        </a>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <Detail label="Project manager" value={employeeName(employees, project.projectManagerId)} />
                  <Detail label="Team" value={<TeamCountPopover members={members} />} />
                  <Detail label="Remark" value={project.remark || "—"} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmationDialog
        open={Boolean(deleteId)}
        onOpenChange={(openState) => !openState && setDeleteId(null)}
        title="Delete project?"
        description="This removes the project and its team assignment."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteId) {
            projectService.deleteProject(deleteId);
            toast.success("Project deleted.");
          }
        }}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="min-w-0 break-words">{value}</div>
    </div>
  );
}
