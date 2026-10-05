"use client";

import { useEffect, useState, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { EmployeeAvatar } from "@/components/shared/employee-avatar";
import { api } from "@/lib/api/client";
import type { Employee, Project, ProjectTaskImage, TaskPriority, TaskStatus, User } from "@/types";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "cn";

export const STATUS_COLOR: Record<TaskStatus, string> = {
  TODO: "#87909e",
  IN_PROGRESS: "#3b82f6",
  IN_REVIEW: "#7b68ee",
  REOPEN: "#f59e0b",
  DONE: "#22c55e",
};

export const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: "#87909e",
  MEDIUM: "#f5b942",
  HIGH: "#e5484d",
};

export function formatHours(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function shortDate(value: string | null) {
  if (!value) return "";
  return format(parseISO(value), "MMM d");
}

export type AssignablePerson = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  gender: Employee["gender"] | null;
};

export function assignablePeople(project: Project, employees: Employee[], users: User[]): AssignablePerson[] {
  const teamIds = new Set([project.projectManagerId, ...project.teamMemberIds].filter((id): id is string => Boolean(id)));
  const people = new Map<string, AssignablePerson>();

  for (const employee of employees) {
    const account = users.find((user) => user.id === employee.userId || user.employeeId === employee.id);
    const isAdmin = account?.role === "MANAGEMENT";
    if (!teamIds.has(employee.id) && !isAdmin) continue;
    people.set(employee.id, {
      id: employee.id,
      fullName: isAdmin ? `${employee.fullName} (Admin)` : employee.fullName,
      avatarUrl: employee.avatarUrl,
      gender: employee.gender,
    });
  }

  for (const user of users) {
    if (user.role !== "MANAGEMENT") continue;
    const linked = employees.some((employee) => employee.userId === user.id || employee.id === user.employeeId);
    if (linked) continue;
    people.set(user.id, {
      id: user.id,
      fullName: `${user.name} (Admin)`,
      avatarUrl: user.avatarUrl,
      gender: null,
    });
  }

  return [...people.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export function employeeName(employees: Employee[], id: string | null | undefined, users: User[] = []) {
  if (!id) return "Unassigned";
  const employee = employees.find((item) => item.id === id);
  if (employee) return employee.fullName;
  return users.find((item) => item.id === id)?.name ?? "Unassigned";
}

export function personName(users: User[], employees: Employee[], userId: string) {
  const employee = employees.find((item) => item.userId === userId);
  if (employee) return employee.fullName;
  return users.find((item) => item.id === userId)?.name ?? "Someone";
}

export async function readImageFile(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 4 * 1024 * 1024) throw new Error("Image must be 4 MB or smaller.");
  const dataBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? "").split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
  if (!dataBase64) throw new Error("Could not read the image.");
  return { fileName: file.name, mimeType: file.type, dataBase64 };
}

export function StatusDot({ status }: { status: TaskStatus }) {
  return <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: STATUS_COLOR[status] }} />;
}

export function StatusMenu({
  status,
  onChange,
  label,
  prominent,
}: {
  status: TaskStatus;
  onChange: (status: TaskStatus) => void;
  label?: string;
  prominent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center gap-1.5 font-medium",
          prominent
            ? "h-8 rounded-full px-3 text-sm text-white shadow-sm"
            : "h-7 rounded-md border bg-background px-2 text-xs shadow-sm hover:bg-muted",
        )}
        style={prominent ? { background: STATUS_COLOR[status] } : undefined}
        aria-label={label ?? `Change status, currently ${TASK_STATUS_LABELS[status]}`}
        title="Change status"
      >
        {prominent ? null : <StatusDot status={status} />}
        <span>{TASK_STATUS_LABELS[status]}</span>
        <ChevronDown className={cn("size-3.5", prominent ? "text-white/80" : "text-muted-foreground")} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 gap-0.5 p-1">
        {TASK_STATUSES.map((item) => (
          <button
            key={item}
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              setOpen(false);
              if (item !== status) onChange(item);
            }}
          >
            <StatusDot status={item} />
            {TASK_STATUS_LABELS[item]}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function TaskImagePreview({ id, alt }: { id: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url = "";
    let cancelled = false;
    void api
      .fetchProjectTaskImage(id)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        if (!cancelled) setSrc(url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  if (!src) return <div className="h-24 w-32 rounded-md bg-muted" />;
  return <img src={src} alt={alt} className="h-24 w-32 rounded-md object-cover" />;
}

export function Prop({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-2 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function AssigneeStack({
  employees,
  ids,
  users = [],
  size = "size-6",
}: {
  employees: Employee[];
  ids: string[];
  users?: User[];
  size?: string;
}) {
  const people = ids
    .map((id) => {
      const employee = employees.find((item) => item.id === id);
      if (employee) return { id: employee.id, fullName: employee.fullName, avatarUrl: employee.avatarUrl, gender: employee.gender };
      const user = users.find((item) => item.id === id);
      if (!user) return null;
      return { id: user.id, fullName: user.name, avatarUrl: user.avatarUrl, gender: null };
    })
    .filter((item): item is AssignablePerson => Boolean(item));
  if (people.length === 0) {
    return <span className="text-[11px] text-muted-foreground">Unassigned</span>;
  }
  const shown = people.slice(0, 3);
  return (
    <span className="inline-flex items-center">
      <span className="flex -space-x-1.5">
        {shown.map((person) => (
          <EmployeeAvatar key={person.id} employee={person} className={cn(size, "ring-2 ring-card")} />
        ))}
      </span>
      {people.length > shown.length ? (
        <span className="ml-1 text-[11px] text-muted-foreground">+{people.length - shown.length}</span>
      ) : null}
    </span>
  );
}

export function AssigneePicker({
  members,
  value,
  onChange,
}: {
  members: AssignablePerson[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const selected = value
    .map((id) => members.find((item) => item.id === id))
    .filter((item): item is AssignablePerson => Boolean(item));

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((member) => (
        <span key={member.id} className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/60 py-0.5 pr-1 pl-0.5 text-xs">
          <EmployeeAvatar employee={member} className="size-5" />
          <span className="max-w-32 truncate">{member.fullName}</span>
          <button
            type="button"
            className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
            aria-label={`Remove ${member.fullName}`}
            onClick={() => toggle(member.id)}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <Popover>
        <PopoverTrigger className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-medium text-primary hover:bg-muted">
          <Plus className="size-3.5" />
          {selected.length === 0 ? "Add people" : "Add"}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 gap-0.5 p-1">
          {members.length === 0 ? (
            <p className="px-2 py-2 text-sm text-muted-foreground">Admins appear here, along with the project manager and team members.</p>
          ) : (
            members.map((member) => {
              const on = value.includes(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => toggle(member.id)}
                >
                  <EmployeeAvatar employee={member} className="size-6" />
                  <span className="min-w-0 flex-1 truncate">{member.fullName}</span>
                  {on ? <Check className="size-3.5 text-primary" /> : null}
                </button>
              );
            })
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ImageStrip({ images }: { images: ProjectTaskImage[] }) {
  if (images.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {images.map((image) => (
        <TaskImagePreview key={image.id} id={image.id} alt={image.fileName} />
      ))}
    </div>
  );
}
