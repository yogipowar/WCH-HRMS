"use client";

import { PanelLeft } from "lucide-react";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { GlobalSearch } from "@/components/layout/global-search";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationDropdown } from "@/components/layout/notification-dropdown";
import { ThemePicker } from "@/components/layout/theme-picker";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import type { User } from "@/types";

interface AppHeaderProps {
  user: User;
  onLogout: () => void;
}

export function AppHeader({ user, onLogout }: AppHeaderProps) {
  const collapsed = useSidebarStore((state) => state.collapsed);
  const toggle = useSidebarStore((state) => state.toggle);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <MobileNav role={user.role} />
          {collapsed ? (
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex"
              onClick={toggle}
              aria-label="Expand sidebar"
            >
              <PanelLeft />
            </Button>
          ) : null}
          <div className="hidden min-w-0 md:block">
            <AppBreadcrumbs />
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <GlobalSearch user={user} />
          <ThemePicker />
          <NotificationDropdown userId={user.id} />
          <UserMenu user={user} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}
