import { api } from "@/lib/api/client";
import { CURRENT_PAYROLL_PERIOD, isPayslipReleased } from "@/lib/payroll/record";
import { getData, updateData } from "@/lib/stores/data-store";
import type { PayrollRecord } from "@/types";

export const payrollService = {
  getPayroll() {
    return getData().payrollRecords;
  },
  getByEmployee(employeeId: string) {
    return getData().payrollRecords.filter((item) => item.employeeId === employeeId);
  },
  getVisibleByEmployee(employeeId: string) {
    return this.getByEmployee(employeeId).filter(isPayslipReleased);
  },
  getCurrentPeriod() {
    return CURRENT_PAYROLL_PERIOD;
  },
  getPeriods() {
    return [...new Set(this.getPayroll().map((item) => item.period))].sort((a, b) => b.localeCompare(a));
  },
  updateStatus(id: string, status: PayrollRecord["status"]) {
    updateData((data) => ({
      payrollRecords: data.payrollRecords.map((item) =>
        item.id === id
          ? { ...item, status, payslipAvailable: status === "PROCESSED" || status === "PAID" }
          : item,
      ),
    }));
    const record = getData().payrollRecords.find((item) => item.id === id);
    if (record) void api.updatePayroll(id, record);
    return record ?? null;
  },
};
