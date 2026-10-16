"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  pendingLateRemovalCount,
  readSeenAnnouncementIds,
  unseenAnnouncementCount,
  visibleEmployeeAnnouncements,
  writeSeenAnnouncementIds,
} from "@/lib/nav/badges";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";

export function useNavBadges() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const ready = useDataStore((state) => state.ready);
  const lateRemovalRequests = useDataStore((state) => state.lateRemovalRequests ?? []);
  const announcements = useDataStore((state) => state.announcements);
  const employees = useDataStore((state) => state.employees);
  const [seenTick, setSeenTick] = useState(0);

  const employee = employees.find((item) => item.id === user?.employeeId) ?? null;
  const visibleAnnouncements = useMemo(() => {
    if (!user || user.role !== "EMPLOYEE") return [];
    return visibleEmployeeAnnouncements(announcements, user, employee);
  }, [announcements, employee, user]);
  const visibleIds = useMemo(() => visibleAnnouncements.map((item) => item.id), [visibleAnnouncements]);

  useEffect(() => {
    if (!ready || !user || user.role !== "EMPLOYEE") return;
    if (readSeenAnnouncementIds(user.id) != null) return;
    writeSeenAnnouncementIds(user.id, visibleIds);
    setSeenTick((value) => value + 1);
  }, [ready, user, visibleIds]);

  useEffect(() => {
    if (!user || user.role !== "EMPLOYEE" || !pathname.startsWith("/announcements")) return;
    const seen = readSeenAnnouncementIds(user.id) ?? [];
    writeSeenAnnouncementIds(user.id, [...seen, ...visibleIds]);
    setSeenTick((value) => value + 1);
  }, [pathname, user, visibleIds]);

  return useMemo(() => {
    const counts = new Map<string, number>();
    if (!user) return counts;
    if (user.role === "MANAGEMENT") {
      const pending = pendingLateRemovalCount(lateRemovalRequests);
      if (pending > 0) counts.set("/attendance", pending);
    }
    if (user.role === "EMPLOYEE") {
      const unseen = unseenAnnouncementCount(user.id, visibleIds);
      if (unseen > 0) counts.set("/announcements", unseen);
    }
    return counts;
    // seenTick refreshes the unread count after localStorage changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lateRemovalRequests, seenTick, user, visibleIds]);
}
