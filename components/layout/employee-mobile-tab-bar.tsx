"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS } from "@/components/layout/nav-config";
import { EMPLOYEE_MOBILE_TAB_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function EmployeeMobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Employee mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid h-16 grid-cols-4">
        {EMPLOYEE_MOBILE_TAB_NAV.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 px-1 text-[11px] leading-none",
                  active ? "font-semibold text-primary" : "text-muted-foreground",
                )}
              >
                {Icon ? <Icon className="size-5 shrink-0" aria-hidden /> : null}
                <span className="truncate">{item.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
