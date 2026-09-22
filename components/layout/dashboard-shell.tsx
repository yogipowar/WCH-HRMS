"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MANAGEMENT_ONLY_PREFIXES } from "@/lib/constants";
import { useAuthStore } from "@/lib/stores/auth-store";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!user) {
      router.replace("/login");
      return;
    }
    const restricted = MANAGEMENT_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (user.role === "EMPLOYEE" && restricted) {
      router.replace("/dashboard");
    }
  }, [pathname, ready, router, user]);

  if (!ready || !user) {
    return <div className="min-h-screen bg-background" />;
  }

  const restricted = user.role === "EMPLOYEE" && MANAGEMENT_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (restricted) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader user={user} onLogout={logout} />
        <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
