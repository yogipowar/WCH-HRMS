import type { Employee, PayrollRecord } from "@/types";

export const PAYROLL_PERIODS = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"] as const;
export const CURRENT_PAYROLL_PERIOD = "2026-09";

export function payrollAmounts(employee: Pick<Employee, "basicSalary" | "allowances" | "deductions">) {
  const basicSalary = employee.basicSalary ?? 0;
  const allowances = employee.allowances ?? 0;
  const deductions = employee.deductions ?? 0;
  const grossSalary = basicSalary + allowances;
  return {
    basicSalary,
    allowances,
    deductions,
    grossSalary,
    netSalary: grossSalary - deductions,
  };
}

export function isPayslipReleased(record: Pick<PayrollRecord, "status" | "payslipAvailable">) {
  return record.payslipAvailable && (record.status === "PROCESSED" || record.status === "PAID");
}

export function buildPayrollRecord(
  employee: Employee,
  period = CURRENT_PAYROLL_PERIOD,
  status: PayrollRecord["status"] = period === CURRENT_PAYROLL_PERIOD ? "DRAFT" : "PAID",
): PayrollRecord {
  return {
    id: `pay-${employee.id}-${period}`,
    employeeId: employee.id,
    period,
    ...historicalAmounts(employee, period),
    status,
    payslipAvailable: status !== "DRAFT",
  };
}

export function buildPayrollHistory(employees: Employee[]): PayrollRecord[] {
  return PAYROLL_PERIODS.flatMap((period) =>
    employees
      .filter((employee) => employee.joiningDate.slice(0, 7) <= period)
      .map((employee) => buildPayrollRecord(employee, period)),
  );
}

function historicalAmounts(employee: Employee, period: string) {
  const amounts = payrollAmounts(employee);
  const offset = monthOffset(period, CURRENT_PAYROLL_PERIOD);
  if (offset <= 0 || employee.employmentType === "INTERN") {
    return amounts;
  }
  const step = offset >= 4 ? 2000 : offset >= 2 ? 1000 : 0;
  const basicSalary = Math.max(0, amounts.basicSalary - step);
  const grossSalary = basicSalary + amounts.allowances;
  return {
    ...amounts,
    basicSalary,
    grossSalary,
    netSalary: grossSalary - amounts.deductions,
  };
}

function monthOffset(period: string, current: string) {
  const [year, month] = period.split("-").map(Number);
  const [currentYear, currentMonth] = current.split("-").map(Number);
  return (currentYear - year) * 12 + (currentMonth - month);
}
