"use client";

import { useState } from "react";
import { Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getDepartmentName, getDesignationName } from "@/lib/lookups";
import { payslipHtml, payslipTitle, printPayslip, type PayslipContent } from "@/lib/payroll/payslip-html";
import type { AppData } from "@/data/mock-data";
import type { Employee, PayrollRecord } from "@/types";

export function payslipContentFor(
  data: AppData,
  record: PayrollRecord,
  employee?: Employee,
): PayslipContent | null {
  const match = employee ?? data.employees.find((item) => item.id === record.employeeId);
  if (!match) return null;
  return {
    record,
    employee: match,
    departmentName: getDepartmentName(data, match.departmentId),
    designationName: getDesignationName(data, match.designationId),
  };
}

export function PayslipActions({
  data,
  record,
  employee,
}: {
  data: AppData;
  record: PayrollRecord;
  employee?: Employee;
}) {
  const [open, setOpen] = useState(false);
  const content = payslipContentFor(data, record, employee);
  if (!content || !record.payslipAvailable) {
    return <span className="text-sm text-muted-foreground">Unavailable</span>;
  }

  return (
    <div className="flex flex-nowrap items-center gap-1">
      <Button size="icon-sm" variant="outline" aria-label="View salary slip" onClick={() => setOpen(true)}>
        <Eye />
      </Button>
      <Button size="icon-sm" aria-label="Download salary slip" onClick={() => printPayslip(content)}>
        <Download />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{payslipTitle(content.record, content.employee)}</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: payslipHtml(content) }} />
          <div className="flex justify-end">
            <Button onClick={() => printPayslip(content)}>Download</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
