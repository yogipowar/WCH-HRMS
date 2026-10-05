"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Calendar, Flag, LayoutGrid, List, MessageSquare, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { EmployeeAvatar } from "@/components/shared/employee-avatar";
import { AssigneeStack, assignablePeople, formatHours, PRIORITY_COLOR, shortDate, StatusDot, StatusMenu } from "@/components/projects/task-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { itemCode, projectCode } from "@/lib/projects/codes";
import {
  PROJECT_REQUIREMENTS,
  PROJECT_STATUSES,
  PROJECT_STATUS_COLOR,
  PROJECT_STATUS_LABELS,
  asProjectStatus,
  knownRequirementIds,
} from "@/lib/projects/requirements";
import { projectService } from "@/lib/services/projectService";
import { projectTaskService } from "@/lib/services/projectTaskService";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";
import { cn } from "cn";
import type { Employee, Project, ProjectTask, TaskStatus, User } from "@/types";
import { TASK_STATUS_LABELS } from "@/types";

const COLUMNS: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "REOPEN", "DONE"];

function isStatus(value: string | null | undefined): value is TaskStatus {
  return COLUMNS.includes(value as TaskStatus);
}

function columnUnder(x: number, y: number) {
  const node = document.elementFromPoint(x, y)?.closest("[data-board-status]");
  const status = node?.getAttribute("data-board-status");
  return isStatus(status) ? status : null;
}

function spentHours(entries: { taskId: string | null; hours: number }[], taskIds: Set<string>) {
  return entries.filter((item) => item.taskId != null && taskIds.has(item.taskId)).reduce((sum, item) => sum + item.hours, 0);
}

export function ProjectBoard({ project }: { project: Project }) {
  const user = useAuthStore((state) => state.user);
  const employees = useDataStore((state) => state.employees);
  const users = useDataStore((state) => state.users);
  const tasks = useDataStore((state) => state.projectTasks ?? []);
  const comments = useDataStore((state) => state.projectTaskComments ?? []);
  const timeEntries = useDataStore((state) => state.projectTaskTimeEntries ?? []);
  const [overview, setOverview] = useState(project.overview ?? "");
  const [editingOverview, setEditingOverview] = useState(false);
  const [view, setView] = useState<"board" | "list">("board");
  const [query, setQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [dragging, setDragging] = useState<{ id: string; from: TaskStatus } | null>(null);
  const [dropStatus, setDropStatus] = useState<TaskStatus | null>(null);
  const dragMoved = useRef(false);
  const stopDrag = useRef<(() => void) | null>(null);

  useEffect(() => () => stopDrag.current?.(), []);

  useEffect(() => {
    setOverview(project.overview ?? "");
  }, [project.overview]);

  const members = useMemo(() => assignablePeople(project, employees, users), [employees, project, users]);
  const projectTasks = useMemo(() => tasks.filter((item) => item.projectId === project.id), [project.id, tasks]);
  const mainTasks = projectTasks.filter((item) => !item.parentId);
  const projectTaskIds = useMemo(() => new Set(projectTasks.map((item) => item.id)), [projectTasks]);
  const projectTime = timeEntries.filter((item) => item.projectId === project.id || (item.taskId != null && projectTaskIds.has(item.taskId)));
  const totalSpent = projectTime.reduce((sum, item) => sum + item.hours, 0);
  const totalPlanned = projectTasks.reduce((sum, item) => sum + item.durationHours, 0);
  const status = asProjectStatus(project.status);
  const canChangeStatus = user?.role === "MANAGEMENT" || Boolean(user?.employeeId && user.employeeId === project.projectManagerId);
  const requirements = knownRequirementIds(project.requirementIds ?? []);
  const completed = new Set(knownRequirementIds(project.completedRequirementIds ?? []));
  const requirementItems = PROJECT_REQUIREMENTS.filter((item) => requirements.includes(item.id));
  const today = format(new Date(), "yyyy-MM-dd");
  const needle = query.trim().toLowerCase();

  const visibleMain = mainTasks.filter((task) => {
    const assigned = task.assigneeIds ?? [];
    if (assigneeFilter === "unassigned" && assigned.length > 0) return false;
    if (assigneeFilter !== "all" && assigneeFilter !== "unassigned" && !assigned.includes(assigneeFilter)) return false;
    if (!needle) return true;
    const subtasks = projectTasks.filter((item) => item.parentId === task.id);
    const codes = [itemCode(project.serialNo, task, projectTasks), ...subtasks.map((item) => itemCode(project.serialNo, item, projectTasks))];
    return [task.title, task.description, ...codes, ...subtasks.map((item) => item.title)].join(" ").toLowerCase().includes(needle);
  });

  function startDrag(event: ReactPointerEvent<HTMLElement>, task: ProjectTask) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, input, textarea, select")) return;
    dragMoved.current = false;
    const startX = event.clientX;
    const startY = event.clientY;
    const pointerId = event.pointerId;
    const from = task.status;

    function move(dragEvent: PointerEvent) {
      if (dragEvent.pointerId !== pointerId) return;
      if (!dragMoved.current && Math.hypot(dragEvent.clientX - startX, dragEvent.clientY - startY) < 8) return;
      dragMoved.current = true;
      dragEvent.preventDefault();
      setDragging({ id: task.id, from });
      setDropStatus(columnUnder(dragEvent.clientX, dragEvent.clientY));
    }

    function end(dragEvent: PointerEvent) {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      stopDrag.current = null;
      const moved = dragMoved.current;
      const next = moved ? columnUnder(dragEvent.clientX, dragEvent.clientY) : null;
      setDragging(null);
      setDropStatus(null);
      if (moved) {
        const blockClick = (clickEvent: MouseEvent) => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          window.removeEventListener("click", blockClick, true);
        };
        window.addEventListener("click", blockClick, true);
        window.setTimeout(() => window.removeEventListener("click", blockClick, true), 300);
      }
      if (next && next !== from) {
        void run(() => projectTaskService.updateTask(task.id, { status: next }), "");
      }
    }

    stopDrag.current?.();
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    stopDrag.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }

  async function run(work: () => Promise<unknown>, success: string) {
    try {
      await work();
      if (success) toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
      await useDataStore.getState().hydrateFromApi();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link href="/projects" className="text-xs text-muted-foreground hover:text-foreground md:hidden">
            Projects
          </Link>
          <p className="font-mono text-xs font-medium text-muted-foreground">{projectCode(project.serialNo)}</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight">{project.websiteName}</h1>
            {canChangeStatus ? (
              <NativeSelect
                aria-label="Project status"
                value={status}
                className="h-8 w-auto text-xs"
                onChange={(event) =>
                  void run(() => projectService.setStatus(project.id, asProjectStatus(event.target.value)), "Status updated.")
                }
              >
                {PROJECT_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {PROJECT_STATUS_LABELS[item]}
                  </option>
                ))}
              </NativeSelect>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium">
                <span className="size-2 rounded-full" style={{ background: PROJECT_STATUS_COLOR[status] }} />
                {PROJECT_STATUS_LABELS[status]}
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatHours(totalSpent)}h tracked
          <span className="px-1.5">·</span>
          {formatHours(totalPlanned)}h planned
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border bg-muted/40 p-0.5">
          <ViewButton active={view === "list"} onClick={() => setView("list")} icon={<List className="size-3.5" />} label="List" />
          <ViewButton active={view === "board"} onClick={() => setView("board")} icon={<LayoutGrid className="size-3.5" />} label="Board" />
        </div>
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tasks"
            className="h-8 pl-8"
          />
        </div>
        <div className="flex max-w-full items-center gap-1 overflow-x-auto">
          <FilterChip active={assigneeFilter === "all"} onClick={() => setAssigneeFilter("all")}>
            All
          </FilterChip>
          {members.map((member) => (
            <button
              key={member.id}
              type="button"
              title={member.fullName}
              className={cn("rounded-full ring-2 ring-transparent", assigneeFilter === member.id && "ring-primary")}
              onClick={() => setAssigneeFilter((current) => (current === member.id ? "all" : member.id))}
            >
              <EmployeeAvatar employee={member} className="size-7" />
            </button>
          ))}
        </div>
      </div>

      {editingOverview ? (
        <div className="space-y-2 rounded-lg border bg-card p-3">
          <Textarea
            value={overview}
            rows={4}
            autoFocus
            placeholder="What this project covers, the goals, and what is out of scope."
            onChange={(event) => setOverview(event.target.value)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                void run(() => projectTaskService.saveOverview(project.id, overview.trim()), "Description saved.").then(() =>
                  setEditingOverview(false),
                );
              }}
            >
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setOverview(project.overview ?? "");
                setEditingOverview(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="block w-full max-w-3xl rounded-xl border bg-card px-4 py-3 text-left text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setEditingOverview(true)}
        >
          <span className="mb-1 block text-xs font-semibold tracking-wide uppercase">Description</span>
          <span className={cn("line-clamp-3 whitespace-pre-wrap", project.overview?.trim() && "text-foreground")}>
            {project.overview?.trim() ? project.overview : "Add a description"}
          </span>
        </button>
      )}

      {requirementItems.length > 0 ? (
        <section className="max-w-3xl rounded-xl border bg-card px-4 py-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold tracking-wide uppercase">Project requirements</h2>
            <span className="text-xs text-muted-foreground">
              {requirementItems.filter((item) => completed.has(item.id)).length} of {requirementItems.length} complete
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {requirementItems.map((item) => {
              const done = completed.has(item.id);
              return (
                <label key={item.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() =>
                      void run(() => projectService.setRequirementDone(project.id, item.id, !done), done ? "" : "Requirement completed.")
                    }
                  />
                  <span className={cn(done && "text-muted-foreground line-through")}>{item.label}</span>
                </label>
              );
            })}
          </div>
        </section>
      ) : null}

      {view === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {COLUMNS.map((status) => {
            const columnTasks = visibleMain
              .filter((task) => task.status === status)
              .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
            return (
              <section
                key={status}
                data-board-status={status}
                className={cn(
                  "flex min-h-48 w-[280px] shrink-0 flex-col rounded-lg bg-muted/50 p-2 transition-colors",
                  dragging && dropStatus === status && dropStatus !== dragging.from && "bg-primary/10 ring-2 ring-primary/50",
                )}
              >
                <header className="mb-2 flex items-center gap-2 px-1.5 py-1">
                  <StatusDot status={status} />
                  <h2 className="text-sm font-semibold">{TASK_STATUS_LABELS[status]}</h2>
                  <span className="text-xs text-muted-foreground">{columnTasks.length}</span>
                </header>
                <div className="space-y-2">
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      subtasks={projectTasks.filter((item) => item.parentId === task.id)}
                      comments={comments.filter((item) => item.taskId === task.id).length}
                      spent={spentHours(
                        projectTime,
                        new Set([task.id, ...projectTasks.filter((item) => item.parentId === task.id).map((item) => item.id)]),
                      )}
                      code={itemCode(project.serialNo, task, projectTasks)}
                      assigneeIds={task.assigneeIds ?? []}
                      employees={employees}
                      users={users}
                      overdue={Boolean(task.endDate && task.endDate < today && task.status !== "DONE")}
                      href={`/projects/${project.id}/tasks/${task.id}`}
                      dragging={dragging?.id === task.id}
                      onDragStart={(event) => startDrag(event, task)}
                      onStatus={(next) => void run(() => projectTaskService.updateTask(task.id, { status: next }), "")}
                    />
                  ))}
                </div>
                <AddTaskLink href={`/projects/${project.id}/tasks/new?status=${status}`} />
              </section>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          {COLUMNS.map((status) => {
            const columnTasks = visibleMain
              .filter((task) => task.status === status)
              .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
            const dropHere = Boolean(dragging && dropStatus === status && dropStatus !== dragging.from);
            return (
              <section
                key={status}
                data-board-status={status}
                className={cn("transition-colors", dropHere && "bg-primary/10 ring-2 ring-primary/50 ring-inset")}
              >
                <header className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
                  <StatusDot status={status} />
                  <h2 className="text-xs font-semibold tracking-wide uppercase">{TASK_STATUS_LABELS[status]}</h2>
                  <span className="text-xs text-muted-foreground">{columnTasks.length}</span>
                </header>
                {columnTasks.map((task) => {
                  const subtasks = projectTasks.filter((item) => item.parentId === task.id);
                  const assigned = task.assigneeIds ?? [];
                  const overdue = Boolean(task.endDate && task.endDate < today && task.status !== "DONE");
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "flex w-full cursor-grab items-center gap-3 border-b px-3 py-2 select-none hover:bg-muted/40 active:cursor-grabbing",
                        dragging?.id === task.id && "opacity-40",
                      )}
                      onPointerDown={(event) => startDrag(event, task)}
                    >
                      <StatusMenu
                        status={task.status}
                        label={`Status for ${task.title}`}
                        onChange={(next) => void run(() => projectTaskService.updateTask(task.id, { status: next }), "")}
                      />
                      <Link
                        href={`/projects/${project.id}/tasks/${task.id}`}
                        draggable={false}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span className="shrink-0 font-mono text-[11px] font-medium text-muted-foreground">
                          {itemCode(project.serialNo, task, projectTasks)}
                        </span>
                        <span className="truncate text-sm font-medium">{task.title}</span>
                      </Link>
                      <Flag className="size-3.5 shrink-0" style={{ color: PRIORITY_COLOR[task.priority] }} />
                      {subtasks.length > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {subtasks.filter((item) => item.status === "DONE").length}/{subtasks.length}
                        </span>
                      ) : null}
                      <span className={cn("w-14 shrink-0 text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
                        {shortDate(task.endDate) || "—"}
                      </span>
                      <AssigneeStack employees={employees} users={users} ids={assigned} size="size-6" />
                    </div>
                  );
                })}
                <div className="border-b px-2 py-1">
                  <AddTaskLink href={`/projects/${project.id}/tasks/new?status=${status}`} />
                </div>
              </section>
            );
          })}
        </div>
      )}

    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        "h-7 rounded-full px-2.5 text-xs font-medium",
        active ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TaskCard({
  task,
  subtasks,
  comments,
  spent,
  code,
  assigneeIds,
  employees,
  users,
  overdue,
  href,
  dragging,
  onDragStart,
  onStatus,
}: {
  task: ProjectTask;
  subtasks: ProjectTask[];
  comments: number;
  spent: number;
  code: string;
  assigneeIds: string[];
  employees: Employee[];
  users: User[];
  overdue: boolean;
  href: string;
  dragging: boolean;
  onDragStart: (event: ReactPointerEvent<HTMLElement>) => void;
  onStatus: (status: TaskStatus) => void;
}) {
  const done = subtasks.filter((item) => item.status === "DONE").length;
  return (
    <article
      className={cn(
        "cursor-grab rounded-md border bg-card px-2.5 py-2 shadow-sm transition-shadow select-none hover:shadow-md active:cursor-grabbing",
        dragging && "opacity-40",
      )}
      onPointerDown={onDragStart}
    >
      <Link href={href} draggable={false} className="block w-full text-left">
        <p className="text-sm leading-5 font-medium">
          <span className="mr-1.5 font-mono text-[11px] font-medium text-muted-foreground">{code}</span>
          {task.title}
        </p>
      </Link>
      <div className="mt-2 flex items-center gap-2 text-muted-foreground">
        <StatusMenu status={task.status} onChange={onStatus} label={`Status for ${task.title}`} />
        <Flag className="size-3.5" style={{ color: PRIORITY_COLOR[task.priority] }} />
        {task.endDate ? (
          <span className={cn("inline-flex items-center gap-1 text-[11px]", overdue && "text-destructive")}>
            <Calendar className="size-3" />
            {shortDate(task.endDate)}
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-2">
          {subtasks.length > 0 ? <span className="text-[11px]">{done}/{subtasks.length}</span> : null}
          {comments > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-[11px]">
              <MessageSquare className="size-3" />
              {comments}
            </span>
          ) : null}
          {spent > 0 ? <span className="text-[11px]">{formatHours(spent)}h</span> : null}
          <AssigneeStack employees={employees} users={users} ids={assigneeIds} size="size-5" />
        </span>
      </div>
    </article>
  );
}


function AddTaskLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="mt-1 flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground hover:bg-background/80 hover:text-foreground"
    >
      <Plus className="size-3.5" />
      Add Task
    </Link>
  );
}
