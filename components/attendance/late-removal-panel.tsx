"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { LeaveStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  canRequestLateRemoval,
  countableLateMarksInMonth,
  lateRemovalRemainingInMonth,
} from "@/lib/attendance/late-policy";
import { lateRemovalService } from "@/lib/services/lateRemovalService";
import { useDataStore } from "@/lib/stores/data-store";
import { formatDate } from "@/lib/utils/format";
import { formatDuration } from "@/lib/attendance/calculations";
import {
  LATE_MARKS_BEFORE_HALF_DAY,
  LATE_REMOVAL_MONTHLY_LIMIT,
  type AttendanceRecord,
} from "@/types";

export function LateRemovalRequestPanel({
  record,
  showDate = false,
}: {
  record: AttendanceRecord;
  showDate?: boolean;
}) {
  const lateRemovalRequests = useDataStore((state) => state.lateRemovalRequests ?? []);
  const attendanceRecords = useDataStore((state) => state.attendanceRecords);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const check = useMemo(
    () => canRequestLateRemoval(record, lateRemovalRequests),
    [lateRemovalRequests, record],
  );
  const remaining = lateRemovalRemainingInMonth(lateRemovalRequests, record.employeeId, record.date);
  const countableLates = countableLateMarksInMonth(
    attendanceRecords,
    lateRemovalRequests,
    record.employeeId,
    record.date,
  );
  const existing = lateRemovalRequests.find(
    (item) => item.attendanceId === record.id && item.status !== "CANCELLED",
  );

  if (!(record.lateMinutes > 0) && !existing) {
    return null;
  }

  async function submit() {
    setSubmitting(true);
    try {
      await lateRemovalService.createRequest(record.id, reason);
      toast.success("Late removal request sent to admin.");
      setOpen(false);
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">
            Late mark{showDate ? ` · ${formatDate(record.date)}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            Late by {formatDuration(record.lateMinutes)}. Active work{" "}
            {formatDuration(record.activeWorkingMinutes)} / {record.requiredHours}h required.
          </p>
          <p className="text-xs text-muted-foreground">
            Countable lates this month: {countableLates}
            {countableLates >= LATE_MARKS_BEFORE_HALF_DAY
              ? ` (further lates are half day after ${LATE_MARKS_BEFORE_HALF_DAY} countable marks).`
              : ` (${LATE_MARKS_BEFORE_HALF_DAY - countableLates} more before half-day rule).`}
          </p>
          <p className="text-xs text-muted-foreground">
            Late removal requests left this month: {remaining}/{LATE_REMOVAL_MONTHLY_LIMIT}
          </p>
        </div>
        {existing ? <LeaveStatusBadge status={existing.status} /> : null}
      </div>

      {existing ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {existing.status === "PENDING"
            ? "Your request to remove this late mark is waiting for admin review."
            : existing.status === "APPROVED"
              ? "Admin removed this late mark and set the day to present."
              : `Request rejected${existing.rejectionReason ? `: ${existing.rejectionReason}` : "."}`}
        </p>
      ) : check.allowed ? (
        <div className="mt-3">
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            Request remove late mark
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Available because you completed {record.requiredHours}h after clock-out.
          </p>
        </div>
      ) : record.clockOut ? (
        <p className="mt-3 text-sm text-muted-foreground">{check.message}</p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Complete your {record.requiredHours}h active work and clock out to request late removal.
        </p>
      )}

      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title="Request late removal?"
        confirmLabel={submitting ? "Sending…" : "Send request"}
        description={
          <div className="space-y-3">
            <p>
              Ask admin to remove the late mark for {formatDate(record.date)} and set status to present.
              This uses 1 of your {LATE_REMOVAL_MONTHLY_LIMIT} monthly requests. Approved removals do not
              count toward the {LATE_MARKS_BEFORE_HALF_DAY} late → half-day rule.
            </p>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason (e.g. traffic delay, completed full shift)"
              rows={3}
            />
          </div>
        }
        onConfirm={() => {
          void submit();
        }}
      />
    </div>
  );
}
