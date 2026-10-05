"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { NewTaskPage } from "@/components/projects/task-page";
import { isEmployeeOnProject } from "@/lib/services/projectService";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";
import { TASK_STATUSES, type TaskStatus } from "@/types";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string | string[]; parent?: string | string[] }>;
}) {
  const { id } = use(params);
  const query = use(searchParams);
  const statusParam = Array.isArray(query.status) ? query.status[0] : query.status;
  const parentParam = Array.isArray(query.parent) ? query.parent[0] : query.parent;
  const user = useAuthStore((state) => state.user);
  const project = useDataStore((state) => state.projects?.find((item) => item.id === id));
  const parent = useDataStore((state) =>
    parentParam ? state.projectTasks?.find((item) => item.id === parentParam && item.projectId === id && !item.parentId) : null,
  );

  if (!project) {
    notFound();
  }
  if (parentParam && !parent) {
    notFound();
  }

  const allowed = user?.role === "MANAGEMENT" || isEmployeeOnProject(project, user?.employeeId);
  if (!allowed) {
    notFound();
  }

  const status = TASK_STATUSES.includes(statusParam as TaskStatus) ? (statusParam as TaskStatus) : "TODO";
  return <NewTaskPage project={project} status={status} parent={parent ?? null} />;
}
