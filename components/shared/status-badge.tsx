import { Badge } from "@/components/ui/badge";
import {
  attendanceStatusLabel,
  announcementStatusLabel,
  leaveStatusLabel,
  liveStatusLabel,
} from "@/lib/utils/format";
import type {
  AnnouncementStatus,
  AttendanceStatus,
  LeaveStatus,
  LiveAttendanceStatus,
} from "@/types";

const liveTone: Record<LiveAttendanceStatus, string> = {
  WORKING: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  LUNCH_BREAK: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  PERSONAL_BREAK: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  COMPLETED: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  ABSENT: "bg-destructive/10 text-destructive",
  ON_LEAVE: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  NOT_CLOCKED_IN: "bg-muted text-muted-foreground",
  WEEKLY_OFF: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  HOLIDAY: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

const attendanceTone: Record<AttendanceStatus, string> = {
  PRESENT: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  COMPLETED: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  LATE: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  INCOMPLETE: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  ABSENT: "bg-destructive/10 text-destructive",
  ON_LEAVE: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  WEEKLY_OFF: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  HOLIDAY: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

const leaveTone: Record<LeaveStatus, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  APPROVED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  REJECTED: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
};

export function LiveStatusBadge({ status }: { status: LiveAttendanceStatus }) {
  return <Badge className={liveTone[status]}>{liveStatusLabel(status)}</Badge>;
}

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  return <Badge className={attendanceTone[status]}>{attendanceStatusLabel(status)}</Badge>;
}

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  return <Badge className={leaveTone[status]}>{leaveStatusLabel(status)}</Badge>;
}

export function AnnouncementStatusBadge({ status }: { status: AnnouncementStatus }) {
  return <Badge variant="secondary">{announcementStatusLabel(status)}</Badge>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge className={active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}
