"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import {
  adminAttendanceEditOpen,
  officeTimeValue,
  type AdminBreakInput,
  type AdminTimeInput,
} from "@/lib/attendance/admin-adjust";
import { createId } from "@/lib/lookups";
import { attendanceService } from "@/lib/services/attendanceService";
import type { AttendanceRecord, BreakType } from "@/types";

function draftFrom(record: AttendanceRecord): AdminTimeInput {
  return {
    clockIn: officeTimeValue(record.clockIn),
    clockOut: officeTimeValue(record.clockOut),
    breaks: record.breaks.map((item) => ({
      id: item.id,
      type: item.type,
      start: officeTimeValue(item.startTime),
      end: officeTimeValue(item.endTime),
    })),
  };
}

export function AdminAttendanceTimeEditor({ record }: { record: AttendanceRecord }) {
  const [draft, setDraft] = useState<AdminTimeInput>(() => draftFrom(record));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!adminAttendanceEditOpen()) return null;

  function updateBreak(id: string, patch: Partial<AdminBreakInput>) {
    setSaved(false);
    setDraft((current) => ({
      ...current,
      breaks: current.breaks.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function addBreak(type: BreakType) {
    setSaved(false);
    setDraft((current) => ({
      ...current,
      breaks: [...current.breaks, { id: createId("brk"), type, start: "", end: "" }],
    }));
  }

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await attendanceService.adjustTimes(record.id, draft);
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof ApiError || caught instanceof Error ? caught.message : "Could not save these times.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed bg-muted/30 p-3">
      <div>
        <p className="text-sm font-medium">Correct times</p>
        <p className="text-xs text-muted-foreground">
          Admins can change clock-in, clock-out, lunch, and personal breaks until 30 Oct 2026. This option closes after that date.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${record.id}-in`}>Clock in</Label>
          <Input
            id={`${record.id}-in`}
            type="time"
            value={draft.clockIn}
            onChange={(event) => {
              setSaved(false);
              setDraft((current) => ({ ...current, clockIn: event.target.value }));
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${record.id}-out`}>Clock out</Label>
          <Input
            id={`${record.id}-out`}
            type="time"
            value={draft.clockOut}
            onChange={(event) => {
              setSaved(false);
              setDraft((current) => ({ ...current, clockOut: event.target.value }));
            }}
          />
        </div>
      </div>
      {draft.breaks.map((item, index) => (
        <div key={item.id} className="grid gap-2 sm:grid-cols-[9rem_1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor={`${item.id}-type`}>Break {index + 1}</Label>
            <select
              id={`${item.id}-type`}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={item.type}
              onChange={(event) => updateBreak(item.id, { type: event.target.value as BreakType })}
            >
              <option value="LUNCH">Lunch</option>
              <option value="PERSONAL">Personal</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${item.id}-start`}>Start</Label>
            <Input
              id={`${item.id}-start`}
              type="time"
              value={item.start}
              onChange={(event) => updateBreak(item.id, { start: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${item.id}-end`}>End</Label>
            <Input
              id={`${item.id}-end`}
              type="time"
              value={item.end}
              onChange={(event) => updateBreak(item.id, { end: event.target.value })}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => {
              setSaved(false);
              setDraft((current) => ({ ...current, breaks: current.breaks.filter((entry) => entry.id !== item.id) }));
            }}
          >
            Remove
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => addBreak("LUNCH")}>
          Add lunch break
        </Button>
        <Button type="button" variant="outline" onClick={() => addBreak("PERSONAL")}>
          Add personal break
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p className="text-sm text-muted-foreground">Times saved.</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving..." : "Save times"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => {
            setDraft(draftFrom(record));
            setError("");
            setSaved(false);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
