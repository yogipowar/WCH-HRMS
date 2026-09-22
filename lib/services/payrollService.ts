import { getData } from "@/lib/stores/data-store";
import { CURRENT_PAYROLL_PERIOD } from "@/lib/payroll/record";

export const payrollService = {
  getPayroll() {
    return getData().payrollRecords;
  },
  getByEmployee(employeeId: string) {
    return getData().payrollRecords.filter((item) => item.employeeId === employeeId);
  },
  getCurrentPeriod() {
    return CURRENT_PAYROLL_PERIOD;
  },
  getPeriods() {
    return [...new Set(this.getPayroll().map((item) => item.period))].sort((a, b) => b.localeCompare(a));
  },
};
