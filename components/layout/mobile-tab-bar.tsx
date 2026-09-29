"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { NAV_ICONS } from "@/components/layout/nav-config";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  EMPLOYEE_MOBILE_MORE_HREFS,
  EMPLOYEE_MOBILE_MORE_SECTIONS,
  EMPLOYEE_MOBILE_TAB_NAV,
  MANAGEMENT_MOBILE_MORE_HREFS,
  MANAGEMENT_MOBILE_MORE_SECTIONS,
  MANAGEMENT_MOBILE_TAB_NAV,
  type AppNavItem,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function mobileNavForRole(role: UserRole): {
  tabs: AppNavItem[];
  moreSections: { title: string; items: AppNavItem[] }[];
  moreHrefs: string[];
  moreDescription: string;
  ariaLabel: string;
} {
  if (role === "MANAGEMENT") {
    return {
      tabs: MANAGEMENT_MOBILE_TAB_NAV,
      moreSections: MANAGEMENT_MOBILE_MORE_SECTIONS,
      moreHrefs: MANAGEMENT_MOBILE_MORE_HREFS,
      moreDescription: "People, reports, payroll, and settings",
      ariaLabel: "Admin mobile",
    };
  }
  return {
    tabs: EMPLOYEE_MOBILE_TAB_NAV,
    moreSections: EMPLOYEE_MOBILE_MORE_SECTIONS,
    moreHrefs: EMPLOYEE_MOBILE_MORE_HREFS,
    moreDescription: "Team, holidays, records, and account",
    ariaLabel: "Employee mobile",
  };
}

export function MobileTabBar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { tabs, moreSections, moreHrefs, moreDescription, ariaLabel } = mobileNavForRole(role);
  const moreActive = useMemo(
    () => moreHrefs.some((href) => isActivePath(pathname, href)),
    [moreHrefs, pathname],
  );

  return (
    <>
      <nav
        aria-label={ariaLabel}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid h-16 grid-cols-5">
          {tabs.map((item) => {
            const Icon = NAV_ICONS[item.icon];
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-1 px-1 text-[11px] leading-none transition-colors",
                    active ? "font-semibold text-primary" : "text-muted-foreground",
                  )}
                >
                  {Icon ? <Icon className="size-5 shrink-0" aria-hidden /> : null}
                  <span className="truncate">{item.title}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-label="Open more menu"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-[11px] leading-none transition-colors",
                moreActive || moreOpen ? "font-semibold text-primary" : "text-muted-foreground",
              )}
            >
              <LayoutGrid className="size-5 shrink-0" aria-hidden />
              <span className="truncate">More</span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] gap-0 rounded-t-2xl p-0 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex justify-center pt-3">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          <SheetHeader className="px-5 pb-2 pt-3 text-left">
            <SheetTitle>More</SheetTitle>
            <SheetDescription>{moreDescription}</SheetDescription>
          </SheetHeader>

          <div className="space-y-5 overflow-y-auto px-5 pb-4">
            {moreSections.map((section) => (
              <section key={section.title} className="space-y-2">
                <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  {section.title}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {section.items.map((item) => {
                    const Icon = NAV_ICONS[item.icon];
                    const active = isActivePath(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center transition-colors",
                          active
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border/70 bg-muted/30 text-foreground hover:bg-muted/60",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-10 items-center justify-center rounded-xl",
                            active ? "bg-primary/15" : "bg-background",
                          )}
                        >
                          {Icon ? <Icon className="size-5" aria-hidden /> : null}
                        </span>
                        <span className="text-[11px] leading-tight font-medium">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** @deprecated Use MobileTabBar with role instead */
export function EmployeeMobileTabBar() {
  return <MobileTabBar role="EMPLOYEE" />;
}
