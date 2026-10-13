"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import { getEmployeeByUser } from "@/lib/lookups";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";

/** Tells the Android app each employee's own work start so it can remind them with the app closed. */
export function ClockInReminderSync() {
  const user = useAuthStore((state) => state.user);
  const data = useDataStore();

  useEffect(() => {
    if (!data.ready || user?.role !== "EMPLOYEE") return;
    const schedule = window.WchHrmsApp?.scheduleClockInReminder;
    if (typeof schedule !== "function") return;
    const employee = getEmployeeByUser(data, user.id);
    const workStart = employee?.workStartTime || data.settings.workStartTime;
    if (!workStart) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const clockedIn = data.attendanceRecords.some(
      (record) => record.employeeId === employee?.id && record.date === today && record.clockIn,
    );
    if (clockedIn) {
      window.WchHrmsApp?.markClockedInToday?.();
    }
    schedule(workStart);
  }, [data, user]);

  return null;
}
