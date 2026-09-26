"use client";

import { toast } from "sonner";
import { NativeSelect } from "@/components/ui/native-select";
import { payrollService } from "@/lib/services/payrollService";
import { payrollStatusLabel } from "@/lib/utils/format";
import type { PayrollRecord } from "@/types";

const STATUSES: PayrollRecord["status"][] = ["DRAFT", "PROCESSED", "PAID"];

export function PayrollStatusControl({ record }: { record: PayrollRecord }) {
  return (
    <NativeSelect
      className="h-9 w-[128px] text-sm"
      value={record.status}
      aria-label="Payroll status"
      onChange={(event) => {
        const status = event.target.value as PayrollRecord["status"];
        payrollService.updateStatus(record.id, status);
        if (status === "PROCESSED") {
          toast.success("Salary slip released to the employee.");
        } else if (status === "PAID") {
          toast.success("Payroll marked as paid.");
        } else {
          toast.success("Salary slip hidden from the employee.");
        }
      }}
    >
      {STATUSES.map((status) => (
        <option key={status} value={status}>
          {payrollStatusLabel(status)}
        </option>
      ))}
    </NativeSelect>
  );
}
