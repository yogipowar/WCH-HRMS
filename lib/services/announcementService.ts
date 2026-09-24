import { api } from "@/lib/api/client";
import { createId } from "@/lib/lookups";
import { getData, updateData } from "@/lib/stores/data-store";
import type { Announcement } from "@/types";

export const announcementService = {
  getAnnouncements() {
    return getData().announcements;
  },
  getPublished() {
    return getData().announcements.filter((item) => item.status === "PUBLISHED");
  },
  createAnnouncement(input: Omit<Announcement, "id">) {
    const announcement: Announcement = { ...input, id: createId("ann") };
    updateData((data) => ({ announcements: [announcement, ...data.announcements] }));
    void api.createAnnouncement(announcement);
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
