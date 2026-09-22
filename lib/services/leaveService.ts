import { createId } from "@/lib/lookups";
import { getData, updateData } from "@/lib/stores/data-store";
import type { LeaveRequest, LeaveStatus, LeaveType } from "@/types";

export const leaveService = {
  getLeaveRequests() {
    return getData().leaveRequests;
  },
  getLeaveByEmployee(employeeId: string) {
    return getData().leaveRequests.filter((item) => item.employeeId === employeeId);
  },
  getLeaveById(id: string) {
    return getData().leaveRequests.find((item) => item.id === id) ?? null;
  },
  getBalance(employeeId: string) {
    return (
      getData().leaveBalances.find((item) => item.employeeId === employeeId) ?? {
        employeeId,
        casual: 0,
        sick: 0,
        earned: 0,
        unpaid: 0,
        other: 0,
      }
    );
  },
  createLeaveRequest(input: {
    employeeId: string;
    type: LeaveType;
    startDate: string;
    endDate: string;
    isHalfDay: boolean;
    reason: string;
    attachmentName: string | null;
  }) {
    const request: LeaveRequest = {
      id: createId("leave"),
      status: "PENDING",
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date().toISOString(),
      ...input,
    };
    updateData((data) => ({ leaveRequests: [request, ...data.leaveRequests] }));
    return request;
  },
  updateLeaveStatus(
    id: string,
    status: Extract<LeaveStatus, "APPROVED" | "REJECTED" | "CANCELLED">,
    reviewedBy: string | null,
    rejectionReason: string | null = null,
  ) {
    updateData((data) => ({
      leaveRequests: data.leaveRequests.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              reviewedBy,
              reviewedAt: new Date().toISOString(),
              rejectionReason,
            }
          : item,
      ),
    }));
  },
};
