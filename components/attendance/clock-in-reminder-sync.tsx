"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";

/** "19:00" or "19:00:00" from the employee record. Never opens a system settings screen. */
function clockValue(value: string | undefined) {
  if (!value) {
    return "";
  }
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return "";
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    return "";
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function ClockInReminderSync() {
  const user = useAuthStore((state) => state.user);
  const employees = useDataStore((state) => state.employees);
  const workStartTime = useDataStore((state) => state.settings.workStartTime);
  const ready = useDataStore((state) => state.ready);

  useEffect(() => {
    if (!ready || user?.role !== "EMPLOYEE" || !user.employeeId) {
      return;
    }
    const schedule = window.WchHrmsApp?.scheduleClockInReminder;
    if (!schedule) {
      return;
    }
    const employee = employees.find((item) => item.id === user.employeeId);
    const start = clockValue(employee?.workStartTime || workStartTime);
    if (!start) {
      return;
    }
    schedule(start);
  }, [employees, ready, user, workStartTime]);

  return null;
}
