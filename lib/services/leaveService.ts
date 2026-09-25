import { api } from "@/lib/api/client";
import { BASE_PATH } from "@/lib/constants";
import { applyLeaveToBalance, defaultLeaveBalance, leaveDaysUsed, paidLeaveKey } from "@/lib/leave/policy";
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
    return getData().leaveBalances.find((item) => item.employeeId === employeeId) ?? defaultLeaveBalance(employeeId);
  },
  leaveAttachmentHref(id: string) {
    return `${BASE_PATH}/api/leave/${id}/attachment`;
  },
  async createLeaveRequest(input: {
    employeeId: string;
    type: LeaveType;
    startDate: string;
    endDate: string;
    isHalfDay: boolean;
    reason: string;
    file?: File | null;
  }) {
    const key = paidLeaveKey(input.type);
    if (key) {
      const balance = this.getBalance(input.employeeId);
      const days = leaveDaysUsed(input);
      if (balance[key] < days) {
        throw new Error(`Not enough ${key} leave remaining.`);
      }
    }
    const body = new FormData();
    body.append("employeeId", input.employeeId);
    body.append("type", input.type);
    body.append("startDate", input.startDate);
    body.append("endDate", input.isHalfDay ? input.startDate : input.endDate);
    body.append("isHalfDay", input.isHalfDay ? "true" : "false");
    body.append("reason", input.reason);
    if (input.file) {
      body.append("file", input.file);
    }
    const request = await api.createLeave(body);
    updateData((data) => ({ leaveRequests: [request, ...data.leaveRequests] }));
    return request;
  },
  updateLeaveStatus(
    id: string,
    status: Extract<LeaveStatus, "APPROVED" | "REJECTED" | "CANCELLED">,
    reviewedBy: string | null,
    rejectionReason: string | null = null,
  ) {
    updateData((data) => {
      const current = data.leaveRequests.find((item) => item.id === id);
      if (!current) {
        return {};
      }
      const leaveRequests = data.leaveRequests.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              reviewedBy,
              reviewedAt: new Date().toISOString(),
              rejectionReason,
            }
          : item,
      );
      let leaveBalances = data.leaveBalances;
      if (current.status !== "APPROVED" && status === "APPROVED") {
        leaveBalances = data.leaveBalances.map((item) =>
          item.employeeId === current.employeeId ? applyLeaveToBalance(item, current, "deduct") : item,
        );
      }
      if (current.status === "APPROVED" && status !== "APPROVED") {
        leaveBalances = data.leaveBalances.map((item) =>
          item.employeeId === current.employeeId ? applyLeaveToBalance(item, current, "restore") : item,
        );
      }
      const request = leaveRequests.find((item) => item.id === id);
      const balance = leaveBalances.find((item) => item.employeeId === current.employeeId);
      if (request) {
        void api.updateLeaveStatus(id, { request, balance });
      }
      return { leaveRequests, leaveBalances };
    });
  },
};
