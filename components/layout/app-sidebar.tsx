"use client";

import { BrandLogo } from "@/components/brand/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import { PanelLeft, PanelLeftClose } from "lucide-react";

export function AppSidebar({ role }: { role: UserRole }) {
  const collapsed = useSidebarStore((state) => state.collapsed);
  const toggle = useSidebarStore((state) => state.toggle);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 border-r bg-sidebar transition-[width] duration-200 lg:flex lg:flex-col",
        collapsed ? "w-[72px]" : "w-72",
      )}
    >
      <div className={cn("flex h-16 items-center border-b", collapsed ? "justify-center px-2" : "gap-2 px-3")}>
        <BrandLogo
          priority
          className={cn("max-h-10", collapsed ? "max-w-[40px]" : "max-w-[188px]")}
        />
        {collapsed ? null : (
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto shrink-0"
            onClick={toggle}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose />
          </Button>
        )}
      </div>
      <div className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        <SidebarNav role={role} collapsed={collapsed} />
      </div>
      {collapsed ? (
        <div className="border-t p-2">
          <Button variant="ghost" size="icon" className="w-full" onClick={toggle} aria-label="Expand sidebar">
            <PanelLeft />
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
