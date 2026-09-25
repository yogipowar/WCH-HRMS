"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AttendanceTimeline } from "@/components/attendance/attendance-timeline";
import { AttendanceStatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDuration, summarizeAttendance } from "@/lib/attendance/calculations";
import { isOpenAttendance } from "@/lib/attendance/session";
import { getEmployeeName } from "@/lib/lookups";
import { useDataStore } from "@/lib/stores/data-store";
import { cn } from "@/lib/utils";
import { formatDate, formatTime } from "@/lib/utils/format";
import type { AttendanceRecord, BreakType } from "@/types";

function breakTimes(record: AttendanceRecord, type: BreakType) {
  const items = record.breaks.filter((item) => item.type === type);
  if (items.length === 0) {
    return "—";
  }
  return items
    .map((item) => `${formatTime(item.startTime)} – ${formatTime(item.endTime)}`)
    .join(", ");
}

export function AttendanceHistoryList({
  records,
  showEmployee = false,
}: {
  records: AttendanceRecord[];
  showEmployee?: boolean;
}) {
  const data = useDataStore();
  const [openId, setOpenId] = useState<string | null>(null);

  if (records.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        No attendance history yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record) => {
        const open = openId === record.id;
        return (
          <Card key={record.id} className="shadow-sm">
            <button
              type="button"
              className="flex w-full items-start justify-between gap-3 p-4 text-left"
              onClick={() => setOpenId(open ? null : record.id)}
              aria-expanded={open}
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{formatDate(record.date)}</p>
                  <AttendanceStatusBadge status={record.status} />
                </div>
                {showEmployee ? (
                  <p className="text-sm text-muted-foreground">{getEmployeeName(data, record.employeeId)}</p>
                ) : null}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">Clock in</dt>
                    <dd>{formatTime(record.clockIn)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Clock out</dt>
                    <dd>{formatTime(record.clockOut)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Lunch</dt>
                    <dd>{breakTimes(record, "LUNCH")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Personal</dt>
                    <dd>{breakTimes(record, "PERSONAL")}</dd>
                  </div>
                </dl>
                <HistoryHours record={record} />
              </div>
              <ChevronDown className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
            </button>
            {open ? (
              <CardContent className="border-t pt-4">
                <AttendanceTimeline record={record} />
              </CardContent>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

function HistoryHours({ record }: { record: AttendanceRecord }) {
  const hours = isOpenAttendance(record)
    ? summarizeAttendance(record)
    : { activeWorkingMinutes: record.activeWorkingMinutes, breakMinutes: record.breakMinutes };
  return (
    <p className="text-xs text-muted-foreground">
      Active {formatDuration(hours.activeWorkingMinutes)} · Break {formatDuration(hours.breakMinutes)}
      {isOpenAttendance(record) ? " · Still working" : ""}
    </p>
  );
}
