import type { AppData } from "@/data/mock-data";
import type { User } from "@/types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

let memoryToken: string | null = null;

export function setApiToken(token: string | null) {
  memoryToken = token;
}

export function getApiToken() {
  return memoryToken;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (memoryToken) {
    headers.set("Authorization", `Bearer ${memoryToken}`);
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.error || "Request failed", response.status);
  }
  return payload as T;
}

export const api = {
  login(username: string, password: string, remember = false) {
    return request<{ user: User; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password, remember }),
    });
  },
  logout() {
    return request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
  },
  me() {
    return request<{ user: User }>("/api/auth/me");
  },
  bootstrap() {
    return request<AppData>("/api/bootstrap");
  },
  createEmployee(body: unknown) {
    return request("/api/employees", { method: "POST", body: JSON.stringify(body) });
  },
  updateEmployee(id: string, body: unknown) {
    return request(`/api/employees/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  },
  createDepartment(body: unknown) {
    return request("/api/departments", { method: "POST", body: JSON.stringify(body) });
  },
  updateDepartment(id: string, body: unknown) {
    return request(`/api/departments/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  },
  createDesignation(body: unknown) {
    return request("/api/designations", { method: "POST", body: JSON.stringify(body) });
  },
  updateDesignation(id: string, body: unknown) {
    return request(`/api/designations/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  },
  createHoliday(body: unknown) {
    return request("/api/holidays", { method: "POST", body: JSON.stringify(body) });
  },
  updateHoliday(id: string, body: unknown) {
    return request(`/api/holidays/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  },
  deleteHoliday(id: string) {
    return request(`/api/holidays/${id}`, { method: "DELETE" });
  },
  createLeave(body: unknown) {
    return request("/api/leave", { method: "POST", body: JSON.stringify(body) });
  },
  updateLeaveStatus(id: string, body: unknown) {
    return request(`/api/leave/${id}/status`, { method: "PATCH", body: JSON.stringify(body) });
  },
  saveAttendance(body: unknown) {
    return request("/api/attendance", { method: "PUT", body: JSON.stringify(body) });
  },
  createAnnouncement(body: unknown) {
    return request("/api/announcements", { method: "POST", body: JSON.stringify(body) });
  },
  updateAnnouncement(id: string, body: unknown) {
    return request(`/api/announcements/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  },
  createDocument(body: unknown) {
    return request("/api/documents", { method: "POST", body: JSON.stringify(body) });
  },
  markNotificationRead(id: string) {
    return request(`/api/notifications/${id}`, { method: "PATCH" });
  },
  markAllNotificationsRead(userId: string) {
    return request("/api/notifications/read-all", { method: "POST", body: JSON.stringify({ userId }) });
  },
  updateSettings(body: unknown) {
    return request("/api/settings", { method: "PATCH", body: JSON.stringify(body) });
  },
};
