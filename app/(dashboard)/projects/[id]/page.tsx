"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { ProjectBoard } from "@/components/projects/project-board";
import { isEmployeeOnProject } from "@/lib/services/projectService";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const user = useAuthStore((state) => state.user);
  const project = useDataStore((state) => state.projects?.find((item) => item.id === id));

  if (!project) {
    notFound();
  }

  const allowed = user?.role === "MANAGEMENT" || isEmployeeOnProject(project, user?.employeeId);
  if (!allowed) {
    notFound();
  }

  return <ProjectBoard project={project} />;
}
