"use client";

import { create } from "zustand";
import { createSeedData, type AppData } from "@/data/mock-data";
import { api } from "@/lib/api/client";
import { isWeeklyOff, resolveWorkPolicy } from "@/lib/attendance/work-calendar";
import { defaultLeaveBalance } from "@/lib/leave/policy";
import type { CompanySettings } from "@/types";

interface DataStore extends AppData {
  ready: boolean;
  hydrateFromApi: () => Promise<void>;
  reset: () => void;
  setData: (partial: Partial<AppData>) => void;
}

const empty = createSeedData();

export const useDataStore = create<DataStore>()((set) => ({
  ...empty,
  ready: false,
  hydrateFromApi: async () => {
    const data = await api.bootstrap();
    const settings: CompanySettings = {
      ...empty.settings,
      ...data.settings,
      ...resolveWorkPolicy({ ...empty.settings, ...data.settings }),
    };
    const employees = data.employees ?? [];
    const leaveBalanceByEmployee = new Map((data.leaveBalances ?? []).map((item) => [item.employeeId, item]));
    for (const employee of employees) {
      if (!leaveBalanceByEmployee.has(employee.id)) {
        leaveBalanceByEmployee.set(employee.id, defaultLeaveBalance(employee.id));
      }
    }
    set({
      ...data,
      settings,
      employees,
      attendanceRecords: (data.attendanceRecords ?? []).filter((record) => !isWeeklyOff(record.date, settings)),
      leaveBalances: [...leaveBalanceByEmployee.values()],
      ready: true,
    });
  },
  reset: () => set({ ...empty, ready: false }),
  setData: (partial) => set(partial),
}));

export function getData(): AppData {
  const state = useDataStore.getState();
  return {
    users: state.users,
    employees: state.employees,
    departments: state.departments,
    designations: state.designations,
    attendanceRecords: state.attendanceRecords,
    leaveBalances: state.leaveBalances,
    leaveRequests: state.leaveRequests,
    holidays: state.holidays,
    notifications: state.notifications,
    announcements: state.announcements,
    documents: state.documents,
    payrollRecords: state.payrollRecords,
    settings: state.settings,
  };
}

export function updateData(updater: (current: AppData) => Partial<AppData>): void {
  const current = getData();
  useDataStore.getState().setData(updater(current));
}
