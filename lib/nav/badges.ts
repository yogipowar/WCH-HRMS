import { isAnnouncementVisibleTo } from "@/lib/services/announcementService";
import type { Announcement, Employee, LateRemovalRequest, User } from "@/types";

const SEEN_ANNOUNCEMENTS_KEY = "wch-hrms.seen-announcements";

function storageKey(userId: string) {
  return `${SEEN_ANNOUNCEMENTS_KEY}.${userId}`;
}

/** null means this account has not opened announcements since badges were added. */
export function readSeenAnnouncementIds(userId: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (raw == null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function writeSeenAnnouncementIds(userId: string, ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify([...new Set(ids)]));
}

export function visibleEmployeeAnnouncements(
  announcements: Announcement[],
  user: Pick<User, "role">,
  employee?: Pick<Employee, "departmentId"> | null,
) {
  return announcements.filter((item) => isAnnouncementVisibleTo(item, user, employee));
}

export function pendingLateRemovalCount(requests: LateRemovalRequest[]) {
  return requests.filter((item) => item.status === "PENDING").length;
}

export function formatNavCount(count: number) {
  if (count > 99) return "99+";
  return String(count);
}

export function unseenAnnouncementCount(userId: string, visibleIds: string[]) {
  const seen = readSeenAnnouncementIds(userId);
  if (seen == null) return 0;
  const seenIds = new Set(seen);
  return visibleIds.filter((id) => !seenIds.has(id)).length;
}
