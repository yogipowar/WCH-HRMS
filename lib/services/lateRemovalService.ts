import { canRequestLateRemoval } from "@/lib/attendance/late-policy";
import { api } from "@/lib/api/client";
import { createId } from "@/lib/lookups";
import { getData, updateData } from "@/lib/stores/data-store";
import type { LateRemovalRequest, LeaveStatus, Notification } from "@/types";

function buildAdminNotifications(title: string, message: string): Notification[] {
  return getData()
    .users.filter((user) => user.role === "MANAGEMENT")
    .map((user) => ({
      id: createId("ntf"),
      userId: user.id,
      type: "LATE_REMOVAL_PENDING" as const,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
      href: "/attendance",
    }));
}

export const lateRemovalService = {
  getRequests() {
    return getData().lateRemovalRequests;
  },
  getByEmployee(employeeId: string) {
    return getData().lateRemovalRequests.filter((item) => item.employeeId === employeeId);
  },
  async createRequest(attendanceId: string, reason: string) {
    const data = getData();
    const record = data.attendanceRecords.find((item) => item.id === attendanceId);
    if (!record) {
      throw new Error("Attendance record not found.");
    }
    const check = canRequestLateRemoval(record, data.lateRemovalRequests);
    if (!check.allowed) {
      throw new Error(check.message);
    }
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      throw new Error("Please add a short reason (at least 5 characters).");
    }

    const request: LateRemovalRequest = {
      id: createId("lrr"),
      employeeId: record.employeeId,
      attendanceId: record.id,
      attendanceDate: record.date,
      lateMinutes: record.lateMinutes,
      activeWorkingMinutes: record.activeWorkingMinutes,
      requiredHours: record.requiredHours,
      reason: trimmed,
      status: "PENDING",
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date().toISOString(),
    };

    const employee = data.employees.find((item) => item.id === record.employeeId);
    const adminNotes = buildAdminNotifications(
      "Late removal request",
      `${employee?.fullName ?? "An employee"} requested to remove a late mark for ${record.date}.`,
    );

    const saved = await api.createLateRemoval({ request, notifications: adminNotes });
    updateData((store) => ({
      lateRemovalRequests: [
        saved.request,
        ...store.lateRemovalRequests.filter((item) => item.id !== saved.request.id),
      ],
      notifications: [...(saved.notifications ?? adminNotes), ...store.notifications],
    }));
    return saved.request;
  },
  async updateStatus(
    id: string,
    status: Extract<LeaveStatus, "APPROVED" | "REJECTED">,
    reviewedBy: string,
    rejectionReason: string | null = null,
  ) {
    const data = getData();
    const current = data.lateRemovalRequests.find((item) => item.id === id);
    if (!current || current.status !== "PENDING") {
      throw new Error("This request is no longer pending.");
    }

    const updatedRequest: LateRemovalRequest = {
      ...current,
      status,
      reviewedBy,
      reviewedAt: new Date().toISOString(),
      rejectionReason: status === "REJECTED" ? rejectionReason : null,
    };

    let attendance = data.attendanceRecords.find((item) => item.id === current.attendanceId) ?? null;
    if (status === "APPROVED" && attendance) {
      attendance = {
        ...attendance,
        lateMinutes: 0,
        status: attendance.clockOut ? "PRESENT" : attendance.status,
        notes: attendance.notes
          ? `${attendance.notes} | Late mark removed by admin`
          : "Late mark removed by admin",
      };
    }

    const employee = data.employees.find((item) => item.id === current.employeeId);
    const employeeNotifications: Notification[] = employee?.userId
      ? [
          {
            id: createId("ntf"),
            userId: employee.userId,
            type: status === "APPROVED" ? "LATE_REMOVAL_APPROVED" : "LATE_REMOVAL_REJECTED",
            title: status === "APPROVED" ? "Late mark removed" : "Late removal rejected",
            message:
              status === "APPROVED"
                ? `Your late mark for ${current.attendanceDate} was removed and marked present.`
                : `Your late removal request for ${current.attendanceDate} was rejected${
                    rejectionReason ? `: ${rejectionReason}` : "."
                  }`,
            read: false,
            createdAt: new Date().toISOString(),
            href: "/attendance",
          },
        ]
      : [];

    const saved = await api.updateLateRemovalStatus(id, {
      request: updatedRequest,
      attendance,
      notifications: employeeNotifications,
    });

    updateData((store) => ({
      lateRemovalRequests: store.lateRemovalRequests.map((item) =>
        item.id === id ? saved.request : item,
      ),
      attendanceRecords: saved.attendance
        ? store.attendanceRecords.map((item) =>
            item.id === saved.attendance!.id ? saved.attendance! : item,
          )
        : store.attendanceRecords,
      notifications: [...(saved.notifications ?? employeeNotifications), ...store.notifications],
    }));
  },
};
