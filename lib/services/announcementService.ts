import { api } from "@/lib/api/client";
import { createId } from "@/lib/lookups";
import { getData, updateData } from "@/lib/stores/data-store";
import { todayIsoDate } from "@/lib/utils/format";
import type { Announcement, Employee, User } from "@/types";

export function isAnnouncementVisibleTo(
  item: Announcement,
  user: Pick<User, "role">,
  employee?: Pick<Employee, "departmentId"> | null,
) {
  if (user.role === "MANAGEMENT") return true;
  if (item.status !== "PUBLISHED") return false;
  if (item.audience === "MANAGEMENT") return false;
  if (item.publishDate && item.publishDate > todayIsoDate()) return false;
  if (item.audience === "DEPARTMENT") {
    return Boolean(employee && item.departmentId === employee.departmentId);
  }
  return item.audience === "ALL" || item.audience === "EMPLOYEE";
}

export const announcementService = {
  getAnnouncements() {
    return getData().announcements;
  },
  getPublished() {
    return getData().announcements.filter((item) => item.status === "PUBLISHED");
  },
  getVisible(user: Pick<User, "role">, employee?: Pick<Employee, "departmentId"> | null) {
    return getData().announcements.filter((item) => isAnnouncementVisibleTo(item, user, employee));
  },
  async createAnnouncement(input: Omit<Announcement, "id">) {
    const announcement: Announcement = { ...input, id: createId("ann") };
    await api.createAnnouncement(announcement);
    updateData((data) => ({ announcements: [announcement, ...data.announcements] }));
    return announcement;
  },
  updateAnnouncement(id: string, patch: Partial<Announcement>) {
    updateData((data) => ({
      announcements: data.announcements.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
    const announcement = getData().announcements.find((item) => item.id === id);
    if (announcement) void api.updateAnnouncement(id, announcement);
  },
};
