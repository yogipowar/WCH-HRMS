import { daysBetweenInclusive } from "@/lib/utils/format";
import type { LeaveBalance, LeaveRequest, LeaveType } from "@/types";

export const YEARLY_PAID_LEAVES = {
  casual: 6,
  sick: 6,
  privilege: 3,
} as const;

export const YEARLY_PAID_LEAVE_TOTAL =
  YEARLY_PAID_LEAVES.casual + YEARLY_PAID_LEAVES.sick + YEARLY_PAID_LEAVES.privilege;

export const YEARLY_PAID_LEAVE_LABEL = `${YEARLY_PAID_LEAVE_TOTAL} Paid Leaves = ${YEARLY_PAID_LEAVES.casual} CL + ${YEARLY_PAID_LEAVES.sick} SL + ${YEARLY_PAID_LEAVES.privilege} PL`;

export type PaidLeaveKey = keyof typeof YEARLY_PAID_LEAVES;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatLeaveDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[(month || 1) - 1]} ${year}`;
}

/** Leave year runs 1 April through 31 March. Unused days are not carried forward. */
export function currentLeaveYearStart(now = new Date()): string {
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return isoDate(year, 4, 1);
}

export function currentLeaveYearEnd(now = new Date()): string {
  const startYear = Number(currentLeaveYearStart(now).slice(0, 4));
  return isoDate(startYear + 1, 3, 31);
}

export function leaveYearLabel(now = new Date()): string {
  return `${formatLeaveDate(currentLeaveYearStart(now))} – ${formatLeaveDate(currentLeaveYearEnd(now))}`;
}

export function isInCurrentLeaveYear(iso: string, now = new Date()): boolean {
  return iso >= currentLeaveYearStart(now) && iso <= currentLeaveYearEnd(now);
}

export type SpentLeaves = {
  casual: number;
  sick: number;
  privilege: number;
};

function clampSpent(days: number, key: PaidLeaveKey): number {
  const value = Number.isFinite(days) ? days : 0;
  return Math.min(YEARLY_PAID_LEAVES[key], Math.max(0, value));
}

export function defaultLeaveBalance(employeeId: string, now = new Date()): LeaveBalance {
  return {
    employeeId,
    casual: YEARLY_PAID_LEAVES.casual,
    sick: YEARLY_PAID_LEAVES.sick,
    privilege: YEARLY_PAID_LEAVES.privilege,
    spentCasual: 0,
    spentSick: 0,
    spentPrivilege: 0,
    yearStart: currentLeaveYearStart(now),
  };
}

export function leaveBalanceFromSpent(
  employeeId: string,
  spent: SpentLeaves,
  requests: LeaveRequest[] = [],
  now = new Date(),
): LeaveBalance {
  const spentCasual = clampSpent(spent.casual, "casual");
  const spentSick = clampSpent(spent.sick, "sick");
  const spentPrivilege = clampSpent(spent.privilege, "privilege");
  const opening: LeaveBalance = {
    ...defaultLeaveBalance(employeeId, now),
    casual: Number((YEARLY_PAID_LEAVES.casual - spentCasual).toFixed(1)),
    sick: Number((YEARLY_PAID_LEAVES.sick - spentSick).toFixed(1)),
    privilege: Number((YEARLY_PAID_LEAVES.privilege - spentPrivilege).toFixed(1)),
    spentCasual,
    spentSick,
    spentPrivilege,
  };
  const start = currentLeaveYearStart(now);
  const end = currentLeaveYearEnd(now);
  return requests
    .filter(
      (item) =>
        item.employeeId === employeeId &&
        item.status === "APPROVED" &&
        item.startDate >= start &&
        item.startDate <= end,
    )
    .reduce((balance, request) => applyLeaveToBalance(balance, request, "deduct"), opening);
}

export function balanceForCurrentLeaveYear(balance: LeaveBalance, now = new Date()): LeaveBalance {
  const start = currentLeaveYearStart(now);
  if (balance.yearStart && balance.yearStart < start) {
    return defaultLeaveBalance(balance.employeeId, now);
  }
  return { ...balance, yearStart: balance.yearStart || start };
}

export function paidLeaveKey(type: LeaveType): PaidLeaveKey | null {
  if (type === "CASUAL") return "casual";
  if (type === "SICK") return "sick";
  if (type === "PRIVILEGE") return "privilege";
  return null;
}

export function leaveDaysUsed(request: Pick<LeaveRequest, "startDate" | "endDate" | "isHalfDay">): number {
  return request.isHalfDay ? 0.5 : daysBetweenInclusive(request.startDate, request.endDate);
}

export function remainingPaidDays(balance: LeaveBalance): number {
  return balance.casual + balance.sick + balance.privilege;
}

export function applyLeaveToBalance(
  balance: LeaveBalance,
  request: Pick<LeaveRequest, "type" | "startDate" | "endDate" | "isHalfDay">,
  direction: "deduct" | "restore" = "deduct",
): LeaveBalance {
  const key = paidLeaveKey(request.type);
  if (!key) {
    return balance;
  }
  const days = leaveDaysUsed(request);
  const next = direction === "deduct" ? balance[key] - days : balance[key] + days;
  return {
    ...balance,
    [key]: Math.max(0, Math.min(YEARLY_PAID_LEAVES[key], Number(next.toFixed(1)))),
  };
}

export function remainingFromApproved(employeeId: string, requests: LeaveRequest[], now = new Date()): LeaveBalance {
  const start = currentLeaveYearStart(now);
  const end = currentLeaveYearEnd(now);
  return requests
    .filter(
      (item) =>
        item.employeeId === employeeId &&
        item.status === "APPROVED" &&
        item.startDate >= start &&
        item.startDate <= end,
    )
    .reduce((balance, request) => applyLeaveToBalance(balance, request, "deduct"), defaultLeaveBalance(employeeId, now));
}

export function normalizeLeaveType(type: string): LeaveType {
  if (type === "EARNED") return "PRIVILEGE";
  if (type === "OTHER") return "CASUAL";
  if (type === "CASUAL" || type === "SICK" || type === "PRIVILEGE" || type === "UNPAID") {
    return type;
  }
  return "CASUAL";
}
