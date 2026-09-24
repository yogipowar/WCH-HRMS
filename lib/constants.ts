import type { UserRole } from "@/types";

export const APP_NAME = "HRMS";
export const COMPANY_NAME = "Web Create Hub";
export const COMPANY_TAGLINE = "Digital Solutions";
export const APP_SUBTITLE = "Employee & Workforce Management";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const LOGO_PATH = `${BASE_PATH}/logo/web-create-hub.png`;
export const FAVICON_PATH = `${BASE_PATH}/logo/Favicon.png`;

export const STORAGE_KEYS = {
  auth: "wch-hrms.auth",
  data: "wch-hrms.data",
  settings: "wch-hrms.settings",
  sidebar: "wch-hrms.sidebar",
  colorTheme: "wch-hrms.color-theme",
} as const;

export interface AppNavItem {
  title: string;
  href: string;
  icon: string;
  section?: string;
}

export const MANAGEMENT_NAV: AppNavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", section: "Overview" },
  { title: "Employees", href: "/employees", icon: "Users", section: "People" },
  { title: "Departments", href: "/departments", icon: "Building2", section: "People" },
  { title: "Designations", href: "/designations", icon: "Briefcase", section: "People" },
  { title: "Attendance", href: "/attendance", icon: "Clock3", section: "Time" },
  { title: "Leave", href: "/leave", icon: "CalendarDays", section: "Time" },
  { title: "Holidays", href: "/holidays", icon: "Palmtree", section: "Time" },
  { title: "Reports", href: "/reports", icon: "BarChart3", section: "Insights" },
  { title: "Payroll", href: "/payroll", icon: "Wallet", section: "Administration" },
  { title: "Announcements", href: "/announcements", icon: "Megaphone", section: "Administration" },
  { title: "Documents", href: "/documents", icon: "FileText", section: "Administration" },
  { title: "Notifications", href: "/notifications", icon: "Bell", section: "Administration" },
  { title: "Settings", href: "/settings", icon: "Settings", section: "Administration" },
];

export const EMPLOYEE_NAV: AppNavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { title: "My Attendance", href: "/attendance", icon: "Clock3" },
  { title: "My Leaves", href: "/leave", icon: "CalendarDays" },
  { title: "Holidays", href: "/holidays", icon: "Palmtree" },
  { title: "Documents", href: "/documents", icon: "FileText" },
  { title: "Notifications", href: "/notifications", icon: "Bell" },
  { title: "My Profile", href: "/profile", icon: "UserRound" },
];

export const EMPLOYEE_MOBILE_TAB_NAV: AppNavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { title: "Attendance", href: "/attendance", icon: "Clock3" },
  { title: "Leaves", href: "/leave", icon: "CalendarDays" },
  { title: "Documents", href: "/documents", icon: "FileText" },
];

export const MANAGEMENT_ONLY_PREFIXES = [
  "/employees",
  "/departments",
  "/designations",
  "/reports",
  "/announcements",
  "/settings",
] as const;

export function navigationForRole(role: UserRole) {
  return role === "MANAGEMENT" ? MANAGEMENT_NAV : EMPLOYEE_NAV;
}
