import { getData, updateData } from "@/lib/stores/data-store";
import { createId } from "@/lib/lookups";
import { isUsernameTaken } from "@/lib/auth/credentials";
import { defaultLeaveBalance } from "@/lib/leave/policy";
import { buildPayrollRecord, CURRENT_PAYROLL_PERIOD, payrollAmounts } from "@/lib/payroll/record";
import type { Employee } from "@/types";

interface EmployeeLogin {
  username: string;
  password?: string;
}

export const employeeService = {
  getEmployees() {
    return getData().employees;
  },
  getEmployeeById(id: string) {
    return getData().employees.find((item) => item.id === id) ?? null;
  },
  getEmployeeByCode(code: string) {
    return getData().employees.find((item) => item.employeeCode === code) ?? null;
  },
  createEmployee(input: Omit<Employee, "id">, login: { username: string; password: string }) {
    if (isUsernameTaken(login.username)) {
      throw new Error("This username is already taken.");
    }
    const employee: Employee = { ...input, id: createId("emp") };
    const userId = input.userId || createId("user");
    updateData((data) => ({
      employees: [...data.employees, { ...employee, userId }],
      users: [
        ...data.users,
        {
          id: userId,
          name: input.fullName,
          email: input.workEmail,
          phone: input.phone,
          role: "EMPLOYEE",
          employeeId: employee.id,
          avatarUrl: input.avatarUrl,
          username: login.username.trim(),
          password: login.password,
        },
      ],
      leaveBalances: [
        ...data.leaveBalances,
        defaultLeaveBalance(employee.id),
      ],
      payrollRecords: [...data.payrollRecords, buildPayrollRecord({ ...employee, userId })],
    }));
    return { ...employee, userId };
  },
  updateEmployee(id: string, patch: Partial<Employee>, login?: EmployeeLogin) {
    if (login?.username) {
      const employee = getData().employees.find((item) => item.id === id);
      if (isUsernameTaken(login.username, employee?.userId)) {
        throw new Error("This username is already taken.");
      }
    }
    updateData((data) => {
      const employees = data.employees.map((item) => (item.id === id ? { ...item, ...patch } : item));
      const employee = employees.find((item) => item.id === id);
      if (!employee) {
        return { employees };
      }
      const amounts = payrollAmounts(employee);
      const hasCurrent = data.payrollRecords.some(
        (item) => item.employeeId === id && item.period === CURRENT_PAYROLL_PERIOD,
      );
      const users = data.users.map((user) => {
        if (user.id !== employee.userId) return user;
        return {
          ...user,
          name: employee.fullName,
          email: employee.workEmail,
          phone: employee.phone,
          avatarUrl: employee.avatarUrl,
          username: login?.username?.trim() || user.username,
          password: login?.password || user.password,
        };
      });
      return {
        employees,
        users,
        payrollRecords: hasCurrent
          ? data.payrollRecords.map((item) =>
              item.employeeId === id && item.period === CURRENT_PAYROLL_PERIOD ? { ...item, ...amounts } : item,
            )
          : [...data.payrollRecords, buildPayrollRecord(employee)],
      };
    });
  },
  deactivateEmployee(id: string) {
    this.updateEmployee(id, { status: "INACTIVE" });
  },
};
