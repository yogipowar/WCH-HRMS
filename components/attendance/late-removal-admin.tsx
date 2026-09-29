"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { LeaveStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatDuration } from "@/lib/attendance/calculations";
import { getEmployeeName } from "@/lib/lookups";
import { lateRemovalService } from "@/lib/services/lateRemovalService";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";
import { formatDate } from "@/lib/utils/format";
import type { LateRemovalRequest } from "@/types";

export function LateRemovalAdminPanel() {
  const user = useAuthStore((state) => state.user);
  const data = useDataStore();
  const [status, setStatus] = useState("PENDING");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = useMemo(() => {
    return (data.lateRemovalRequests ?? [])
      .filter((item) => status === "ALL" || item.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data.lateRemovalRequests, status]);

  if (!user || user.role !== "MANAGEMENT") return null;

  async function approve(row: LateRemovalRequest) {
    setBusyId(row.id);
    try {
      await lateRemovalService.updateStatus(row.id, "APPROVED", user!.id);
      toast.success("Late mark removed. Day set to present.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not approve request.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject() {
    if (!rejectId) return;
    setBusyId(rejectId);
    try {
      await lateRemovalService.updateStatus(rejectId, "REJECTED", user!.id, reason.trim() || "Rejected");
      toast.success("Late removal request rejected.");
      setRejectId(null);
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reject request.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Late removal requests</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Approve only when the employee completed their required hours after a late clock-in. Approved
            lates no longer count toward the monthly late / half-day rule.
          </p>
        </div>
        <select
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ALL">All</option>
        </select>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No late removal requests.</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{getEmployeeName(data, row.employeeId)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(row.attendanceDate)} · late {formatDuration(row.lateMinutes)} · worked{" "}
                    {formatDuration(row.activeWorkingMinutes)} / {row.requiredHours}h
                  </p>
                  <p className="mt-1 text-sm">{row.reason}</p>
                </div>
                <LeaveStatusBadge status={row.status} />
              </div>
              {row.status === "PENDING" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" disabled={busyId === row.id} onClick={() => void approve(row)}>
                    Approve → Present
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busyId === row.id}
                    onClick={() => setRejectId(row.id)}
                  >
                    Reject
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </CardContent>

      <ConfirmationDialog
        open={Boolean(rejectId)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectId(null);
            setReason("");
          }
        }}
        title="Reject late removal?"
        confirmLabel="Reject"
        destructive
        description={
          <div className="space-y-2">
            <p>The late mark will stay and continue to count toward the monthly late limit.</p>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Rejection reason"
              rows={3}
            />
          </div>
        }
        onConfirm={() => {
          void reject();
        }}
      />
    </Card>
  );
}
