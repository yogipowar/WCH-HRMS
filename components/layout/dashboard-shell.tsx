"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { EmployeeMobileTabBar } from "@/components/layout/employee-mobile-tab-bar";
import { MANAGEMENT_ONLY_PREFIXES } from "@/lib/constants";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const restore = useAuthStore((state) => state.restore);
  const logout = useAuthStore((state) => state.logout);
  const dataReady = useDataStore((state) => state.ready);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }
    if (!user) {
      router.replace("/login");
      return;
    }
    if (dataReady) {
      setReady(true);
    }
    const restricted = MANAGEMENT_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (user.role === "EMPLOYEE" && restricted) {
      router.replace("/dashboard");
    }
  }, [dataReady, pathname, router, status, user]);

  if (!ready || !user) {
    return <div className="min-h-screen bg-background" />;
  }

  const restricted = user.role === "EMPLOYEE" && MANAGEMENT_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (restricted) {
    return <div className="min-h-screen bg-background" />;
  }

  const isEmployee = user.role === "EMPLOYEE";

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader user={user} onLogout={logout} />
        <main className={`flex-1 overflow-x-hidden px-4 py-5 sm:px-6 lg:px-7 ${isEmployee ? "pb-24 lg:pb-6" : ""}`}>
          {children}
        </main>
      </div>
      {isEmployee ? <EmployeeMobileTabBar /> : null}
    </div>
  );
}
