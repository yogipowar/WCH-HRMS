"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notificationService } from "@/lib/services/notificationService";
import { useDataStore } from "@/lib/stores/data-store";
import { formatDateTime } from "@/lib/utils/format";

export function NotificationDropdown({ userId }: { userId: string }) {
  const notifications = useDataStore((state) => state.notifications);
  const mine = useMemo(
    () => notifications.filter((item) => item.userId === userId),
    [notifications, userId],
  );
  const unread = mine.filter((item) => !item.read).length;
  const recent = useMemo(
    () => [...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [mine],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
            <Bell />
            {unread > 0 ? (
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
            ) : null}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifications</span>
            {unread > 0 ? (
              <button
                type="button"
                className="text-xs font-medium text-primary"
                onClick={() => notificationService.markAllAsRead(userId)}
              >
                Mark all as read
              </button>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {recent.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          recent.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="items-start"
              onClick={() => notificationService.markAsRead(item.id)}
            >
              <Link href={item.href ?? "/notifications"} className="block w-full">
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.message}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(item.createdAt)}</p>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/notifications" />}>View all notifications</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
