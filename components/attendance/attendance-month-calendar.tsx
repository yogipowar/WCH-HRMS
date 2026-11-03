"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { dayKind } from "@/lib/attendance/work-calendar";
import { cn } from "@/lib/utils";
import type { AttendanceRecord, CompanySettings, Holiday } from "@/types";

export type AttendanceDayMark = "P" | "A" | "HD" | "H" | "W";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MARK_META: Record<
  AttendanceDayMark,
  { label: string; cell: string; badge: string; countBg: string; countText: string; bar: string }
> = {
  P: {
    label: "Present",
    cell: "bg-emerald-50 dark:bg-emerald-500/10",
    badge: "bg-emerald-600 text-white shadow-sm",
    countBg: "bg-emerald-50 border-emerald-200/80 dark:bg-emerald-500/10 dark:border-emerald-500/20",
    countText: "text-emerald-700 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
  A: {
    label: "Absent",
    cell: "bg-rose-50 dark:bg-rose-500/10",
    badge: "bg-rose-600 text-white shadow-sm",
    countBg: "bg-rose-50 border-rose-200/80 dark:bg-rose-500/10 dark:border-rose-500/20",
    countText: "text-rose-700 dark:text-rose-300",
    bar: "bg-rose-500",
  },
  HD: {
    label: "Half day",
    cell: "bg-amber-50 dark:bg-amber-500/10",
    badge: "bg-amber-500 text-white shadow-sm",
    countBg: "bg-amber-50 border-amber-200/80 dark:bg-amber-500/10 dark:border-amber-500/20",
    countText: "text-amber-800 dark:text-amber-200",
    bar: "bg-amber-500",
  },
  H: {
    label: "Holiday",
    cell: "bg-violet-50 dark:bg-violet-500/10",
    badge: "bg-violet-600 text-white shadow-sm",
    countBg: "bg-violet-50 border-violet-200/80 dark:bg-violet-500/10 dark:border-violet-500/20",
    countText: "text-violet-800 dark:text-violet-200",
    bar: "bg-violet-500",
  },
  W: {
    label: "Weekend",
    cell: "bg-slate-100 dark:bg-slate-500/10",
    badge: "bg-slate-600 text-white shadow-sm",
    countBg: "bg-slate-100 border-slate-200/80 dark:bg-slate-500/10 dark:border-slate-500/20",
    countText: "text-slate-700 dark:text-slate-300",
    bar: "bg-slate-500",
  },
};

const MARK_ORDER: AttendanceDayMark[] = ["P", "A", "HD", "H", "W"];

function markForDate(
  iso: string,
  record: AttendanceRecord | undefined,
  settings: CompanySettings,
  holidays: Holiday[],
  today: string,
): AttendanceDayMark | null {
  const kind = dayKind(iso, settings, holidays);
  if (kind === "HOLIDAY" || record?.status === "HOLIDAY") return "H";
  if (kind === "WEEKLY_OFF" || record?.status === "WEEKLY_OFF") return "W";

  if (record) {
    if (record.status === "HALF_DAY") return "HD";
    if (record.status === "ABSENT" || record.status === "ON_LEAVE") return "A";
    return "P";
  }

  if (iso > today) return null;
  return "A";
}

function emptyCounts(): Record<AttendanceDayMark, number> {
  return { P: 0, A: 0, HD: 0, H: 0, W: 0 };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AttendanceMonthCalendar({
  records,
  settings,
  holidays,
  selectedDate,
  onSelectDate,
  employeeName,
}: {
  records: AttendanceRecord[];
  settings: CompanySettings;
  holidays: Holiday[];
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  employeeName?: string;
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [month, setMonth] = useState(() => startOfMonth(selectedDate ? parseISO(selectedDate) : new Date()));

  useEffect(() => {
    if (!selectedDate) return;
    const next = startOfMonth(parseISO(selectedDate));
    setMonth((current) => (current.getTime() === next.getTime() ? current : next));
  }, [selectedDate]);

  const byDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const record of records) {
      map.set(record.date, record);
    }
    return map;
  }, [records]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end }).map((day) => {
      const iso = format(day, "yyyy-MM-dd");
      return {
        day,
        iso,
        inMonth: isSameMonth(day, month),
        mark: markForDate(iso, byDate.get(iso), settings, holidays, today),
      };
    });
  }, [byDate, holidays, month, settings, today]);

  const counts = useMemo(() => {
    const next = emptyCounts();
    for (const item of days) {
      if (!item.inMonth || !item.mark) continue;
      next[item.mark] += 1;
    }
    return next;
  }, [days]);

  const workedDays = counts.P + counts.HD;
  const expectedWorkDays = workedDays + counts.A;
  const attendanceRate = expectedWorkDays > 0 ? Math.round((workedDays / expectedWorkDays) * 100) : null;

  return (
    <Card className="overflow-hidden border-border/70 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {employeeName ? (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold tracking-wide text-primary-foreground">
              {initials(employeeName)}
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">{employeeName ?? "Attendance calendar"}</p>
            <p className="text-[11px] text-muted-foreground">{format(month, "MMMM yyyy")}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {attendanceRate != null ? (
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-2.5 py-1 text-[11px]">
              <span className="text-muted-foreground">Attendance</span>
              <span className="font-semibold tabular-nums text-foreground">{attendanceRate}%</span>
              <span className="h-1 w-10 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${attendanceRate}%` }} />
              </span>
            </div>
          ) : null}
          <div className="inline-flex items-center rounded-full border bg-background p-0.5">
            <Button type="button" variant="ghost" size="icon-sm" className="rounded-full" onClick={() => setMonth((current) => subMonths(current, 1))} aria-label="Previous month">
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="min-w-[4.75rem] px-1 text-center text-xs font-medium tabular-nums">{format(month, "MMM yyyy")}</span>
            <Button type="button" variant="ghost" size="icon-sm" className="rounded-full" onClick={() => setMonth((current) => addMonths(current, 1))} aria-label="Next month">
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[11.5rem_minmax(0,1fr)]">
        <aside className="border-b bg-muted/15 p-3 lg:border-r lg:border-b-0 sm:p-4">
          <p className="mb-2 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">This month</p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {MARK_ORDER.map((mark) => (
              <div key={mark} className={cn("flex items-center gap-2.5 rounded-xl border px-2.5 py-2", MARK_META[mark].countBg)}>
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold", MARK_META[mark].badge)}>
                  {mark}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] text-muted-foreground">{MARK_META[mark].label}</p>
                  <p className={cn("text-lg font-semibold tabular-nums leading-none", MARK_META[mark].countText)}>{counts[mark]}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border bg-card px-2.5 py-2">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-muted-foreground">Worked</span>
              <span className="font-semibold tabular-nums text-foreground">
                {workedDays}
                {expectedWorkDays > 0 ? ` / ${expectedWorkDays}` : ""}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${attendanceRate ?? 0}%` }} />
            </div>
          </div>
        </aside>

        <div className="p-3 sm:p-4">
          <div className="overflow-hidden rounded-xl border">
            <div className="grid grid-cols-7 border-b bg-muted/40">
              {WEEKDAYS.map((label) => (
                <div key={label} className="border-r px-1 py-1.5 text-center text-[10px] font-semibold tracking-wide text-muted-foreground last:border-r-0">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map(({ day, iso, inMonth, mark }, index) => {
                const selected = selectedDate ? isSameDay(day, parseISO(selectedDate)) : false;
                const isToday = iso === today;
                const meta = mark ? MARK_META[mark] : null;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={!inMonth}
                    onClick={() => onSelectDate?.(iso)}
                    className={cn(
                      "relative flex h-12 flex-col items-center justify-between border-r border-b px-1 py-1 transition-colors last:border-r-0 sm:h-[3.25rem]",
                      index % 7 === 6 && "border-r-0",
                      inMonth ? "bg-card hover:bg-muted/25" : "bg-muted/10",
                      inMonth && mark && meta?.cell,
                      selected && "z-[1] ring-2 ring-inset ring-primary",
                      !inMonth && "pointer-events-none",
                    )}
                    aria-label={`${format(day, "dd MMM yyyy")}${mark ? `, ${MARK_META[mark].label}` : ""}`}
                  >
                    {mark && inMonth ? <span className={cn("absolute inset-x-0 top-0 h-0.5", meta?.bar)} /> : null}
                    <span
                      className={cn(
                        "inline-flex size-5 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                        isToday && "bg-primary text-primary-foreground",
                        !isToday && inMonth && "text-foreground",
                        !inMonth && "text-muted-foreground/40",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {mark && inMonth ? (
                      <span
                        className={cn(
                          "inline-flex min-w-[1.35rem] items-center justify-center rounded-md px-1 py-0.5 text-[11px] font-bold leading-none tracking-wide",
                          meta?.badge,
                        )}
                      >
                        {mark}
                      </span>
                    ) : (
                      <span className="h-[18px]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {MARK_ORDER.map((mark) => (
              <span key={mark} className="inline-flex items-center gap-1.5">
                <span className={cn("inline-flex min-w-5 items-center justify-center rounded px-1 py-0.5 text-[10px] font-bold leading-none", MARK_META[mark].badge)}>
                  {mark}
                </span>
                {MARK_META[mark].label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
