"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ExternalLink, Eye, EyeOff, Search, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { EmployeeAvatar } from "@/components/shared/employee-avatar";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { LinkButton } from "@/components/shared/link-button";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { projectCode } from "@/lib/projects/codes";
import { PROJECT_STATUS_COLOR, PROJECT_STATUS_LABELS, asProjectStatus } from "@/lib/projects/requirements";
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
  const projectTasks = useDataStore((state) => state.projectTasks ?? []);
  const timeEntries = useDataStore((state) => state.projectTaskTimeEntries ?? []);
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
  const [showSetup, setShowSetup] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const filteredProjects = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return visibleProjects;
    return visibleProjects.filter((project) =>
      [
        projectCode(project.serialNo),
        project.websiteName,
        project.websiteUrl,
        project.technologyUsed,
        project.remark,
        PROJECT_STATUS_LABELS[asProjectStatus(project.status)],
        employeeName(employees, project.projectManagerId),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [employees, query, visibleProjects]);

  const pageCount = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = filteredProjects.length === 0 ? 0 : safePage * pageSize;
  const pageProjects = filteredProjects.slice(pageStart, pageStart + pageSize);

  const spaceColors = ["#7b68ee", "#3b82f6", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4"];

  function spentLabel(projectId: string) {
    const ids = new Set(projectTasks.filter((item) => item.projectId === projectId).map((item) => item.id));
    const hours = timeEntries
      .filter((item) => item.projectId === projectId || (item.taskId != null && ids.has(item.taskId)))
      .reduce((sum, item) => sum + item.hours, 0);
    const rounded = Math.round(hours * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}h`;
  }

  const adminColumns: DataTableColumn<Project>[] = [
    { id: "serialNo", header: "Project ID", accessor: (row) => projectCode(row.serialNo), cell: (row) => <span className="font-mono text-xs">{projectCode(row.serialNo)}</span> },
    {
      id: "websiteName",
      header: "Website name",
      accessor: (row) => row.websiteName,
      cell: (row) => (
        <span className="block max-w-56 truncate" title={row.websiteName}>
          {row.websiteName}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => PROJECT_STATUS_LABELS[asProjectStatus(row.status)],
      cell: (row) => {
        const status = asProjectStatus(row.status);
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <span className="size-2 rounded-full" style={{ background: PROJECT_STATUS_COLOR[status] }} />
            {PROJECT_STATUS_LABELS[status]}
          </span>
        );
      },
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
      id: "spent",
      header: "Spent",
      accessor: (row) => spentLabel(row.id),
      cell: (row) => spentLabel(row.id),
    },
    {
      id: "actions",
      header: "Actions",
      className: "w-[1%] whitespace-nowrap",
      cell: (row) => (
        <div className="flex flex-nowrap items-center gap-2">
          <LinkButton href={`/projects/${row.id}`} size="sm" variant="outline" className="shrink-0">
            Board
          </LinkButton>
          <LinkButton href={`/projects/${row.id}/edit`} size="sm" variant="outline" className="shrink-0">
            Edit
          </LinkButton>
          <Button size="sm" variant="destructive" className="shrink-0" onClick={() => setDeleteId(row.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const boardColumn: DataTableColumn<Project> = {
    id: "board",
    header: "Actions",
    className: "w-[1%] whitespace-nowrap",
    cell: (row) => (
      <LinkButton href={`/projects/${row.id}`} size="sm" variant="outline" className="shrink-0">
        Board
      </LinkButton>
    ),
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projects"
        description="Open a project to work the list and board."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
                placeholder="Search projects"
                aria-label="Search projects"
                className="h-10 pl-8"
              />
            </div>
            <Button type="button" variant={showSetup ? "secondary" : "outline"} onClick={() => setShowSetup((value) => !value)}>
              <Settings2 />
              Setup
            </Button>
            {canManage ? <LinkButton href="/projects/new">New project</LinkButton> : null}
          </div>
        }
      />

      {!showSetup && visibleProjects.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {canManage ? "Create a project, then open it to add tasks." : "You are not assigned to any projects yet."}
          </CardContent>
        </Card>
      ) : !showSetup && filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No projects match your search.</CardContent>
        </Card>
      ) : !showSetup ? (
        <div className="space-y-3">
        <div className="overflow-hidden rounded-lg border bg-card">
          {pageProjects.map((project) => {
            const mains = projectTasks.filter((item) => item.projectId === project.id && !item.parentId);
            const done = mains.filter((item) => item.status === "DONE").length;
            const people = [
              employees.find((item) => item.id === project.projectManagerId),
              ...teamMembers(employees, project.teamMemberIds),
            ].filter((item): item is Employee => Boolean(item));
            const uniquePeople = [...new Map(people.map((item) => [item.id, item])).values()];
            const color = spaceColors[project.serialNo % spaceColors.length];
            return (
              <div key={project.id} className="flex items-center gap-3 border-b px-3 py-3 last:border-b-0 hover:bg-muted/40">
                <Link href={`/projects/${project.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold text-white" style={{ background: color }}>
                    {project.websiteName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="block min-w-0 truncate text-sm font-medium" title={project.websiteName}>
                        <span className="mr-2 font-mono text-xs font-medium text-muted-foreground">{projectCode(project.serialNo)}</span>
                        {project.websiteName}
                      </span>
                      <span className="hidden shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground sm:inline-flex">
                        <span className="size-2 rounded-full" style={{ background: PROJECT_STATUS_COLOR[asProjectStatus(project.status)] }} />
                        {PROJECT_STATUS_LABELS[asProjectStatus(project.status)]}
                      </span>
                    </span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-foreground/70"
                        style={{ width: mains.length ? `${(done / mains.length) * 100}%` : "0%" }}
                      />
                    </span>
                  </span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {done}/{mains.length}
                  </span>
                  <span className="hidden w-12 text-right text-xs text-muted-foreground md:inline">{spentLabel(project.id)}</span>
                  <span className="hidden items-center -space-x-1.5 lg:flex">
                    {uniquePeople.slice(0, 4).map((member) => (
                      <EmployeeAvatar key={member.id} employee={member} className="size-6 ring-2 ring-card" />
                    ))}
                  </span>
                </Link>
                <SiteDetails
                  project={project}
                  employees={employees}
                  revealed={Boolean(showPasswords[project.id])}
                  onTogglePassword={() => setShowPasswords((prev) => ({ ...prev, [project.id]: !prev[project.id] }))}
                />
              </div>
            );
          })}
        </div>
        <ProjectListPager
          page={safePage}
          pageCount={pageCount}
          pageSize={pageSize}
          total={filteredProjects.length}
          onPage={setPage}
          onPageSize={(size) => {
            setPageSize(size);
            setPage(0);
          }}
        />
        </div>
      ) : null}

      {showSetup ? (
        <DataTable
          data={filteredProjects}
          columns={canManage ? adminColumns : adminColumns.filter((column) => column.id !== "actions").concat(boardColumn)}
          rowKey={(row) => row.id}
          searchable={false}
          emptyTitle={query.trim() ? "No projects match your search" : "No projects yet"}
          emptyDescription={
            query.trim()
              ? "Try a different name or project ID."
              : canManage
                ? "Add a project to track website details and team assignment."
                : "You are not assigned to any projects yet."
          }
        />
      ) : null}

      <ConfirmationDialog
        open={Boolean(deleteId)}
        onOpenChange={(openState) => !openState && setDeleteId(null)}
        title="Delete project?"
        description="This removes the project, its team assignment, and its task board."
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

const PAGE_SIZES = [10, 25, 50];

function ProjectListPager({
  page,
  pageCount,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(total, (page + 1) * pageSize);
  const pages = pageItems(page, pageCount);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {total === 0 ? "0 records" : `Showing ${start}–${end} of ${total} record${total === 1 ? "" : "s"}`}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Rows
          <select
            className="h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
            value={pageSize}
            onChange={(event) => onPageSize(Number(event.target.value))}
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => onPage(0)} disabled={page === 0} aria-label="First page">
            <ChevronsLeft />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => onPage(page - 1)} disabled={page === 0} aria-label="Previous page">
            <ChevronLeft />
          </Button>
          {pages.map((item, index) =>
            item === "gap" ? (
              <span key={`gap-${index}`} className="px-1.5 text-sm text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={item}
                variant={item === page ? "default" : "outline"}
                size="icon-sm"
                onClick={() => onPage(item)}
                aria-label={`Page ${item + 1}`}
                aria-current={item === page ? "page" : undefined}
              >
                {item + 1}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPage(page + 1)}
            disabled={page >= pageCount - 1}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPage(pageCount - 1)}
            disabled={page >= pageCount - 1}
            aria-label="Last page"
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

function pageItems(current: number, total: number): Array<number | "gap"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index);
  const items: Array<number | "gap"> = [0];
  const start = Math.max(1, current - 1);
  const end = Math.min(total - 2, current + 1);
  if (start > 1) items.push("gap");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < total - 2) items.push("gap");
  items.push(total - 1);
  return items;
}

function SiteDetails({
  project,
  employees,
  revealed,
  onTogglePassword,
}: {
  project: Project;
  employees: Employee[];
  revealed: boolean;
  onTogglePassword: () => void;
}) {
  const members = teamMembers(employees, project.teamMemberIds);
  return (
    <Popover>
      <PopoverTrigger className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
        Site
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] overflow-hidden">
        <div className="min-w-0 space-y-2 text-sm">
          <p className="truncate font-medium" title={project.websiteName}>
            <span className="mr-1.5 font-mono text-xs font-medium text-muted-foreground">{projectCode(project.serialNo)}</span>
            {project.websiteName}
          </p>
          <Detail
            label="Website URL"
            value={
              project.websiteUrl ? (
                <a
                  href={normalizeUrl(project.websiteUrl)}
                  target="_blank"
                  rel="noreferrer"
                  title={project.websiteUrl}
                  className="flex min-w-0 items-center gap-1 text-primary hover:underline"
                >
                  <span className="min-w-0 truncate">{project.websiteUrl}</span>
                  <ExternalLink className="size-3 shrink-0" />
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
              <button type="button" className="inline-flex max-w-full items-center gap-1 font-mono text-xs" onClick={onTogglePassword}>
                <span className="min-w-0 truncate">{revealed ? project.loginPassword || "—" : project.loginPassword ? "••••••••" : "—"}</span>
                {project.loginPassword ? revealed ? <EyeOff className="size-3.5 shrink-0" /> : <Eye className="size-3.5 shrink-0" /> : null}
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
                  title={project.figmaLink}
                  className="flex min-w-0 items-center gap-1 text-primary hover:underline"
                >
                  <span className="min-w-0 truncate">{project.figmaLink}</span>
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              ) : (
                "—"
              )
            }
          />
          <Detail label="Project manager" value={employeeName(employees, project.projectManagerId)} />
          <Detail label="Team" value={<TeamCountPopover members={members} />} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  const title = typeof value === "string" ? value : undefined;
  return (
    <div className="grid min-w-0 grid-cols-[6.75rem_minmax(0,1fr)] items-baseline gap-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="min-w-0 truncate" title={title}>
        {value}
      </div>
    </div>
  );
}
