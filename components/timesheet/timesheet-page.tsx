"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { employeeName, formatHours } from "@/components/projects/task-ui";
import { EmployeeAvatar } from "@/components/shared/employee-avatar";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/shared/link-button";
import { TimesheetLogForm } from "@/components/timesheet/timesheet-log-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { entryWorkDate, INTERNAL_OFFICE_ID, INTERNAL_OFFICE_LABEL, itemCode, localDateKey, projectCode } from "@/lib/projects/codes";
import { projectTaskService } from "@/lib/services/projectTaskService";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";

export function TimesheetPage() {
  const user = useAuthStore((state) => state.user);
  const projects = useDataStore((state) => state.projects ?? []);
  const tasks = useDataStore((state) => state.projectTasks ?? []);
  const entries = useDataStore((state) => state.projectTaskTimeEntries ?? []);
  const employees = useDataStore((state) => state.employees);
  const users = useDataStore((state) => state.users);
  const today = localDateKey();
  const [date, setDate] = useState(today);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [personId, setPersonId] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [query, setQuery] = useState("");

  const selfId = user?.employeeId || user?.id || "";
  const isAdmin = user?.role === "MANAGEMENT";

  const people = useMemo(() => {
    if (!isAdmin) return [];
    const options: { id: string; label: string }[] = [];
    for (const employee of employees) {
      options.push({ id: employee.id, label: employee.fullName });
    }
    for (const account of users) {
      if (account.role !== "MANAGEMENT") continue;
      const linked = employees.some((employee) => employee.userId === account.id || employee.id === account.employeeId);
      if (linked) continue;
      options.push({ id: account.id, label: `${account.name} (Admin)` });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [employees, isAdmin, users]);

  const rangeStart = startDate <= endDate ? startDate : endDate;
  const rangeEnd = startDate <= endDate ? endDate : startDate;
  const projectChoices = useMemo(
    () => [...projects].sort((a, b) => a.serialNo - b.serialNo),
    [projects],
  );
  const ownProjects = useMemo(
    () =>
      projectChoices.filter(
        (project) => project.projectManagerId === selfId || project.teamMemberIds.includes(selfId),
      ),
    [projectChoices, selfId],
  );

  function matchesProject(entry: (typeof entries)[number]) {
    if (!projectFilter) return true;
    if (projectFilter === INTERNAL_OFFICE_ID) return entry.projectId === INTERNAL_OFFICE_ID;
    if (entry.projectId === projectFilter) return true;
    const task = entry.taskId ? tasks.find((item) => item.id === entry.taskId) : null;
    return task?.projectId === projectFilter;
  }

  function inRange(entry: (typeof entries)[number]) {
    const day = entryWorkDate(entry);
    return day >= rangeStart && day <= rangeEnd && matchesProject(entry);
  }

  const teamDay = useMemo(() => {
    return people
      .map((person) => {
        const rows = entries.filter((entry) => entry.employeeId === person.id && inRange(entry));
        return {
          ...person,
          entries: rows.length,
          hours: rows.reduce((sum, entry) => sum + entry.hours, 0),
        };
      })
      .sort((a, b) => b.hours - a.hours || a.label.localeCompare(b.label));
    // inRange closes over the current filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, people, projectFilter, projects, rangeEnd, rangeStart, tasks]);
  const teamLogged = teamDay.filter((person) => person.entries > 0).length;
  const adminEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries
      .filter((entry) => {
        if (!inRange(entry)) return false;
        if (personId && entry.employeeId !== personId) return false;
        if (!needle) return true;
        const task = entry.taskId ? tasks.find((item) => item.id === entry.taskId) : null;
        const project = projects.find((item) => item.id === (entry.projectId || task?.projectId));
        const haystack = [
          entry.note,
          employeeName(employees, entry.employeeId, users),
          project?.websiteName,
          task?.title,
          entry.projectId === INTERNAL_OFFICE_ID ? INTERNAL_OFFICE_LABEL : "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => entryWorkDate(b).localeCompare(entryWorkDate(a)) || b.createdAt.localeCompare(a.createdAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, entries, personId, projectFilter, projects, query, rangeEnd, rangeStart, tasks, users]);
  const adminHours = adminEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const myEntries = useMemo(() => {
    if (isAdmin) return [];
    return entries
      .filter((entry) => entry.employeeId === selfId && inRange(entry))
      .sort((a, b) => entryWorkDate(b).localeCompare(entryWorkDate(a)) || b.createdAt.localeCompare(a.createdAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, isAdmin, projectFilter, rangeEnd, rangeStart, selfId, tasks]);
  const myHours = myEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const projectHours = useMemo(() => {
    const totals = new Map<string, { label: string; hours: number }>();
    for (const entry of entries) {
      if (!inRange(entry)) continue;
      if (personId && entry.employeeId !== personId) continue;
      const task = entry.taskId ? tasks.find((item) => item.id === entry.taskId) : null;
      const project = projects.find((item) => item.id === (entry.projectId || task?.projectId));
      const key = entry.projectId === INTERNAL_OFFICE_ID ? INTERNAL_OFFICE_ID : project?.id || "unknown";
      const label = entry.projectId === INTERNAL_OFFICE_ID ? INTERNAL_OFFICE_LABEL : project ? `${projectCode(project.serialNo)} ${project.websiteName}` : "Project";
      const current = totals.get(key) ?? { label, hours: 0 };
      current.hours += entry.hours;
      totals.set(key, current);
    }
    return [...totals.values()].sort((a, b) => b.hours - a.hours).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, personId, projectFilter, projects, rangeEnd, rangeStart, tasks]);

  function applyRange(preset: "today" | "week" | "month") {
    const end = new Date();
    const endKey = localDateKey(end);
    const start =
      preset === "week" ? startOfWeek(end, { weekStartsOn: 1 }) : preset === "month" ? startOfMonth(end) : end;
    setStartDate(localDateKey(start));
    setEndDate(endKey);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timesheet"
        description={
          isAdmin
            ? "Filter by dates, employee, and project, then review the logged work."
            : "Log your work, then filter your timesheet by dates and project."
        }
        actions={
          isAdmin ? (
            <LinkButton href={`/timesheet/log?date=${rangeEnd}&person=${encodeURIComponent(personId)}`}>Log work</LinkButton>
          ) : null
        }
      />

      {isAdmin ? (
        <>
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <Label className="mb-1.5" htmlFor="timesheet-start">Start date</Label>
                  <Input id="timesheet-start" type="date" value={startDate} onChange={(event) => event.target.value && setStartDate(event.target.value)} />
                </div>
                <div>
                  <Label className="mb-1.5" htmlFor="timesheet-end">End date</Label>
                  <Input id="timesheet-end" type="date" value={endDate} onChange={(event) => event.target.value && setEndDate(event.target.value)} />
                </div>
                <div>
                  <Label className="mb-1.5" htmlFor="timesheet-person">Employee</Label>
                  <NativeSelect id="timesheet-person" value={personId} onChange={(event) => setPersonId(event.target.value)}>
                    <option value="">All employees</option>
                    {people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <Label className="mb-1.5" htmlFor="timesheet-project">Project</Label>
                  <NativeSelect id="timesheet-project" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
                    <option value="">All projects</option>
                    <option value={INTERNAL_OFFICE_ID}>{INTERNAL_OFFICE_LABEL}</option>
                    {projectChoices.map((project) => (
                      <option key={project.id} value={project.id}>
                        {projectCode(project.serialNo)} {project.websiteName}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => applyRange("today")}>Today</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyRange("week")}>This week</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyRange("month")}>This month</Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      applyRange("today");
                      setPersonId("");
                      setProjectFilter("");
                      setQuery("");
                    }}
                  >
                    Clear
                  </Button>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search work"
                    aria-label="Search timesheet"
                    className="pl-8"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">Employee timesheets</CardTitle>
              {personId ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPersonId("")}>
                  All employees
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="px-0">
              {teamDay.length === 0 ? (
                <p className="px-6 text-sm text-muted-foreground">No employees to show.</p>
              ) : (
                <ul>
                  {teamDay.map((person) => {
                    const employee = employees.find((item) => item.id === person.id);
                    const selected = person.id === personId;
                    return (
                      <li key={person.id} className="border-b last:border-b-0">
                        <button
                          type="button"
                          className={`flex w-full items-center gap-3 px-6 py-3 text-left hover:bg-muted/50 ${selected ? "bg-muted/60" : ""}`}
                          onClick={() => setPersonId(person.id)}
                        >
                          <EmployeeAvatar
                            employee={employee ?? { fullName: person.label, avatarUrl: null }}
                            className="size-8"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{person.label}</span>
                            <span className="block text-xs text-muted-foreground">
                              {person.entries === 0 ? "Not logged" : `${person.entries} ${person.entries === 1 ? "entry" : "entries"}`}
                              {selected ? " · Viewing" : ""}
                            </span>
                          </span>
                          <span className="text-sm font-semibold tabular-nums">{formatHours(person.hours)}h</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
          <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Range" value={rangeStart === rangeEnd ? format(parseISO(rangeStart), "d MMM") : `${format(parseISO(rangeStart), "d MMM")} – ${format(parseISO(rangeEnd), "d MMM")}`} hint={rangeStart === rangeEnd ? format(parseISO(rangeStart), "EEEE yyyy") : "selected dates"} />
            <StatCard label="Logged" value={String(teamLogged)} hint={`of ${teamDay.length} people`} />
            <StatCard label="Entries" value={String(adminEntries.length)} hint="matching this filter" />
            <StatCard label="Hours" value={`${formatHours(adminHours)}h`} hint="in this filter" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hours by project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {projectHours.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hours in this filter.</p>
              ) : (
                projectHours.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{item.label}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{formatHours(item.hours)}h</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(item.hours / (projectHours[0]?.hours || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          </div>
          </div>
        </>
      ) : null}

      {isAdmin ? null : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Log work</CardTitle>
            </CardHeader>
            <CardContent>
              <TimesheetLogForm date={date} personId={selfId} showDate onDateChange={setDate} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
                <div className="grid flex-1 gap-3 md:grid-cols-3">
                  <div>
                    <Label className="mb-1.5" htmlFor="my-timesheet-start">Start date</Label>
                    <Input id="my-timesheet-start" type="date" value={startDate} onChange={(event) => event.target.value && setStartDate(event.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1.5" htmlFor="my-timesheet-end">End date</Label>
                    <Input id="my-timesheet-end" type="date" value={endDate} onChange={(event) => event.target.value && setEndDate(event.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1.5" htmlFor="my-timesheet-project">Project</Label>
                    <NativeSelect id="my-timesheet-project" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
                      <option value="">All projects</option>
                      <option value={INTERNAL_OFFICE_ID}>{INTERNAL_OFFICE_LABEL}</option>
                      {ownProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {projectCode(project.serialNo)} {project.websiteName}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => applyRange("today")}>Today</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyRange("week")}>This week</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyRange("month")}>This month</Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      applyRange("today");
                      setProjectFilter("");
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard label="Range" value={rangeStart === rangeEnd ? format(parseISO(rangeStart), "d MMM") : `${format(parseISO(rangeStart), "d MMM")} – ${format(parseISO(rangeEnd), "d MMM")}`} hint={rangeStart === rangeEnd ? format(parseISO(rangeStart), "EEEE yyyy") : "selected dates"} />
            <StatCard label="Entries" value={String(myEntries.length)} hint="matching this filter" />
            <StatCard label="Hours" value={`${formatHours(myHours)}h`} hint="in this filter" />
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtered entries</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {(isAdmin ? adminEntries : myEntries).length === 0 ? (
            <p className="px-6 text-sm text-muted-foreground">No work matches this filter.</p>
          ) : (
            <ul>
              {(isAdmin ? adminEntries : myEntries).map((entry) => {
                const internal = entry.projectId === INTERNAL_OFFICE_ID;
                const task = entry.taskId ? tasks.find((item) => item.id === entry.taskId) : null;
                const project = internal
                  ? null
                  : (projects.find((item) => item.id === entry.projectId) ?? projects.find((item) => item.id === task?.projectId));
                const code = task && project ? itemCode(project.serialNo, task, tasks) : project ? projectCode(project.serialNo) : "";
                const canRemove = isAdmin || entry.employeeId === selfId;
                return (
                  <li key={entry.id} className="flex items-start gap-3 border-b px-6 py-4 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{entry.note || "Work logged"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {`${format(parseISO(entryWorkDate(entry)), "d MMM")} · `}
                        {code ? <span className="font-mono">{code}</span> : null}
                        {internal ? ` ${INTERNAL_OFFICE_LABEL}` : project ? ` ${project.websiteName}` : " Project"}
                        {task && project ? (
                          <>
                            {" · "}
                            <Link href={`/projects/${project.id}/tasks/${task.id}`} className="hover:underline">
                              {task.title}
                            </Link>
                          </>
                        ) : null}
                        {isAdmin ? ` · ${employeeName(employees, entry.employeeId, users)}` : ""}
                      </p>
                    </div>
                    <span className="pt-0.5 text-sm font-semibold">{formatHours(entry.hours)}h</span>
                    {canRemove ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove timesheet entry"
                        onClick={() => {
                          void projectTaskService.removeTime(entry.id).catch(async (error: unknown) => {
                            toast.error(error instanceof Error ? error.message : "Could not remove this entry.");
                            await useDataStore.getState().hydrateFromApi();
                          });
                        }}
                      >
                        <Trash2 />
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}


