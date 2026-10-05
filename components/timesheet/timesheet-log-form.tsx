"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { INTERNAL_OFFICE_ID, INTERNAL_OFFICE_LABEL, itemCode, projectCode } from "@/lib/projects/codes";
import { projectTaskService } from "@/lib/services/projectTaskService";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";
import { formFieldControlClass, formGridClass, formWideClass } from "@/lib/ui/form-styles";
import type { Project } from "@/types";

type FormErrors = { person?: string; project?: string; hours?: string; note?: string };

export function TimesheetLogForm({
  date,
  personId,
  people = [],
  showPerson = false,
  showDate = false,
  onDateChange,
  onPersonChange,
}: {
  date: string;
  personId: string;
  people?: { id: string; label: string }[];
  showPerson?: boolean;
  showDate?: boolean;
  onDateChange?: (date: string) => void;
  onPersonChange?: (personId: string) => void;
}) {
  const user = useAuthStore((state) => state.user);
  const projects = useDataStore((state) => state.projects ?? []);
  const tasks = useDataStore((state) => state.projectTasks ?? []);
  const users = useDataStore((state) => state.users);
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const visibleProjects = useMemo(() => projectsForPerson(projects, users, personId), [personId, projects, users]);
  const internalOffice = projectId === INTERNAL_OFFICE_ID;
  const selectedProject = visibleProjects.find((project) => project.id === projectId) ?? null;
  const taskChoices = useMemo(() => {
    if (!selectedProject) return [];
    const projectTasks = tasks.filter((task) => task.projectId === selectedProject.id);
    const mains = projectTasks
      .filter((task) => !task.parentId)
      .sort((a, b) => a.taskNo - b.taskNo || a.createdAt.localeCompare(b.createdAt));
    return mains.flatMap((task) => {
      const children = projectTasks
        .filter((item) => item.parentId === task.id)
        .sort((a, b) => a.taskNo - b.taskNo || a.createdAt.localeCompare(b.createdAt));
      return [task, ...children];
    });
  }, [selectedProject, tasks]);
  const logged = Math.min(24, Number(hours));

  async function addEntry() {
    const nextErrors: FormErrors = {};
    if (showPerson && !personId) nextErrors.person = "Choose a person.";
    if (!internalOffice && !selectedProject) nextErrors.project = "Choose a project.";
    if (!(logged > 0)) nextErrors.hours = "Enter the hours you worked.";
    if (!note.trim()) nextErrors.note = "Describe the work you did.";
    setErrors(nextErrors);
    if (!user || !personId || Object.keys(nextErrors).length > 0 || saving) return;
    setSaving(true);
    try {
      await projectTaskService.addTime(
        internalOffice ? null : taskId || null,
        personId,
        logged,
        note,
        date,
        internalOffice ? INTERNAL_OFFICE_ID : selectedProject?.id,
      );
      setHours("");
      setNote("");
      setTaskId("");
      toast.success("Timesheet updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this entry.");
      await useDataStore.getState().hydrateFromApi();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className={formGridClass}
      onSubmit={(event) => {
        event.preventDefault();
        void addEntry();
      }}
    >
      {showPerson ? (
        <div className={formWideClass}>
          <Label>Person</Label>
          <NativeSelect
            className={formFieldControlClass}
            value={personId}
            onChange={(event) => {
              onPersonChange?.(event.target.value);
              setProjectId("");
              setTaskId("");
              setErrors((current) => ({ ...current, person: undefined }));
            }}
          >
            <option value="">Choose a person</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.label}
              </option>
            ))}
          </NativeSelect>
          <FieldError message={errors.person} />
        </div>
      ) : null}
      <div className={`${formWideClass} grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)_minmax(0,1.25fr)_minmax(7.5rem,0.7fr)]`}>
        {showDate ? (
          <div>
            <Label>
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              type="date"
              required
              value={date}
              className="mt-1.5"
              onChange={(event) => onDateChange?.(event.target.value)}
            />
          </div>
        ) : null}
        <div>
          <Label>
            Project <span className="text-destructive">*</span>
          </Label>
          <ProjectSelect
            projects={visibleProjects}
            value={projectId}
            onChange={(id) => {
              setProjectId(id);
              setTaskId("");
              setErrors((current) => ({ ...current, project: undefined }));
            }}
          />
          <FieldError message={errors.project} />
          <p className="mt-1.5 text-xs text-muted-foreground">Use Internal office for work that is not on a project.</p>
        </div>
        <div>
          <Label>Task</Label>
          <NativeSelect
            className={formFieldControlClass}
            value={internalOffice ? "" : taskId}
            disabled={!selectedProject}
            onChange={(event) => setTaskId(event.target.value)}
          >
            <option value="">No specific task</option>
            {taskChoices.map((task) => (
              <option key={task.id} value={task.id}>
                {task.parentId ? "– " : ""}
                {itemCode(selectedProject?.serialNo ?? 0, task, tasks)} {task.title}
              </option>
            ))}
          </NativeSelect>
          <p className="mt-1.5 text-xs text-muted-foreground">Optional. Leave this blank for project work.</p>
        </div>
        <div>
          <Label>
            Hours <span className="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            min={0.5}
            max={24}
            step="0.5"
            required
            value={hours}
            placeholder="0.0"
            className="mt-1.5"
            onChange={(event) => {
              setHours(event.target.value);
              setErrors((current) => ({ ...current, hours: undefined }));
            }}
          />
          <FieldError message={errors.hours} />
        </div>
      </div>
      <div className={formWideClass}>
        <Label>
          Work done <span className="text-destructive">*</span>
        </Label>
        <Textarea
          required
          value={note}
          rows={3}
          placeholder="What you worked on"
          className="mt-1.5"
          onChange={(event) => {
            setNote(event.target.value);
            setErrors((current) => ({ ...current, note: undefined }));
          }}
        />
        <FieldError message={errors.note} />
      </div>
      <div className={formWideClass}>
        <Button type="submit" disabled={saving || !personId}>
          {saving ? "Saving…" : "Add entry"}
        </Button>
      </div>
      {visibleProjects.length === 0 ? (
        <p className={`${formWideClass} text-sm text-muted-foreground`}>No client projects yet. Use Internal office for other work.</p>
      ) : null}
    </form>
  );
}

function ProjectSelect({
  projects,
  value,
  onChange,
}: {
  projects: Project[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = projects.find((project) => project.id === value);
  const label = !value
    ? "Choose a project"
    : value === INTERNAL_OFFICE_ID
      ? INTERNAL_OFFICE_LABEL
      : selected
        ? `${projectCode(selected.serialNo)} ${selected.websiteName}`
        : "Choose a project";

  function choose(id: string) {
    onChange(id);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className={cn(formFieldControlClass, "flex items-center justify-between gap-2 text-left")}
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>{label}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) min-w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search projects" />
          <CommandList>
            <CommandEmpty>No projects match.</CommandEmpty>
            <CommandGroup>
              <CommandItem value={INTERNAL_OFFICE_LABEL} data-checked={value === INTERNAL_OFFICE_ID} onSelect={() => choose(INTERNAL_OFFICE_ID)}>
                {INTERNAL_OFFICE_LABEL}
              </CommandItem>
              {projects.map((project) => {
                const text = `${projectCode(project.serialNo)} ${project.websiteName}`;
                return (
                  <CommandItem
                    key={project.id}
                    value={`${text} ${project.websiteUrl}`}
                    data-checked={value === project.id}
                    onSelect={() => choose(project.id)}
                  >
                    <span className="truncate">{text}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function projectsForPerson(
  projects: Project[],
  users: { id: string; employeeId: string | null; role: string }[],
  personId: string,
) {
  const account = users.find((item) => item.id === personId || item.employeeId === personId);
  if (account?.role === "MANAGEMENT") return [...projects].sort((a, b) => a.websiteName.localeCompare(b.websiteName));
  return projects
    .filter((project) => project.projectManagerId === personId || project.teamMemberIds.includes(personId))
    .sort((a, b) => a.websiteName.localeCompare(b.websiteName));
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}
