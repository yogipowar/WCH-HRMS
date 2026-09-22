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

export function defaultLeaveBalance(employeeId: string): LeaveBalance {
  return {
    employeeId,
    casual: YEARLY_PAID_LEAVES.casual,
    sick: YEARLY_PAID_LEAVES.sick,
    privilege: YEARLY_PAID_LEAVES.privilege,
  };
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

export function remainingFromApproved(employeeId: string, requests: LeaveRequest[]): LeaveBalance {
  return requests
    .filter((item) => item.employeeId === employeeId && item.status === "APPROVED")
    .reduce((balance, request) => applyLeaveToBalance(balance, request, "deduct"), defaultLeaveBalance(employeeId));
}

export function normalizeLeaveType(type: string): LeaveType {
  if (type === "EARNED") return "PRIVILEGE";
  if (type === "OTHER") return "CASUAL";
  if (type === "CASUAL" || type === "SICK" || type === "PRIVILEGE" || type === "UNPAID") {
    return type;
  }
  return "CASUAL";
}
