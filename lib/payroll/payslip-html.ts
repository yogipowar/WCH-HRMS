import { AGENCY, LOGO_PATH } from "@/lib/constants";
import { amountInIndianWords } from "@/lib/payroll/amount-words";
import { currency, employmentTypeLabel, formatDate, formatPeriod } from "@/lib/utils/format";
import type { Employee, PayrollRecord } from "@/types";

export interface PayslipContent {
  record: PayrollRecord;
  employee: Employee;
  departmentName: string;
  designationName: string;
}

export function payslipTitle(record: PayrollRecord, employee: Employee) {
  return `Salary Slip · ${employee.fullName} · ${formatPeriod(record.period)}`;
}

export function payslipHtml({ record, employee, departmentName, designationName }: PayslipContent) {
  const periodLabel = formatPeriod(record.period);
  const logoSrc = typeof window === "undefined" ? LOGO_PATH : `${window.location.origin}${LOGO_PATH}`;

  return `
    <div style="width:100%;max-width:760px;margin:0 auto;background:#fff;color:#0f172a;border:1px solid #cbd5e1;font-family:Inter,Arial,sans-serif;">
      <div style="display:flex;justify-content:space-between;gap:24px;padding:22px 24px 18px;border-bottom:3px solid #0a3260;">
        <div style="display:flex;align-items:center;gap:14px;">
          <img src="${logoSrc}" alt="${AGENCY.name}" width="180" height="46" style="height:46px;width:auto;object-fit:contain;" />
        </div>
        <div style="text-align:right;font-size:12px;line-height:1.55;color:#334155;">
          <div style="font-size:16px;font-weight:700;color:#0a3260;">${AGENCY.name}</div>
          <div>${AGENCY.tagline}</div>
          <div>${AGENCY.address}</div>
          <div>${AGENCY.phone} · ${AGENCY.email}</div>
          <div>${AGENCY.website}</div>
        </div>
      </div>
      <div style="padding:16px 24px 8px;text-align:center;">
        <div style="font-size:18px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#0a3260;">Salary Slip</div>
        <div style="margin-top:4px;font-size:13px;color:#475569;">Pay period: ${periodLabel} · Status: ${record.status}</div>
      </div>
      <div style="padding:8px 24px 16px;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <tr>
            <td style="width:50%;padding:8px 10px;border:1px solid #e2e8f0;background:#f8fafc;"><strong>Employee name</strong><br>${employee.fullName}</td>
            <td style="width:50%;padding:8px 10px;border:1px solid #e2e8f0;background:#f8fafc;"><strong>Employee code</strong><br>${employee.employeeCode}</td>
          </tr>
          <tr>
            <td style="padding:8px 10px;border:1px solid #e2e8f0;"><strong>Designation</strong><br>${designationName}</td>
            <td style="padding:8px 10px;border:1px solid #e2e8f0;"><strong>Department</strong><br>${departmentName}</td>
          </tr>
          <tr>
            <td style="padding:8px 10px;border:1px solid #e2e8f0;background:#f8fafc;"><strong>Employment type</strong><br>${employmentTypeLabel(employee.employmentType)}</td>
            <td style="padding:8px 10px;border:1px solid #e2e8f0;background:#f8fafc;"><strong>Date of joining</strong><br>${formatDate(employee.joiningDate)}</td>
          </tr>
          <tr>
            <td style="padding:8px 10px;border:1px solid #e2e8f0;"><strong>Work email</strong><br>${employee.workEmail}</td>
            <td style="padding:8px 10px;border:1px solid #e2e8f0;"><strong>Bank</strong><br>${employee.bankInformation.bankName} · ${employee.bankInformation.accountNumber}</td>
          </tr>
        </table>
      </div>
      <div style="padding:0 24px 16px;display:flex;gap:16px;">
        <table style="flex:1;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#0a3260;color:#fff;">
              <th style="text-align:left;padding:8px 10px;">Earnings</th>
              <th style="text-align:right;padding:8px 10px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:8px 10px;border:1px solid #e2e8f0;">Basic salary</td>
              <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:right;">${currency(record.basicSalary)}</td>
            </tr>
            <tr>
              <td style="padding:8px 10px;border:1px solid #e2e8f0;">Allowances</td>
              <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:right;">${currency(record.allowances)}</td>
            </tr>
            <tr style="background:#f1f5f9;font-weight:700;">
              <td style="padding:8px 10px;border:1px solid #e2e8f0;">Gross earnings</td>
              <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:right;">${currency(record.grossSalary)}</td>
            </tr>
          </tbody>
        </table>
        <table style="flex:1;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#0a3260;color:#fff;">
              <th style="text-align:left;padding:8px 10px;">Deductions</th>
              <th style="text-align:right;padding:8px 10px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:8px 10px;border:1px solid #e2e8f0;">Statutory / other deductions</td>
              <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:right;">${currency(record.deductions)}</td>
            </tr>
            <tr>
              <td style="padding:8px 10px;border:1px solid #e2e8f0;">&nbsp;</td>
              <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:right;">&nbsp;</td>
            </tr>
            <tr style="background:#f1f5f9;font-weight:700;">
              <td style="padding:8px 10px;border:1px solid #e2e8f0;">Total deductions</td>
              <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:right;">${currency(record.deductions)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style="margin:0 24px 16px;padding:12px 14px;border:1px solid #0a3260;background:#f8fafc;">
        <div style="display:flex;justify-content:space-between;gap:16px;font-size:14px;font-weight:700;color:#0a3260;">
          <span>Net pay</span>
          <span>${currency(record.netSalary)}</span>
        </div>
        <div style="margin-top:6px;font-size:12px;color:#334155;">${amountInIndianWords(record.netSalary)}</div>
      </div>
      <div style="padding:0 24px 20px;font-size:11px;line-height:1.55;color:#64748b;">
        <div>${AGENCY.description}</div>
        <div style="margin-top:8px;">Office hours: ${AGENCY.hours}. This is a computer-generated salary slip from ${AGENCY.name}, ${AGENCY.city}, and does not require a physical signature.</div>
      </div>
    </div>
  `;
}

export function printPayslip(content: PayslipContent) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><title>${payslipTitle(content.record, content.employee)}</title>
    <style>
      @page { size: A4; margin: 12mm; }
      html, body { margin: 0; background: #fff; }
    </style>
  </head><body>${payslipHtml(content)}</body></html>`);
  doc.close();
  const cleanup = () => iframe.remove();
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  iframe.contentWindow?.addEventListener("afterprint", cleanup);
  window.setTimeout(cleanup, 1500);
}
