import { api } from "@/lib/api/client";
import { createId } from "@/lib/lookups";
import { getData, updateData } from "@/lib/stores/data-store";
import type { Project } from "@/types";

export function isEmployeeOnProject(project: Project, employeeId: string | null | undefined) {
  if (!employeeId) return false;
  if (project.projectManagerId === employeeId) return true;
  return project.teamMemberIds.includes(employeeId);
}

export const projectService = {
  getProjects() {
    return getData().projects ?? [];
  },
  getProjectsForEmployee(employeeId: string) {
    return this.getProjects()
      .filter((item) => isEmployeeOnProject(item, employeeId))
      .sort((a, b) => a.serialNo - b.serialNo);
  },
  nextSerialNo() {
    const projects = this.getProjects();
    if (projects.length === 0) return 1;
    return Math.max(...projects.map((item) => item.serialNo)) + 1;
  },
  createProject(input: Omit<Project, "id" | "createdAt" | "updatedAt">) {
    const now = new Date().toISOString();
    const project: Project = {
      ...input,
      id: createId("proj"),
      createdAt: now,
      updatedAt: now,
    };
    updateData((data) => ({ projects: [...(data.projects ?? []), project] }));
    void api.createProject(project);
    return project;
  },
  updateProject(id: string, patch: Partial<Omit<Project, "id" | "createdAt">>) {
    const now = new Date().toISOString();
    updateData((data) => ({
      projects: (data.projects ?? []).map((item) =>
        item.id === id ? { ...item, ...patch, updatedAt: now } : item,
      ),
    }));
    const project = getData().projects?.find((item) => item.id === id);
    if (project) void api.updateProject(id, project);
  },
  deleteProject(id: string) {
    updateData((data) => ({
      projects: (data.projects ?? []).filter((item) => item.id !== id),
    }));
    void api.deleteProject(id);
  },
};
