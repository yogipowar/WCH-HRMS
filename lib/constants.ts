import type { UserRole } from "@/types";

export const APP_NAME = "HRMS";
export const COMPANY_NAME = "Web Create Hub";
export const COMPANY_TAGLINE = "Digital Solutions Agency";
export const APP_SUBTITLE = "Employee & Workforce Management";

export const AGENCY = {
  name: COMPANY_NAME,
  tagline: COMPANY_TAGLINE,
  description:
    "Web Create Hub designs and develops modern, scalable, user-friendly platforms that combine creativity, technology and strategy.",
  email: "info@webcreatehub.com",
  phone: "+91 90757 49397",
  hours: "Mon - Sat: 09:00 AM - 6:00 PM",
  address: "2nd Floor, Shobha Apartment, Backside of Naik Masale, Ruikar Colony, Kolhapur, 416005",
  website: "https://webcreatehub.com",
  city: "Kolhapur",
} as const;
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const LOGO_PATH = `${BASE_PATH}/logo/web-create-hub.png`;
export const FAVICON_PATH = `${BASE_PATH}/logo/Favicon.png`;

export const STORAGE_KEYS = {
  auth: "wch-hrms.auth",
  data: "wch-hrms.data",
  settings: "wch-hrms.settings",
  sidebar: "wch-hrms.sidebar",
  colorTheme: "wch-hrms.color-theme.v2",
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
  { title: "Projects", href: "/projects", icon: "FolderKanban", section: "Administration" },
  { title: "Announcements", href: "/announcements", icon: "Megaphone", section: "Administration" },
  { title: "Documents", href: "/documents", icon: "FileText", section: "Administration" },
  { title: "Notifications", href: "/notifications", icon: "Bell", section: "Administration" },
  { title: "Settings", href: "/settings", icon: "Settings", section: "Administration" },
];

export const EMPLOYEE_NAV: AppNavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { title: "Team", href: "/team", icon: "Users" },
  { title: "My Attendance", href: "/attendance", icon: "Clock3" },
  { title: "My Leaves", href: "/leave", icon: "CalendarDays" },
  { title: "Holidays", href: "/holidays", icon: "Palmtree" },
  { title: "My Projects", href: "/projects", icon: "FolderKanban" },
  { title: "Announcements", href: "/announcements", icon: "Megaphone" },
  { title: "Documents", href: "/documents", icon: "FileText" },
  { title: "Salary slips", href: "/payroll", icon: "Wallet" },
  { title: "Notifications", href: "/notifications", icon: "Bell" },
  { title: "My Profile", href: "/profile", icon: "UserRound" },
];

export const EMPLOYEE_MOBILE_TAB_NAV: AppNavItem[] = [
  { title: "Home", href: "/dashboard", icon: "LayoutDashboard" },
  { title: "Attendance", href: "/attendance", icon: "Clock3" },
  { title: "Leaves", href: "/leave", icon: "CalendarDays" },
  { title: "Projects", href: "/projects", icon: "FolderKanban" },
];

export const EMPLOYEE_MOBILE_MORE_SECTIONS: { title: string; items: AppNavItem[] }[] = [
  {
    title: "Workplace",
    items: [
      { title: "Team", href: "/team", icon: "Users" },
      { title: "Holidays", href: "/holidays", icon: "Palmtree" },
      { title: "Announcements", href: "/announcements", icon: "Megaphone" },
    ],
  },
  {
    title: "Records",
    items: [
      { title: "Documents", href: "/documents", icon: "FileText" },
      { title: "Salary slips", href: "/payroll", icon: "Wallet" },
    ],
  },
  {
    title: "Account",
    items: [
      { title: "Notifications", href: "/notifications", icon: "Bell" },
      { title: "My Profile", href: "/profile", icon: "UserRound" },
    ],
  },
];

export const EMPLOYEE_MOBILE_MORE_HREFS = EMPLOYEE_MOBILE_MORE_SECTIONS.flatMap((section) =>
  section.items.map((item) => item.href),
);

export const MANAGEMENT_MOBILE_TAB_NAV: AppNavItem[] = [
  { title: "Home", href: "/dashboard", icon: "LayoutDashboard" },
  { title: "Attendance", href: "/attendance", icon: "Clock3" },
  { title: "Leave", href: "/leave", icon: "CalendarDays" },
  { title: "Projects", href: "/projects", icon: "FolderKanban" },
];

export const MANAGEMENT_MOBILE_MORE_SECTIONS: { title: string; items: AppNavItem[] }[] = [
  {
    title: "People",
    items: [
      { title: "Employees", href: "/employees", icon: "Users" },
      { title: "Departments", href: "/departments", icon: "Building2" },
      { title: "Designations", href: "/designations", icon: "Briefcase" },
    ],
  },
  {
    title: "Time & insights",
    items: [
      { title: "Holidays", href: "/holidays", icon: "Palmtree" },
      { title: "Reports", href: "/reports", icon: "BarChart3" },
    ],
  },
  {
    title: "Administration",
    items: [
      { title: "Payroll", href: "/payroll", icon: "Wallet" },
      { title: "Announcements", href: "/announcements", icon: "Megaphone" },
      { title: "Documents", href: "/documents", icon: "FileText" },
      { title: "Notifications", href: "/notifications", icon: "Bell" },
      { title: "Settings", href: "/settings", icon: "Settings" },
    ],
  },
];

export const MANAGEMENT_MOBILE_MORE_HREFS = MANAGEMENT_MOBILE_MORE_SECTIONS.flatMap((section) =>
  section.items.map((item) => item.href),
);

export const MANAGEMENT_ONLY_PREFIXES = [
  "/employees",
  "/departments",
  "/designations",
  "/reports",
  "/settings",
] as const;

export function navigationForRole(role: UserRole) {
  return role === "MANAGEMENT" ? MANAGEMENT_NAV : EMPLOYEE_NAV;
}
