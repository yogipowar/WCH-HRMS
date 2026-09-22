import { getData, updateData } from "@/lib/stores/data-store";

export const notificationService = {
  getNotifications(userId: string) {
    return getData()
      .notifications.filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  markAsRead(id: string) {
    updateData((data) => ({
      notifications: data.notifications.map((item) =>
        item.id === id ? { ...item, read: true } : item,
      ),
    }));
  },
  markAllAsRead(userId: string) {
    updateData((data) => ({
      notifications: data.notifications.map((item) =>
        item.userId === userId ? { ...item, read: true } : item,
      ),
    }));
  },
};
