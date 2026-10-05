"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { TaskPage } from "@/components/projects/task-page";
import { isEmployeeOnProject } from "@/lib/services/projectService";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";

export default function Page({ params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id, taskId } = use(params);
  const user = useAuthStore((state) => state.user);
  const project = useDataStore((state) => state.projects?.find((item) => item.id === id));
  const task = useDataStore((state) => state.projectTasks?.find((item) => item.id === taskId && item.projectId === id));

  if (!project || !task) {
    notFound();
  }

  const allowed = user?.role === "MANAGEMENT" || isEmployeeOnProject(project, user?.employeeId);
  if (!allowed) {
    notFound();
  }

  return <TaskPage project={project} taskId={taskId} />;
}
