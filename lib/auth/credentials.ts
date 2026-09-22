import { getData } from "@/lib/stores/data-store";
import type { User } from "@/types";

export interface DemoCredential {
  username: string;
  password: string;
  userId: string;
  label: string;
}

export const DEMO_CREDENTIALS: DemoCredential[] = [
  {
    username: "admin",
    password: "Admin@123",
    userId: "user-admin",
    label: "Management / Admin",
  },
  {
    username: "yogesh",
    password: "Yogesh@123",
    userId: "user-001",
    label: "Employee",
  },
];

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isUsernameTaken(username: string, excludeUserId?: string): boolean {
  const normalized = normalizeUsername(username);
  return getData().users.some((user) => {
    if (excludeUserId && user.id === excludeUserId) return false;
    return normalizeUsername(user.username) === normalized || normalizeUsername(user.email) === normalized;
  });
}

export function authenticate(username: string, password: string): User | null {
  const normalizedUsername = normalizeUsername(username);
  const data = getData();
  const account = data.users.find((user) => {
    const matchesUsername = normalizeUsername(user.username) === normalizedUsername;
    const matchesEmail = normalizeUsername(user.email) === normalizedUsername;
    return (matchesUsername || matchesEmail) && user.password === password;
  });

  if (!account) {
    return null;
  }

  if (account.employeeId) {
    const employee = data.employees.find((item) => item.id === account.employeeId);
    if (employee?.status === "INACTIVE") {
      return null;
    }
  }

  return account;
}
