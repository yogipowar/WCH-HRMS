"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS } from "@/components/layout/nav-config";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { navigationForRole, type AppNavItem } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

interface SidebarNavProps {
  role: UserRole;
  onNavigate?: () => void;
  collapsed?: boolean;
}

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupNav(items: AppNavItem[]) {
  const groups: { section: string | null; items: AppNavItem[] }[] = [];
  for (const item of items) {
    const section = item.section ?? null;
    const last = groups[groups.length - 1];
    if (last && last.section === section) {
      last.items.push(item);
    } else {
      groups.push({ section, items: [item] });
    }
  }
  return groups;
}

export function SidebarNav({ role, onNavigate, collapsed = false }: SidebarNavProps) {
  const pathname = usePathname();
  const groups = groupNav(navigationForRole(role));

  return (
    <nav className="space-y-5" aria-label="Primary">
      {groups.map((group) => (
        <div key={group.section ?? group.items[0]?.href} className="space-y-1">
          {group.section && !collapsed ? (
            <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              {group.section}
            </p>
          ) : null}
          {group.items.map((item) => {
            const Icon = NAV_ICONS[item.icon];
            const active = isActivePath(pathname, item.href);
            const className = cn(
              "flex items-center rounded-lg text-sm transition-colors",
              collapsed ? "justify-center px-0 py-2" : "gap-2 px-3 py-2",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            );

            if (!collapsed) {
              return (
                <Link key={item.href} href={item.href} onClick={onNavigate} className={className}>
                  {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
                  {item.title}
                </Link>
              );
            }

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger
                  delay={0}
                  render={<Link href={item.href} onClick={onNavigate} className={className} aria-label={item.title} />}
                >
                  {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
                </TooltipTrigger>
                <TooltipContent side="right">{item.title}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
