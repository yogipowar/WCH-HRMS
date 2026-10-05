"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Calendar, Clock, Flag, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { EmployeeAvatar } from "@/components/shared/employee-avatar";
import { AssigneePicker, AssigneeStack, assignablePeople, employeeName, formatHours, ImageStrip, personName, PRIORITY_COLOR, Prop, readImageFile, StatusMenu } from "@/components/projects/task-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { entryWorkDate, itemCode, projectCode } from "@/lib/projects/codes";
import { projectTaskService } from "@/lib/services/projectTaskService";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";
import { cn } from "cn";
import type { Project, ProjectTask, TaskPriority, TaskStatus } from "@/types";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS } from "@/types";

async function run(work: () => Promise<unknown>, success: string) {
  try {
    await work();
    if (success) toast.success(success);
    return true;
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Something went wrong.");
    await useDataStore.getState().hydrateFromApi();
    return false;
  }
}

export function TaskPage({ project, taskId }: { project: Project; taskId: string }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const employees = useDataStore((state) => state.employees);
  const users = useDataStore((state) => state.users);
  const tasks = useDataStore((state) => state.projectTasks ?? []);
  const comments = useDataStore((state) => state.projectTaskComments ?? []);
  const timeEntries = useDataStore((state) => state.projectTaskTimeEntries ?? []);
  const images = useDataStore((state) => state.projectTaskImages ?? []);
  const task = tasks.find((item) => item.id === taskId && item.projectId === project.id) ?? null;
  const parent = task?.parentId ? tasks.find((item) => item.id === task.parentId) ?? null : null;
  const members = useMemo(() => assignablePeople(project, employees, users), [employees, project, users]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationHours, setDurationHours] = useState("0");
  const [comment, setComment] = useState("");
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [hours, setHours] = useState("");
  const [timeNote, setTimeNote] = useState("");
  const [timeEmployeeId, setTimeEmployeeId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description);
    setAssigneeIds(task.assigneeIds ?? []);
    setPriority(task.priority);
    setStartDate(task.startDate ?? "");
    setEndDate(task.endDate ?? "");
    setDurationHours(String(task.durationHours));
    setComment("");
    setCommentFile(null);
    setHours("");
    setTimeNote("");
    setTimeEmployeeId(task.assigneeIds[0] ?? "");
    setImageFile(null);
    setConfirmDelete(false);
  }, [task?.id]);

  if (!user || !task) return null;

  const subtasks = tasks
    .filter((item) => item.parentId === task.id)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  const taskComments = comments.filter((item) => item.taskId === task.id);
  const taskTime = timeEntries.filter((item) => item.taskId === task.id);
  const taskImages = images.filter((item) => item.taskId === task.id);
  const spent = taskTime.reduce((sum, item) => sum + item.hours, 0);
  const today = format(new Date(), "yyyy-MM-dd");
  const doneSubtasks = subtasks.filter((item) => item.status === "DONE").length;
  const subtaskProgress = subtasks.length === 0 ? 0 : Math.round((doneSubtasks / subtasks.length) * 100);
  const overdue = Boolean(task.endDate && task.endDate < today && task.status !== "DONE");
  const backHref = parent ? `/projects/${project.id}/tasks/${parent.id}` : `/projects/${project.id}`;
  const backLabel = parent ? parent.title : project.websiteName;

  function saveFields(patch: Partial<ProjectTask>) {
    void run(() => projectTaskService.updateTask(task!.id, patch), "");
  }

  return (
    <div className="space-y-5">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {backLabel}
      </Link>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <p className="mb-3 font-mono text-xs font-medium tracking-wide text-muted-foreground">
              {task.parentId ? "Subtask ID" : "Task ID"} {itemCode(project.serialNo, task, tasks)}
            </p>
            <StatusMenu prominent status={task.status} onChange={(status) => saveFields({ status })} />
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => {
                const next = title.trim();
                if (!next) {
                  setTitle(task.title);
                  return;
                }
                if (next !== task.title) saveFields({ title: next });
              }}
              className="mt-3 w-full bg-transparent text-3xl font-semibold tracking-tight outline-none"
              aria-label="Task name"
            />
            <div className="mt-4 border-t pt-4">
              <h2 className="text-sm font-semibold">Description</h2>
              <Textarea
                value={description}
                rows={4}
                placeholder="Add what this work covers..."
                className="mt-2 min-h-24 border-0 bg-muted/40 px-3 shadow-none focus-visible:ring-0"
                onChange={(event) => setDescription(event.target.value)}
                onBlur={() => {
                  if (description.trim() !== task.description) saveFields({ description: description.trim() });
                }}
              />
              <div className="mt-3 space-y-2">
              <ImageStrip images={taskImages.filter((image) => !image.commentId)} />
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const file = imageFile;
                  if (!file) return;
                  setImageFile(null);
                  void run(async () => {
                    const image = await readImageFile(file);
                    await projectTaskService.addImage({
                      taskId: task.id,
                      commentId: null,
                      uploadedBy: user.id,
                      ...image,
                    });
                  }, "Image added.");
                }}
              >
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm text-muted-foreground hover:bg-muted">
                  <ImagePlus className="size-4" />
                  <span className="max-w-40 truncate">{imageFile ? imageFile.name : "Attachments"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                  />
                </label>
                <Button type="submit" size="sm" variant="outline" disabled={!imageFile}>
                  Add
                </Button>
              </form>
              </div>
            </div>
          </section>

          {!task.parentId ? (
            <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Subtasks</h2>
                  <p className="text-xs text-muted-foreground">
                    {subtasks.length === 0 ? "Break this task into smaller pieces." : `${doneSubtasks} of ${subtasks.length} done`}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/projects/${project.id}/tasks/new?parent=${task.id}`)}
                >
                  Add subtask
                </Button>
              </div>
              {subtasks.length > 0 ? (
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${subtaskProgress}%` }} />
                </div>
              ) : null}
              {subtasks.length === 0 ? null : (
                <ul className="space-y-1">
                  {subtasks.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted/50">
                      <StatusMenu
                        status={item.status}
                        label={`Status for ${item.title}`}
                        onChange={(status) => {
                          void run(() => projectTaskService.updateTask(item.id, { status }), "");
                        }}
                      />
                      <Link
                        href={`/projects/${project.id}/tasks/${item.id}`}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-2 hover:underline",
                          item.status === "DONE" && "text-muted-foreground line-through",
                        )}
                      >
                        <span className="shrink-0 font-mono text-[11px] font-medium text-muted-foreground no-underline">
                          {itemCode(project.serialNo, item, tasks)}
                        </span>
                        <span className="truncate text-sm font-medium">{item.title}</span>
                      </Link>
                      <AssigneeStack employees={employees} users={users} ids={item.assigneeIds ?? []} size="size-5" />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Tracked time</h2>
                <p className="text-xs text-muted-foreground">Hours people have spent on this work.</p>
              </div>
              <p className="text-2xl font-semibold tracking-tight">{formatHours(spent)}h</p>
            </div>
            {taskTime.length === 0 ? <p className="text-sm text-muted-foreground">No hours logged yet.</p> : null}
            <div className="space-y-2">
            {taskTime.map((entry) => {
              const employee = employees.find((item) => item.id === entry.employeeId);
              const account = users.find((item) => item.id === entry.employeeId);
              const person = employee ?? (account ? { fullName: account.name, avatarUrl: account.avatarUrl, gender: null } : null);
              return (
              <div key={entry.id} className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2">
                <EmployeeAvatar employee={person} className="size-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {employeeName(employees, entry.employeeId, users)}
                    <span className="ml-2 font-normal text-muted-foreground">{entryWorkDate(entry)}</span>
                  </p>
                  {entry.note ? <p className="truncate text-xs text-muted-foreground">{entry.note}</p> : null}
                </div>
                <span className="flex shrink-0 items-center gap-1">
                  <span className="text-sm font-semibold">{formatHours(entry.hours)}h</span>
                  {user.role === "MANAGEMENT" || user.employeeId === entry.employeeId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove time entry"
                      onClick={() => {
                        void run(() => projectTaskService.removeTime(entry.id), "Time removed.");
                      }}
                    >
                      <Trash2 />
                    </Button>
                  ) : null}
                </span>
              </div>
              );
            })}
            </div>
            {user.role === "MANAGEMENT" || user.employeeId ? (
              <form
                className="flex flex-wrap gap-2 rounded-xl bg-muted/30 p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const logged = Math.min(24, Number(hours));
                  const employeeId = user.role === "MANAGEMENT" ? timeEmployeeId || user.employeeId || "" : user.employeeId || "";
                  if (!employeeId || !(logged > 0)) return;
                  setHours("");
                  setTimeNote("");
                  void run(() => projectTaskService.addTime(task.id, employeeId, logged, timeNote), "Time tracked.");
                }}
              >
                {user.role === "MANAGEMENT" ? (
                  <NativeSelect
                    value={timeEmployeeId}
                    onChange={(event) => setTimeEmployeeId(event.target.value)}
                    className="h-9 w-44"
                  >
                    <option value="">Who</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.fullName}
                      </option>
                    ))}
                  </NativeSelect>
                ) : null}
                <Input
                  type="number"
                  min={0.5}
                  max={24}
                  step="0.5"
                  value={hours}
                  onChange={(event) => setHours(event.target.value)}
                  placeholder="Hours"
                  className="h-9 w-28"
                />
                <Input
                  value={timeNote}
                  onChange={(event) => setTimeNote(event.target.value)}
                  placeholder="Note"
                  className="h-9 min-w-[12rem] flex-1"
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={!(Number(hours) > 0) || (user.role === "MANAGEMENT" && !timeEmployeeId && !user.employeeId)}
                >
                  Log
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Hours are logged from an employee account.</p>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Activity</h2>
            <ul className="space-y-4">
              {taskComments.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <EmployeeAvatar employee={employees.find((person) => person.userId === item.authorId)} className="size-8" />
                  <div className="min-w-0 flex-1 rounded-xl bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      {personName(users, employees, item.authorId)} · {item.createdAt.slice(0, 16).replace("T", " ")}
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{item.body}</p>
                    <ImageStrip images={taskImages.filter((image) => image.commentId === item.id)} />
                  </div>
                </li>
              ))}
            </ul>
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                const body = comment.trim();
                if (!body) return;
                const file = commentFile;
                setComment("");
                setCommentFile(null);
                void run(async () => {
                  const created = await projectTaskService.addComment(task.id, user.id, body);
                  if (!file) return;
                  try {
                    const image = await readImageFile(file);
                    await projectTaskService.addImage({
                      taskId: task.id,
                      commentId: created.id,
                      uploadedBy: user.id,
                      ...image,
                    });
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "The comment was saved, but the image was not.");
                  }
                }, "");
              }}
            >
              <Textarea
                value={comment}
                rows={3}
                placeholder="Write a comment..."
                className="min-h-20 bg-muted/30"
                onChange={(event) => setComment(event.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm text-muted-foreground hover:bg-muted">
                  <ImagePlus className="size-4" />
                  <span className="max-w-40 truncate">{commentFile ? commentFile.name : "Image"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={(event) => setCommentFile(event.target.files?.[0] ?? null)}
                  />
                </label>
                <Button type="submit" disabled={!comment.trim()}>
                  Comment
                </Button>
              </div>
            </form>
          </section>

        </div>

        <aside className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm lg:sticky lg:top-4">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">People</h2>
            <AssigneePicker
              members={members}
              value={assigneeIds}
              onChange={(next) => {
                setAssigneeIds(next);
                saveFields({ assigneeIds: next });
              }}
            />
          </div>
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Flag className="size-3.5" style={{ color: PRIORITY_COLOR[priority] }} />
                Priority
              </span>
              <NativeSelect
                value={priority}
                className="h-9"
                onChange={(event) => {
                  const next = event.target.value as TaskPriority;
                  setPriority(next);
                  saveFields({ priority: next });
                }}
              >
                {TASK_PRIORITIES.map((item) => (
                  <option key={item} value={item}>
                    {TASK_PRIORITY_LABELS[item]}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Calendar className="size-3.5" />
                  Start
                </span>
                <Input
                  type="date"
                  value={startDate}
                  className="h-9"
                  onChange={(event) => {
                    const next = event.target.value;
                    setStartDate(next);
                    if (endDate && next && next > endDate) {
                      toast.error("The start date has to be on or before the end date.");
                      setStartDate(task.startDate ?? "");
                      return;
                    }
                    saveFields({ startDate: next || null });
                  }}
                />
              </label>
              <label className="block space-y-1.5">
                <span className={cn("flex items-center gap-1.5 text-xs font-medium", overdue ? "text-destructive" : "text-muted-foreground")}>
                  <Calendar className="size-3.5" />
                  Due
                </span>
                <Input
                  type="date"
                  value={endDate}
                  className="h-9"
                  onChange={(event) => {
                    const next = event.target.value;
                    setEndDate(next);
                    if (startDate && next && next < startDate) {
                      toast.error("The due date has to be on or after the start date.");
                      setEndDate(task.endDate ?? "");
                      return;
                    }
                    saveFields({ endDate: next || null });
                  }}
                />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Clock className="size-3.5" />
                Time estimate
              </span>
              <Input
                type="number"
                min={0}
                step="0.5"
                value={durationHours}
                className="h-9"
                onChange={(event) => setDurationHours(event.target.value)}
                onBlur={() => {
                  const next = Math.max(0, Number(durationHours) || 0);
                  if (next !== task.durationHours) saveFields({ durationHours: next });
                }}
              />
            </label>
          </div>
          <Button type="button" variant="outline" className="w-full text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 />
            Delete {parent ? "subtask" : "task"}
          </Button>
        </aside>
      </div>

      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={task.parentId ? "Delete subtask?" : "Delete task?"}
        description={
          task.parentId
            ? "Comments, images, and logged hours on this subtask are removed."
            : "Subtasks, comments, images, and logged hours on this task are removed."
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          const href = task.parentId ? `/projects/${project.id}/tasks/${task.parentId}` : `/projects/${project.id}`;
          void run(() => projectTaskService.deleteTask(task.id), "Deleted.").then((ok) => {
            if (ok) router.push(href);
          });
        }}
      />
    </div>
  );
}

export function NewTaskPage({
  project,
  status,
  parent,
}: {
  project: Project;
  status: TaskStatus;
  parent: ProjectTask | null;
}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const employees = useDataStore((state) => state.employees);
  const users = useDataStore((state) => state.users);
  const members = useMemo(() => assignablePeople(project, employees, users), [employees, project, users]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>(status);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [saving, setSaving] = useState(false);

  async function create() {
    const nextTitle = title.trim();
    if (!user || !nextTitle || saving) return;
    if (startDate && endDate && startDate > endDate) {
      toast.error("The start date has to be on or before the end date.");
      return;
    }
    setSaving(true);
    try {
      const created = await projectTaskService.createTask({
        projectId: project.id,
        parentId: parent?.id ?? null,
        title: nextTitle,
        description,
        assigneeIds,
        createdBy: user.id,
        status: taskStatus,
        priority,
        startDate: startDate || null,
        endDate: endDate || null,
        durationHours: durationHours === "" ? 0 : Math.max(0, Number(durationHours) || 0),
      });
      toast.success(parent ? "Subtask added." : "Task added.");
      router.replace(`/projects/${project.id}/tasks/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
      await useDataStore.getState().hydrateFromApi();
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/projects" className="text-muted-foreground hover:text-foreground">
          Projects
        </Link>
        <span className="text-muted-foreground">/</span>
        <Link href={`/projects/${project.id}`} className="text-muted-foreground hover:text-foreground">
          <span className="mr-1.5 font-mono text-xs">{projectCode(project.serialNo)}</span>
          {project.websiteName}
        </Link>
        {parent ? (
          <>
            <span className="text-muted-foreground">/</span>
            <Link href={`/projects/${project.id}/tasks/${parent.id}`} className="text-muted-foreground hover:text-foreground">
              {parent.title}
            </Link>
          </>
        ) : null}
        <span className="text-muted-foreground">/</span>
        <span>{parent ? "New subtask" : "New task"}</span>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-sm font-medium text-muted-foreground">{parent ? "New subtask" : "New task"}</h1>
            <Input
              value={title}
              autoFocus
              placeholder={parent ? "Subtask name" : "Task name"}
              className="h-12 text-lg"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <section className="space-y-2 rounded-xl border bg-card p-4">
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Description</h2>
            <Textarea
              value={description}
              rows={5}
              placeholder="Add a description..."
              onChange={(event) => setDescription(event.target.value)}
            />
          </section>
          <div className="flex gap-2">
            <Button type="button" disabled={!title.trim() || saving} onClick={() => void create()}>
              {parent ? "Create subtask" : "Create task"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(parent ? `/projects/${project.id}/tasks/${parent.id}` : `/projects/${project.id}`)}
            >
              Cancel
            </Button>
          </div>
        </div>

        <aside className="space-y-4 rounded-xl border bg-card p-4 lg:sticky lg:top-4">
          <div className="space-y-2">
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">People</h2>
            <AssigneePicker members={members} value={assigneeIds} onChange={setAssigneeIds} />
          </div>
          <div className="divide-y">
            <Prop label="Status">
              <NativeSelect
                value={taskStatus}
                className="h-8 border-0 bg-transparent px-0 shadow-none"
                onChange={(event) => setTaskStatus(event.target.value as TaskStatus)}
              >
                {TASK_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {TASK_STATUS_LABELS[item]}
                  </option>
                ))}
              </NativeSelect>
            </Prop>
            <Prop label="Priority">
              <NativeSelect
                value={priority}
                className="h-8 border-0 bg-transparent px-0 shadow-none"
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
              >
                {TASK_PRIORITIES.map((item) => (
                  <option key={item} value={item}>
                    {TASK_PRIORITY_LABELS[item]}
                  </option>
                ))}
              </NativeSelect>
            </Prop>
            <Prop label="Start date">
              <Input type="date" value={startDate} className="h-8 border-0 bg-transparent px-0 shadow-none" onChange={(event) => setStartDate(event.target.value)} />
            </Prop>
            <Prop label="Due date">
              <Input type="date" value={endDate} className="h-8 border-0 bg-transparent px-0 shadow-none" onChange={(event) => setEndDate(event.target.value)} />
            </Prop>
            <Prop label="Time estimate">
              <Input
                type="number"
                min={0}
                step="0.5"
                value={durationHours}
                placeholder="0"
                className="h-8 border-0 bg-transparent px-0 shadow-none"
                onChange={(event) => setDurationHours(event.target.value)}
              />
            </Prop>
          </div>
        </aside>
      </div>
    </div>
  );
}
