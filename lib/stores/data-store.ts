"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSeedData, type AppData } from "@/data/mock-data";
import { isWeeklyOff, resolveWorkPolicy } from "@/lib/attendance/work-calendar";
import { STORAGE_KEYS } from "@/lib/constants";
import { buildPayrollRecord, CURRENT_PAYROLL_PERIOD, payrollAmounts } from "@/lib/payroll/record";
import type { CompanySettings, Employee, User } from "@/types";

interface DataStore extends AppData {
  hydrateFromSeed: () => void;
  setData: (partial: Partial<AppData>) => void;
}

export const useDataStore = create<DataStore>()(
  persist(
    (set) => ({
      ...createSeedData(),
      hydrateFromSeed: () => set(createSeedData()),
      setData: (partial) => set(partial),
    }),
    {
      name: STORAGE_KEYS.data,
      partialize: (state) => ({
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
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<AppData>;
        const settings: CompanySettings = {
          ...currentState.settings,
          ...persisted.settings,
          ...resolveWorkPolicy({ ...currentState.settings, ...persisted.settings }),
        };
        const attendanceRecords = (persisted.attendanceRecords ?? currentState.attendanceRecords).filter(
          (record) => !isWeeklyOff(record.date, settings),
        );
        const employees = (persisted.employees ?? currentState.employees).map((item) =>
          withEmployeeSalary(item, currentState.employees.find((seed) => seed.id === item.id)),
        );
        const users = (persisted.users ?? currentState.users).map((item) =>
          withUserLogin(item, currentState.users.find((seed) => seed.id === item.id)),
        );
        const payrollById = new Map(
          (currentState.payrollRecords ?? []).map((item) => [item.id, item]),
        );
        for (const record of persisted.payrollRecords ?? []) {
          payrollById.set(record.id, record);
        }
        for (const employee of employees) {
          const currentId = `pay-${employee.id}-${CURRENT_PAYROLL_PERIOD}`;
          const existing = payrollById.get(currentId);
          payrollById.set(
            currentId,
            existing
              ? { ...existing, ...payrollAmounts(employee) }
              : buildPayrollRecord(employee, CURRENT_PAYROLL_PERIOD),
          );
        }
        const payrollRecords = [...payrollById.values()];
        return {
          ...currentState,
          ...persisted,
          settings,
          attendanceRecords,
          employees,
          users,
          payrollRecords,
        };
      },
    },
  ),
);

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

function withUserLogin(user: User, seed?: User): User {
  return {
    ...user,
    username: user.username || seed?.username || "",
    password: user.password || seed?.password || "",
  };
}

function withEmployeeSalary(employee: Employee, seed?: Employee): Employee {
  if (typeof employee.basicSalary === "number") {
    return {
      ...employee,
      allowances: employee.allowances ?? 0,
      deductions: employee.deductions ?? 0,
    };
  }
  return {
    ...employee,
    basicSalary: seed?.basicSalary ?? 0,
    allowances: seed?.allowances ?? 0,
    deductions: seed?.deductions ?? 0,
  };
}
